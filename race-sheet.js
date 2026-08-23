/* ═══════════════════════════════════════════════════════════════════════════
   race-sheet.js — one office, the whole field, ranked by voting pattern
   ────────────────────────────────────────────────────────────────────────────
   THE GAP THIS CLOSES
   ───────────────────
   A voter could already find their representatives, open any one of them, and
   read a deep record. What they could not do is the thing a ballot actually
   asks of them: look at ONE seat, see EVERY candidate for it side by side, and
   order that field by how the formal record lines up with what they believe.
   The comparison existed one profile at a time, which is the same as not
   existing — nobody holds six percentages in their head.

   THREE RULERS, NEVER COLLAPSED
   ─────────────────────────────
   The sheet shows three different measurements and refuses to blend them:

     Your Match · record   YOUR positions  vs  THEIR formal record   ← ranks
     Your Match · stated   YOUR positions  vs  THEIR stated positions
     Direction Match       THEIR words     vs  THEIR own record      ← never ranks

   The first two answer "how close are they to me". The third answers "did they
   keep their own word" — a question about them alone, with the voter nowhere in
   it. It is displayed because a candidate who matches you and breaks their word
   is a different proposition from one who matches you and keeps it, and it is
   never the sort key because ranking a field by it would silently re-answer the
   question the voter asked.

   ONE MATCH BRAIN, NOT A THIRD SCORING SYSTEM
   ───────────────────────────────────────────
   Nothing here computes a match. Both Your Match rulers are
   _calcAlignmentScore(pid, {mode}) / _calcAlignmentBreakdown(pid, {mode}) from
   alignment-tool.js — the shipped engine, the shipped 90/55/12 verdict ladder,
   the shipped intensity model, the shipped My Stances priority weight, and the
   shipped fail-closed rule that drops an issue neither lane can answer. The
   Direction Match chip is window._pdxLedgerSlot from compare-hub.js, which owns
   the publishable floor and returns pct:null on every branch that has no live
   figure. The field is window._ballotCandidates from ballot-breakdown.js. The
   team write is window.ballotPickCard, the same call the Key Races cards make.

   If a number on this sheet is wrong, it is wrong everywhere, which is the
   property we wanted. A sheet with its own arithmetic would be a fourth ruler
   wearing the clothes of the first three.

   WHY RECORD IS THE DEFAULT *HERE* AND STATED IS THE DEFAULT EVERYWHERE ELSE
   ─────────────────────────────────────────────────────────────────────────
   The Alignment Tool defaults to stated because it ranks the whole database,
   most of which is candidates and local officials whose entire record is a
   platform — record mode would return "no pattern" for the majority and read as
   a broken feature. A race sheet is the opposite population: the field for a
   seat almost always contains the incumbent, the one person in it with years of
   roll calls. So this surface flips the default and says so on screen.

   It flips it LOCALLY. _rsMode lives in this file and is passed to the engine as
   an explicit opts.mode; window.alignSetMatchMode is never called, so opening a
   race sheet cannot change what the browse grid, the Key Races cards or the
   compare table are showing behind it. Session-scoped (sessionStorage) because
   the choice is about the errand the voter is on, not a standing preference —
   the standing preference is the Alignment Tool's own localStorage key and this
   file neither reads nor writes it.

   WHAT IS NEVER DONE HERE
   ───────────────────────
   • No party is read, printed, grouped, sorted or scored. A candidate's party
     letter does not appear on this surface at all.
   • No formal and public figure is ever added, averaged or blended. Only the
     formal lane feeds record match; the public lane is not consulted.
   • No percentage is invented. A candidate the active lane cannot answer for is
     moved to a named band with the reason, never given a placeholder number and
     never quietly scored from the other lane.
   • No taxonomy key is created. The issue axis is the voter's own _alignIssues
     set, labelled from ISSUE_MAP and coloured from PDXIssueColors.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var OVERLAY_ID = 'pdx-racesheet-overlay';
  var MODE_KEY = 'politidex_racesheet_mode';

  // DEFAULT: record. See the header — this is the one surface whose population
  // is dominated by people with roll calls, so the formal lane is the question
  // worth asking first. Anything else stored fails to it, the same way the
  // Alignment Tool's own reader fails an unknown value to ITS default.
  var DEFAULT_MODE = 'record';

  // How many issues the axis shows before the "more issues" expander. Six is the
  // most a phone can stack without the candidate header scrolling out of reach;
  // the rest are one tap away and nothing is dropped.
  var AXIS_SHOWN = 6;

  // The number of positions the empty-state CTA asks for. Not a floor on this
  // sheet — a voter with one stance still gets a real, honestly-thin ranking,
  // exactly as the Alignment Tool would give them. It is the same 3 the
  // consistency layer uses for _SO_MIN_ISSUES: below it a "pattern" is an
  // anecdote, so it is what we ask for rather than what we require.
  var ASK_ISSUES = 3;

  // Seat vocabulary is three-way split across the app: pdxRepsForMe() emits
  // ussenate1/ussenate2/house/governor/statesenate/statehouse, _pdxVoterBallot()
  // emits representative/state_senator/state_rep, and _ballotCandidates() speaks
  // the TEAM_POSITIONS keys. This maps every dialect onto the last one, because
  // that is the one that can enumerate a field.
  var SEAT_ALIAS = {
    ussenate1: 'senate', ussenate2: 'senate', ussenate: 'senate', senate: 'senate',
    house: 'house', representative: 'house',
    governor: 'governor', president: 'president',
    statesenate: 'statesenate', state_senator: 'statesenate',
    statehouse: 'statehouse', state_rep: 'statehouse',
    local: 'local'
  };

  // Only used when TEAM_POSITIONS has not loaded. Same labels, same colours.
  var SEAT_FALLBACK = {
    president:   { label: 'President',       icon: '\u{1F3DB}', color: '#f0abfc' },
    senate:      { label: 'U.S. Senate',     icon: '\u{1F3DB}', color: '#818cf8' },
    house:       { label: 'U.S. House',      icon: '\u{1F3DB}', color: '#60a5fa' },
    governor:    { label: 'Governor',        icon: '\u{1F985}', color: '#34d399' },
    statesenate: { label: 'State Senate',    icon: '\u{1F3DB}', color: '#a78bfa' },
    statehouse:  { label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf' },
    local:       { label: 'Local Office',    icon: '\u{1F3D9}', color: '#fbbf24' }
  };

  // ── The two ruler names, written once ──────────────────────────────────────
  // Every label, aria-label, tooltip and explainer on this sheet is built from
  // these, so the toggle cannot say one thing and the band header another.
  var MODES = {
    record: {
      key: 'record', ico: '\u{1F3DB}',
      label: 'Your Match · record',
      tab: 'Record',
      sub: 'Their votes and formal actions vs the positions you set.',
      rankLine: 'Ranked by their <b>formal record</b> on the issues you set — not by party, and not by Direction Match.',
      gap: 'No formal record on your issues yet'
    },
    stated: {
      key: 'stated', ico: '\u{1F4AC}',
      label: 'Your Match · stated',
      tab: 'Stated',
      sub: 'What they have said vs the positions you set.',
      rankLine: 'Ranked by their <b>stated positions</b> on the issues you set — not by party, and not by Direction Match.',
      gap: 'No stated position on your issues yet'
    }
  };

  // Said once per sheet, under the toggle. The whole point of showing three
  // rulers is lost if the reader cannot tell which is which.
  var EXPLAINER =
    '<b>Record match</b> = their votes/actions vs your positions. ' +
    '<b>Direction Match</b> = whether they kept their own word.';

  var _state = null;   // { seatKey, expanded } while the sheet is open

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function fn(n) { try { return typeof window[n] === 'function' ? window[n] : null; } catch (e) { return null; } }

  // ── Mode ───────────────────────────────────────────────────────────────────
  function readMode() {
    try {
      var v = window.sessionStorage && window.sessionStorage.getItem(MODE_KEY);
      if (v === 'record' || v === 'stated') return v;
    } catch (e) {}
    return DEFAULT_MODE;
  }
  function writeMode(m) {
    var next = (m === 'stated') ? 'stated' : 'record';
    try { if (window.sessionStorage) window.sessionStorage.setItem(MODE_KEY, next); } catch (e) {}
    return next;
  }
  function meta(m) { return MODES[(m === 'stated') ? 'stated' : 'record']; }

  // ── Seat ───────────────────────────────────────────────────────────────────
  function seatMeta(seatKey) {
    var rk = SEAT_ALIAS[String(seatKey || '').toLowerCase()];
    if (!rk) return null;
    var m = null;
    try {
      (window.TEAM_POSITIONS || []).forEach(function (p) { if (p && p.key === rk) m = p; });
    } catch (e) {}
    var fb = SEAT_FALLBACK[rk] || { label: rk, icon: '\u{1F3DB}', color: '#9fb4d4' };
    return {
      key: rk,
      label: (m && m.label) || fb.label,
      icon: (m && m.icon) || fb.icon,
      color: (m && m.color) || fb.color
    };
  }

  // Which pids currently hold this seat. Read from the two resolvers that
  // already answer it — never inferred from a title string — so "incumbent" on
  // this sheet means the same person the Voter Hub and the homepage front door
  // named. Used for the incumbent tag and as the stable tie-break, never as a
  // rank bonus.
  function incumbents(rk) {
    var out = {};
    try {
      var reps = fn('pdxRepsForMe') ? window.pdxRepsForMe() : null;
      if (reps && reps.levels) reps.levels.forEach(function (lv) {
        if (lv && lv.pid && SEAT_ALIAS[lv.key] === rk) out[lv.pid] = 1;
      });
    } catch (e) {}
    try {
      var vb = fn('_pdxVoterBallot') ? window._pdxVoterBallot() : null;
      if (vb && vb.byOffice) Object.keys(vb.byOffice).forEach(function (gk) {
        var s = vb.byOffice[gk];
        if (s && s.incumbentPid && SEAT_ALIAS[gk] === rk) out[s.incumbentPid] = 1;
      });
    } catch (e) {}
    return out;
  }

  // The field for one seat: every candidate the product already knows for it.
  // _ballotCandidates() owns that question (state matching, district matching,
  // the curated incumbent+challenger roster) and returns the list already sorted
  // by Direction Match. That order is discarded here on purpose — DM must not
  // decide what a voter reads first on a sheet that is not ranked by it.
  // The roster for a seat, as the ballot builder already resolves it from the
  // voter's districts. Two things about what comes back are deliberately thrown
  // away: _ballotCandidates hands us the field ALREADY SORTED BY DIRECTION MATCH
  // and each row carries that figure as `.score`. This sheet discards both. The
  // order is re-decided by rank() from the visitor's own match, and the DM figure
  // is re-read through the ledger slot that owns the publishable floor — so a
  // number that never cleared that floor cannot leak in here as a rank.
  function field(rk) {
    var raw = [];
    try { if (fn('_ballotCandidates')) raw = window._ballotCandidates(rk) || []; } catch (e) { raw = []; }
    var inc = incumbents(rk), seen = {}, out = [];
    raw.forEach(function (c) {
      if (!c || !c.pid || seen[c.pid]) return;
      seen[c.pid] = 1;
      var d = fn('_pdxBallotRecord') ? window._pdxBallotRecord(c.pid) : null;
      if (!d) { try { d = window.CMP_DATA ? window.CMP_DATA[c.pid] : null; } catch (e) {} }
      out.push({ pid: c.pid, name: c.name || (d && d.name) || c.pid, d: d,
                 office: c.office || (d && d.office) || '', icon: c.icon || (d && d.icon) || '\u{1F3DB}',
                 incumbent: !!inc[c.pid] });
    });
    return out;
  }

  // The order a field sits in when nothing is ranking it: officeholder first
  // (they are the one with the record the voter is being asked to judge), then
  // alphabetical. Deterministic, and deliberately not Direction Match.
  function stableSort(list) {
    return list.slice().sort(function (a, b) {
      if (a.incumbent !== b.incumbent) return a.incumbent ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  // ── Issue axis ─────────────────────────────────────────────────────────────
  // The voter's own set, starred first. "Starred" is My Stances' High priority,
  // read through the SAME hook the match engine weights with
  // (window._msPriorityWeight) rather than a second read of the store — so the
  // issue pinned to the top of the axis is exactly the issue pulling hardest on
  // the number beside it. A stance set in the Alignment Tool alone has no
  // priority record and weighs 1, landing it in the middle tier.
  function axis() {
    var keys = [];
    try {
      var s = window._alignIssues;
      if (s && typeof s.forEach === 'function') s.forEach(function (k) { keys.push(k); });
    } catch (e) {}
    var W = fn('_msPriorityWeight');
    var wOf = function (k) { try { var w = W ? W(k) : 1; return (typeof w === 'number' && isFinite(w) && w > 0) ? w : 1; } catch (e) { return 1; } };
    var IM = window.ISSUE_MAP || {};
    return keys
      .map(function (k, i) {
        return { key: k, label: (IM[k] && IM[k].label) || k, weight: wOf(k), starred: wOf(k) > 1, i: i };
      })
      .filter(function (r) { return !!IM[r.key]; })
      // Stable: heavier first, insertion order within a tier.
      .sort(function (a, b) { return (b.weight - a.weight) || (a.i - b.i); });
  }

  function issueStyle(key) {
    try {
      if (window.PDXIssueColors && typeof window.PDXIssueColors.styleFor === 'function') {
        return window.PDXIssueColors.styleFor(key, window.coreIssueForKey);
      }
    } catch (e) {}
    return '';
  }

  // ── Reads from the one match brain ─────────────────────────────────────────
  function scoreOf(pid, mode) {
    try {
      var f = fn('_calcAlignmentScore');
      if (!f) return null;
      var v = f(pid, { mode: mode });
      return (typeof v === 'number' && isFinite(v)) ? v : null;
    } catch (e) { return null; }
  }
  function bdOf(pid, mode) {
    try {
      var f = fn('_calcAlignmentBreakdown');
      return f ? (f(pid, { mode: mode }) || null) : null;
    } catch (e) { return null; }
  }

  // Record mode reads vote packs the stated lane never fetched. The alignment
  // tool owns the batched, debounced warmer (one /compare per 24 members); this
  // hands it the field and lets its own settle path call us back through
  // window._pdxRaceSheetRefresh. No new request path.
  function warmField(list) {
    var q = fn('_alignQueueConsistWarm');
    if (!q) return;
    list.slice(0, 24).forEach(function (c) { try { q(c.pid); } catch (e) {} });
  }

  // ── Direction Match chip ───────────────────────────────────────────────────
  // The profile's own vocabulary, via the slot that owns the publishable floor.
  // Labelled "Direction Match" and subtitled with the question it answers, so it
  // cannot be misread as a match to the reader. Never sortable on this sheet.
  function dmChip(c) {
    var slot = null;
    try {
      var st = fn('_pdxOfficeStatus') ? window._pdxOfficeStatus(c.d) : 'office';
      if (fn('_pdxLedgerSlot')) slot = window._pdxLedgerSlot(c.d, { pid: c.pid, status: st });
    } catch (e) {}
    if (!slot) return '';
    var num = (typeof slot.pct === 'number')
      ? '<b class="rs-dm-pct">' + slot.pct + '%</b><span class="rs-dm-n"> of ' + (slot.tested || 0) + ' tested</span>'
      : '';
    return '<div class="rs-dm" data-rs-dm="' + esc(slot.state) + '"' +
        ' title="Direction Match asks whether this person kept their OWN word — their stated positions against their own formal record. It is not a match to you, and it does not order this list.">' +
        '<span class="rs-dm-k" aria-hidden="true">⚖️</span>' +
        '<span class="rs-dm-body">' +
          '<span class="rs-dm-label">Direction Match <span class="rs-dm-hint">· did they keep their own word</span></span>' +
          '<span class="rs-dm-val">' + esc(slot.sub || '') + (num ? ' · ' + num : '') + '</span>' +
        '</span>' +
      '</div>';
  }

  // ── One candidate × one issue ──────────────────────────────────────────────
  // Both lanes are reported in every cell, whichever mode is live: the stated
  // chip when a documented position exists, the record chip when the formal lane
  // reads a pattern. The ACTIVE lane's chip leads and carries the verdict tint;
  // the other rides behind it, greyed, as context. A lane with nothing to say
  // prints its silence in words. There is no branch here that produces a number.
  function cell(key, sRow, rRow, mode) {
    var lead = (mode === 'record') ? rRow : sRow;
    var other = (mode === 'record') ? sRow : rRow;
    var chip = fn('_alignSignalChipHtml');
    var leadHtml = (lead && chip) ? chip(lead) : '';
    var otherHtml = (other && chip) ? chip(other) : '';
    var v = lead ? (lead.verdict || '') : '';
    if (!leadHtml) {
      leadHtml = '<span class="rs-cell-none">' +
        ((mode === 'record') ? 'No readable vote pattern' : 'No documented position') +
        '</span>';
    }
    return '<div class="rs-cell" data-rs-v="' + esc(v || 'none') + '">' +
      '<span class="rs-cell-lead">' + leadHtml + '</span>' +
      (otherHtml ? '<span class="rs-cell-other">' + otherHtml + '</span>' : '') +
    '</div>';
  }

  // ── Team control ───────────────────────────────────────────────────────────
  // One pick per office is the ballot store's own rule (selections[raceKey] is a
  // single pid), so "add" and "replace" are the same call and the sheet does not
  // need a concept of its own. ballotPickCard also mirrors into the membership
  // store, which is what makes a pick made here show up as "On Team" everywhere.
  function pickedFor(rk) {
    try {
      var sel = fn('_ballotLoad') ? (window._ballotLoad() || {}) : {};
      if (sel[rk]) return sel[rk];
      // Local offices are stored per-seat as local_<raceKey>; a sheet opened on
      // the generic 'local' key should still see a pick made in one of them.
      if (rk === 'local') {
        var hit = null;
        Object.keys(sel).forEach(function (k) { if (!hit && k.indexOf('local') === 0) hit = sel[k]; });
        return hit;
      }
    } catch (e) {}
    return null;
  }
  function teamBtn(rk, c, picked, someoneElse) {
    var on = picked === c.pid;
    var lbl = on ? '✓ On my team'
      : (someoneElse ? 'Replace my pick' : '➕ Add to my team');
    var aria = on
      ? 'Remove ' + c.name + ' from My Voting Team'
      : (someoneElse ? 'Replace your ' + (seatMeta(rk) || {}).label + ' pick with ' + c.name
                     : 'Add ' + c.name + ' to My Voting Team');
    return '<button type="button" class="rs-team' + (on ? ' is-on' : '') + '"' +
      ' onclick="window.pdxRaceSheetPick(\'' + jsq(rk) + '\',\'' + jsq(c.pid) + '\')"' +
      ' aria-label="' + esc(aria) + '">' + esc(lbl) + '</button>';
  }

  // ── Ranking ────────────────────────────────────────────────────────────────
  // Two bands, and the second one is the honest half of this feature. A
  // candidate the active lane cannot score is NOT given a number, NOT given the
  // other lane's number, and NOT dropped: they sit below the ranked field under
  // a header that says exactly which lane came up empty.
  function rank(list, mode, hasIssues) {
    var ranked = [], gap = [];
    list.forEach(function (c) {
      c.score = hasIssues ? scoreOf(c.pid, mode) : null;
      c.altScore = hasIssues ? scoreOf(c.pid, mode === 'record' ? 'stated' : 'record') : null;
      (c.score === null ? gap : ranked).push(c);
    });
    if (!hasIssues) return { ranked: [], gap: stableSort(list), unranked: true };
    ranked.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.incumbent !== b.incumbent) return a.incumbent ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
    return { ranked: ranked, gap: stableSort(gap), unranked: false };
  }

  function scoreColor(s) {
    try { if (fn('_alignScoreColor')) return window._alignScoreColor(s); } catch (e) {}
    return s >= 70 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171';
  }

  // ── Candidate pane ─────────────────────────────────────────────────────────
  function pane(c, i, rows, mode, rk, picked, banded) {
    var mm = meta(mode);
    var photo = '';
    try { if (fn('_getPhotoUrl')) photo = window._getPhotoUrl(c.pid) || ''; } catch (e) {}
    var avatar = photo
      ? '<span class="rs-face"><img src="' + esc(photo) + '" alt="" loading="lazy" decoding="async"></span>'
      : '<span class="rs-face rs-face--empty" aria-hidden="true">' + c.icon + '</span>';

    var head;
    if (banded) {
      // Unranked band. The number slot carries a REASON, never a placeholder
      // percentage — and when the other lane can answer, its figure is shown
      // wearing that lane's own name so it cannot be read as this one's rank.
      var alt = (c.altScore !== null && c.altScore !== undefined)
        ? '<span class="rs-alt" title="' + esc(meta(mode === 'record' ? 'stated' : 'record').sub) +
            ' This is the other ruler, shown because this one has nothing to say. It does not rank this list.">' +
            meta(mode === 'record' ? 'stated' : 'record').ico + ' ' +
            esc(meta(mode === 'record' ? 'stated' : 'record').tab.toLowerCase()) + ' ' + c.altScore + '%</span>'
        : '';
      head = '<span class="rs-rank rs-rank--gap" aria-hidden="true">—</span>' +
        '<span class="rs-scorewrap"><span class="rs-gapword">' + esc(mm.gap) + '</span>' + alt + '</span>';
    } else {
      var col = scoreColor(c.score);
      head = '<span class="rs-rank">' + (i + 1) + '</span>' +
        '<span class="rs-scorewrap">' +
          '<span class="rs-score" style="color:' + col + ';">' + c.score + '<span class="rs-pct">%</span></span>' +
          '<span class="rs-scorelbl">' + esc(mm.label) + '</span>' +
          '<span class="rs-bar"><i style="width:' + c.score + '%;background:' + col + ';"></i></span>' +
        '</span>';
    }

    var sBd = bdOf(c.pid, 'stated'), rBd = bdOf(c.pid, 'record');
    var byKey = function (bd) {
      var m = {};
      if (bd && bd.issues) bd.issues.forEach(function (r) { m[r.key] = r; });
      return m;
    };
    var S = byKey(sBd), R = byKey(rBd);

    var cells = rows.map(function (r) {
      return '<div class="rs-issuecell" data-rs-issue="' + esc(r.key) + '" style="' + issueStyle(r.key) + '">' +
        '<span class="rs-issuecell-lbl" aria-hidden="true">' +
          (r.starred ? '<span class="rs-star">⭐</span>' : '') + esc(r.label) +
        '</span>' +
        cell(r.key, S[r.key], R[r.key], mode) +
      '</div>';
    }).join('');

    return '<article class="rs-pane' + (banded ? ' is-gap' : '') + '" data-align-pid="' + esc(c.pid) + '">' +
      '<header class="rs-panehd">' +
        head +
        '<span class="rs-who">' + avatar +
          '<span class="rs-whotext">' +
            '<button type="button" class="rs-name" onclick="if(window.showProfile)window.showProfile(\'' + jsq(c.pid) + '\')"' +
              ' aria-label="Open ' + esc(c.name) + '’s full record">' + esc(c.name) + '</button>' +
            (c.incumbent ? '<span class="rs-inc">Holds this seat now</span>' : '') +
          '</span>' +
        '</span>' +
        dmChip(c) +
        teamBtn(rk, c, picked, !!picked && picked !== c.pid) +
      '</header>' +
      '<div class="rs-cells">' + cells + '</div>' +
    '</article>';
  }

  // ── Toggle + explainer ─────────────────────────────────────────────────────
  function toggleHtml(mode) {
    var btn = function (m) {
      var mm = MODES[m], on = (m === mode);
      return '<button type="button" class="rs-mode' + (on ? ' is-on' : '') + '"' +
        ' role="tab" aria-selected="' + (on ? 'true' : 'false') + '"' +
        ' onclick="window.pdxRaceSheetMode(\'' + m + '\')"' +
        ' aria-label="' + esc(mm.label + ' — ' + mm.sub) + '">' +
        '<span aria-hidden="true">' + mm.ico + '</span> ' + esc(mm.label) +
      '</button>';
    };
    return '<div class="rs-modes" role="tablist" aria-label="Rank this field by">' +
        btn('record') + btn('stated') +
      '</div>';
  }

  // ── Empty / no-stance states ───────────────────────────────────────────────
  function ctaHtml() {
    var open = fn('_krAlignGuideToPicker') ? 'window._krAlignGuideToPicker()'
      : (fn('openAlignBoard') ? 'window.openAlignBoard()' : 'window.pdxRaceSheetClose()');
    return '<div class="rs-cta">' +
        '<p class="rs-cta-hd">\u{1F3AF} Set your positions and this field re-orders itself.</p>' +
        '<p class="rs-cta-sub">Pick at least <b>' + ASK_ISSUES + '</b> issues and say where you stand. ' +
          'The sheet will then rank these candidates by how their formal record lines up with you — ' +
          'until you do, it stays in a fixed order and no one here is scored.</p>' +
        '<button type="button" class="rs-cta-btn" onclick="' + open + '">Set my positions →</button>' +
      '</div>';
  }

  function thinAxisNote(n) {
    if (n >= ASK_ISSUES) return '';
    return '<p class="rs-thinaxis">This ranking rests on <b>' + n + ' issue' + (n === 1 ? '' : 's') +
      '</b>. Add a few more and the order gets a lot harder to move by accident.</p>';
  }

  // ── Paint ──────────────────────────────────────────────────────────────────
  function bodyHtml() {
    var sm = seatMeta(_state.seatKey);
    if (!sm) return '<div class="rs-empty">That seat is not one this sheet can compare yet.</div>';

    var mode = readMode(), mm = meta(mode);
    var all = field(sm.key);
    var rows = axis();
    var hasIssues = rows.length > 0;
    var shown = _state.expanded ? rows : rows.slice(0, AXIS_SHOWN);
    var rk = sm.key;
    var picked = pickedFor(rk);

    var head =
      '<div class="rs-hd" style="--rs-seat:' + sm.color + ';">' +
        '<div class="rs-hd-title">' +
          '<span class="rs-hd-ico" aria-hidden="true">' + sm.icon + '</span>' +
          '<span><span class="rs-hd-kicker">Compare the field</span>' +
          '<h2 class="rs-hd-seat">' + esc(sm.label) + '</h2></span>' +
        '</div>' +
        '<button type="button" class="rs-close" onclick="window.pdxRaceSheetClose()" aria-label="Close the race sheet">×</button>' +
      '</div>';

    // HONEST EMPTY STATES. A field of zero and a field of one are different
    // admissions and get different words: nobody on file for the seat, versus
    // only the officeholder on file. Neither is dressed up as a comparison.
    if (!all.length) {
      return head + '<div class="rs-empty">' +
        '<p><b>No candidates on file for this seat yet.</b></p>' +
        '<p>We add a field as filings are certified and sourced. Nothing is shown here rather than a guess at who is running.</p>' +
      '</div>';
    }

    var ranked = rank(all, mode, hasIssues);
    var only = (all.length === 1);

    // TWO TRACKS, NOT ONE. The ranked field and the band the active lane cannot
    // answer for are separate grids with the band's explanation between them as
    // a full-width block. One track with a spanning row inside it looks tidier in
    // the markup and falls apart on a horizontal grid, where "full width" has no
    // meaning; two tracks read correctly stacked on a phone and side-by-side on a
    // desktop without either layout needing to know the other exists.
    var track = function (list, banded) {
      if (!list.length) return '';
      return '<div class="rs-grid' + (banded ? ' rs-grid--gap' : '') + '" data-rs-cols="' + list.length + '">' +
        list.map(function (c, i) { return pane(c, i, shown, mode, rk, picked, banded); }).join('') +
      '</div>';
    };
    var bandHtml = ranked.gap.length && !ranked.unranked
      ? '<div class="rs-band">' +
          '<span class="rs-band-hd">' + esc(mm.gap) + '</span>' +
          '<span class="rs-band-sub">' +
            (mode === 'record'
              ? 'Their votes and formal actions do not read a direction on the issues you set, so there is no record match to give them. They are not ranked here and they are not scored from their words instead.'
              : 'They have no documented position on the issues you set, so there is no stated match to give them. They are not ranked here and they are not scored from their votes instead.') +
          '</span>' +
        '</div>'
      : '';
    var panes = ranked.unranked
      ? track(ranked.gap, true)
      : (track(ranked.ranked, false) + bandHtml + track(ranked.gap, true));

    var moreBtn = (rows.length > AXIS_SHOWN)
      ? '<button type="button" class="rs-more" onclick="window.pdxRaceSheetMore()" aria-expanded="' +
          (_state.expanded ? 'true' : 'false') + '">' +
          (_state.expanded ? 'Fewer issues' : 'More issues (' + (rows.length - AXIS_SHOWN) + ')') +
        '</button>'
      : '';

    // If the visitor has starred anything, say so on the rank line. Without it the
    // order looks like it is treating every issue the same, and the one control
    // that changes it lives on another page. Five words, and only when true.
    var starLine = rows.some(function (r) { return r.starred; })
      ? ' <span class="rs-rankstar">Weighted toward your starred issues.</span>'
      : '';

    var rankLine = hasIssues
      ? '<p class="rs-rankline">' + mm.rankLine + starLine + '</p>'
      : '<p class="rs-rankline">Nothing is ranking this field yet — it is in a fixed order: officeholder first, then alphabetical.</p>';

    return head +
      '<div class="rs-controls">' +
        toggleHtml(mode) +
        rankLine +
        '<p class="rs-explain">' + EXPLAINER + '</p>' +
        (hasIssues ? thinAxisNote(rows.length) : '') +
      '</div>' +
      (only
        ? '<p class="rs-onlyone">Only the officeholder is on file for this seat so far — there is no field to compare yet. Their record is below, and challengers appear here as filings are certified.</p>'
        : '') +
      (hasIssues ? '' : ctaHtml()) +
      panes +
      (moreBtn ? '<div class="rs-morewrap">' + moreBtn + '</div>' : '') +
      '<p class="rs-foot">Only the <b>formal</b> lane — roll-call votes and formal actions — feeds the record ruler. ' +
        'Public statements are never added into it. Party is not read, printed or ranked anywhere on this sheet.</p>';
  }

  function ensureOverlay() {
    var ov = document.getElementById(OVERLAY_ID);
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.className = 'rs-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Compare the field for this seat');
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    return ov;
  }

  function render() {
    if (!_state) return;
    var ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;
    ov.innerHTML = '<div class="rs-sheet">' + bodyHtml() + '</div>';
  }

  function open(seatKey) {
    var sm = seatMeta(seatKey);
    if (!sm) return;
    _state = { seatKey: sm.key, expanded: false };
    var ov = ensureOverlay();
    ov.style.display = 'flex';
    // Record mode needs vote packs the stated lane never fetched. Queue the
    // field before the first paint so the warmer's own settle path repaints us
    // with real patterns instead of a sheet full of "no pattern".
    warmField(field(sm.key));
    render();
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    try { requestAnimationFrame(function () { ov.classList.add('is-open'); }); } catch (e) { ov.classList.add('is-open'); }
  }

  function close() {
    var ov = document.getElementById(OVERLAY_ID);
    _state = null;
    if (!ov) return;
    ov.classList.remove('is-open');
    setTimeout(function () {
      ov.style.display = 'none';
      ov.innerHTML = '';
      // Same courtesy every other overlay in the app extends: only give the page
      // its scroll back if nothing else is holding it.
      var others = ['modal-overlay', 'accountability-overlay', 'compare-overlay', 'auth-overlay', 'kr-align-overlay'];
      var anyOpen = others.some(function (id) {
        var el = document.getElementById(id);
        return el && el.style.display && el.style.display !== 'none';
      });
      if (!anyOpen) { try { document.body.style.overflow = ''; } catch (e) {} }
    }, 180);
  }

  // ── Public surface ─────────────────────────────────────────────────────────
  window.pdxOpenRaceSheet = open;
  window.pdxRaceSheetClose = close;
  window.pdxRaceSheetMode = function (m) { writeMode(m); render(); return readMode(); };
  window.pdxRaceSheetMatchMode = readMode;
  window.pdxRaceSheetMore = function () { if (_state) { _state.expanded = !_state.expanded; render(); } };
  window.pdxRaceSheetPick = function (rk, pid) {
    try { if (fn('ballotPickCard')) window.ballotPickCard(rk, pid); } catch (e) {}
    render();
  };
  // Called by _alignRefreshAll (alignment-tool.js) whenever the visitor's issues,
  // stances or a freshly warmed vote pack change what these numbers are.
  window._pdxRaceSheetRefresh = function () { if (_state) render(); };

  // ── The one entry control every host renders ───────────────────────────────
  // Returns '' for a seat this sheet cannot compare, so a host can drop it in
  // unconditionally and never paint a button that leads nowhere.
  window.pdxRaceSheetEntry = function (seatKey, opts) {
    var sm = seatMeta(seatKey);
    if (!sm) return '';
    opts = opts || {};
    var cls = 'rs-entry' + (opts.compact ? ' rs-entry--compact' : '');
    return '<button type="button" class="' + cls + '"' +
      ' onclick="event.stopPropagation();window.pdxOpenRaceSheet(\'' + jsq(sm.key) + '\')"' +
      ' aria-label="Compare every candidate for ' + esc(sm.label) + ', ranked by how their formal record fits the positions you set">' +
      '<span class="rs-entry-ico" aria-hidden="true">⚖️</span>' +
      '<span class="rs-entry-txt">Compare field for this seat</span>' +
      '<span class="rs-entry-go" aria-hidden="true">›</span>' +
    '</button>';
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _state) close();
  });

  window.PDXRaceSheet = {
    open: open, close: close, entry: window.pdxRaceSheetEntry,
    mode: readMode, setMode: window.pdxRaceSheetMode,
    MODES: MODES, ASK_ISSUES: ASK_ISSUES, AXIS_SHOWN: AXIS_SHOWN,
    // Exposed for the harness and for any caller that wants the model without
    // the markup. Pure reads; nothing here writes.
    _field: field, _axis: axis, _rank: rank, _seat: seatMeta
  };

  // Hosts call pdxRaceSheetEntry() defensively (it returns '' when this file has
  // not loaded), which means any host that painted before this script ran shows
  // no entry button until something else repaints it. That is a real ordering
  // risk: ballot-breakdown.js and voter-hub-location.js are PLAIN SYNC scripts
  // and this one is deferred, so on a fast load they can finish a first paint
  // first. One repaint of each host, once, closes the window. Both calls are
  // idempotent full re-renders that already run on every location or pick change,
  // and neither can re-enter this file — the entry helper only builds a string.
  (function bootRepaint() {
    var done = false;
    function go() {
      if (done) return; done = true;
      try { if (typeof window._vhSyncDistrictStrip === 'function') window._vhSyncDistrictStrip(); } catch (e) {}
      try { if (typeof window._ballotRender === 'function') window._ballotRender(); } catch (e) {}
      try { if (window.PDXWhoRepresentsMe && typeof window.PDXWhoRepresentsMe.sync === 'function') window.PDXWhoRepresentsMe.sync(); } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  })();
})();
