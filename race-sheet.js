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

  // The number of positions the empty-state CTA asks for. It is the same 3 the
  // consistency layer uses for _SO_MIN_ISSUES: below it a "pattern" is an
  // anecdote, so it is what we ask for rather than what we require.
  //
  // IT IS AN ASK AND NOTHING ELSE. It does not gate the ranking, it does not
  // gate which tab opens, and it never has — a voter with one stance gets a
  // real, honestly-thin ranking, exactly as the Alignment Tool would give them.
  // The only three things that read this number are the CTA copy, the thin-axis
  // note that rides under a short ranking, and whether that CTA is still worth
  // showing. If it ever appears in a condition that decides whether the field is
  // ordered, that is the bug: the line between ranked and unranked is ZERO
  // positions versus one, not two versus three.
  var ASK_ISSUES = 3;

  // ── THE OVERVIEW, AND WHY THE SHEET NO LONGER OPENS ON A WALL ──────────────
  // Both Your Match rulers need the visitor's own positions, and a first-time
  // visitor has none. The sheet used to answer that by painting the whole field
  // under "No formal record on your issues yet" with every issue cell missing —
  // which is a true sentence about a question nobody asked, sitting where the
  // comparison should be. It read as a broken product and it taught the reader
  // nothing about the race.
  //
  // Overview is the answer that needs nothing from the reader: the formal-lane
  // integrity figures the profiles already publish, the seat and who holds it,
  // the issues this field actually has a record on, and a rules-based read of how
  // those files compare in DEPTH. Every one of those is a fact about the
  // candidates. None of them is a match to the reader, and this view never claims
  // to be one — the word "match" appears here only as Direction Match, which is
  // their word against their own record, with the reader nowhere in it.
  //
  // The ranking still waits for positions. That is the whole division of labour:
  // Overview shows the race, the two match tabs show the reader.
  var VIEW_KEY = 'politidex_racesheet_view';

  // How many issues the shared-topic snapshot shows. The rule that picks them is
  // in snapshot() and is public in every sense: it reads the candidates' formal
  // files, not the visitor's stance list, so two readers with opposite politics
  // open the same seat and see the same six rows.
  var SNAP_CAP = 6;

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
      gap: 'No formal record on your issues yet',
      // What a share is allowed to say about this ruler. Plain text, no markup,
      // no percentage, and it names WHOSE positions did the ranking — so a
      // reader who receives it cannot read it as their own match.
      share: 'ranked by formal record vs my positions'
    },
    stated: {
      key: 'stated', ico: '\u{1F4AC}',
      label: 'Your Match · stated',
      tab: 'Stated',
      sub: 'What they have said vs the positions you set.',
      rankLine: 'Ranked by their <b>stated positions</b> on the issues you set — not by party, and not by Direction Match.',
      gap: 'No stated position on your issues yet',
      share: 'ranked by stated positions'
    }
  };

  // The third tab. Deliberately NOT a third entry in MODES: MODES is the set of
  // rulers that can order this field, and Overview orders nothing. Keeping it out
  // of that table is what stops a later loop over MODES from handing the field a
  // sort key that does not exist.
  var OVERVIEW = {
    key: 'overview', ico: '\u{1F9ED}',
    label: 'Overview · public record',
    tab: 'Overview',
    sub: 'The formal record of this whole field, side by side. Nothing in it is a match to you.',
    line: 'This is the <b>public formal record</b> — Direction Match, tested depth, and the issues this field has a record on. ' +
      'It is not ranked and it is not agreement with you: your own match lives on the two tabs beside it.'
  };

  // WHAT THE UNSET STATE IS ALLOWED TO SAY. The old copy — "No formal record on
  // your issues yet" — is a true sentence about a candidate once the reader HAS
  // issues, and it still says exactly that in the band below a ranked field. As
  // the FIRST thing a visitor with no positions reads, it is the wrong subject:
  // it blames the candidate's file for the reader's empty stance list. This is
  // the reader-scoped version, and it is the only one the unset state prints.
  var UNSET = {
    hd: 'Set your positions to score how their formal record lines up with you.',
    sub: 'Until then, Overview is Direction Match + shared issues — not agreement with you.'
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

  // ── Which of the three tabs is live ────────────────────────────────────────
  // Two stored keys, on purpose. MODE_KEY is the RULER (record | stated) and is
  // what travels on a shared link, what pdxRaceSheetMatchMode() reports and what
  // the share composer names; it means the same thing it always did. VIEW_KEY is
  // which TAB the reader last chose, which is a different question the moment a
  // tab exists that is not a ruler. Folding Overview into MODE_KEY would have
  // made "the active ruler" answerable with a non-ruler.
  function readView() {
    try {
      var v = window.sessionStorage && window.sessionStorage.getItem(VIEW_KEY);
      if (v === 'overview' || v === 'record' || v === 'stated') return v;
    } catch (e) {}
    return '';
  }
  function writeView(v) {
    var next = (v === 'overview' || v === 'record' || v === 'stated') ? v : '';
    try { if (window.sessionStorage && next) window.sessionStorage.setItem(VIEW_KEY, next); } catch (e) {}
    return next;
  }
  // THE ONE LINE THAT DIVIDES THE TWO STATES, AND WHERE IT SITS
  // ──────────────────────────────────────────────────
  // It sits between zero positions and one. Not between two and three.
  //
  // Zero is a different KIND of state, not a thinner version of the same one.
  // With nothing set there is no ruler to apply, so a personal ranking is not
  // thin — it does not exist, and any order the sheet printed would be a claim
  // about the reader that the reader never made. That is what Overview is for.
  //
  // One position is thin, and thin is a real answer. The reader said something;
  // the formal files either line up with it or they do not; the sheet can say
  // which and can say how little it rests on. Withholding that until a third
  // stance arrives would be the product deciding a citizen's own stated view is
  // not yet worth acting on — and it would do it silently, by opening on a tab
  // that never mentions the positions they just set. A short ranking labelled as
  // short beats a hidden one every time, so the ask for three lives in the CTA
  // and in the thin-axis note, where an ask belongs, and never here.
  //
  // Chosen, the reader's choice stands — with one refusal: a match tab with ZERO
  // positions cannot rank anybody in either lane, and honouring it would re-paint
  // the exact wall Overview exists to remove. That case lands on Overview and
  // prints the gate note saying what would change it.
  function activeView() {
    var n = 0;
    try { n = axis().length; } catch (e) { n = 0; }
    var v = readView();
    if (!v) v = n ? readMode() : 'overview';
    if (v !== 'overview' && n === 0) return 'overview';
    return v;
  }

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
  // The one roster read. Two stores answer it and they are tried in the same
  // order everywhere, so "who is this pid" cannot mean two things on one sheet.
  function recOf(pid) {
    var d = null;
    if (!pid) return null;
    try { if (fn('_pdxBallotRecord')) d = window._pdxBallotRecord(pid); } catch (e) {}
    if (!d) { try { d = window.CMP_DATA ? window.CMP_DATA[pid] : null; } catch (e) {} }
    return d || null;
  }

  function field(rk, pins) {
    var raw = [];
    try { if (fn('_ballotCandidates')) raw = window._ballotCandidates(rk) || []; } catch (e) { raw = []; }
    var inc = incumbents(rk), seen = {}, out = [];
    raw.forEach(function (c) {
      if (!c || !c.pid || seen[c.pid]) return;
      seen[c.pid] = 1;
      var d = recOf(c.pid);
      out.push({ pid: c.pid, name: c.name || (d && d.name) || c.pid, d: d,
                 office: c.office || (d && d.office) || '', icon: c.icon || (d && d.icon) || '\u{1F3DB}',
                 incumbent: !!inc[c.pid] });
    });

    // PINNED CANDIDATES — the sender's field, carried by a shared link.
    // _ballotCandidates() resolves a field from the READER's districts, so a
    // House race shared across a state line otherwise opens the right office
    // and the wrong people. The ids in the link are added back on top of
    // whatever the reader's own ballot resolved, never instead of it: the
    // reader still sees their own field, plus the people the link was actually
    // about. A pinned id the roster cannot resolve is NOT quietly dropped —
    // bodyHtml counts it and says so, because a field silently one person short
    // is the failure this whole surface exists to refuse.
    (pins || []).forEach(function (pid) {
      if (!pid || seen[pid]) return;
      var d = recOf(pid);
      if (!d) return;
      seen[pid] = 1;
      out.push({ pid: pid, name: d.name || pid, d: d,
                 office: d.office || '', icon: d.icon || '\u{1F3DB}',
                 incumbent: !!inc[pid], pinned: true });
    });
    return out;
  }

  // Ids in a shared link that resolve against nothing we hold. Reported, per id.
  function missingPins(pins) {
    return (pins || []).filter(function (pid) { return pid && !recOf(pid); });
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
  function dmSlot(c) {
    try {
      var st = fn('_pdxOfficeStatus') ? window._pdxOfficeStatus(c.d) : 'office';
      if (fn('_pdxLedgerSlot')) return window._pdxLedgerSlot(c.d, { pid: c.pid, status: st }) || null;
    } catch (e) {}
    return null;
  }
  // The same slot, reduced to the three things a compact face prints. pct is null
  // on every branch the ledger has not published, and tested rides with it — so
  // there is no shape here where a figure arrives without its denominator.
  function dmFacts(c) {
    var s = dmSlot(c);
    if (!s) return { pct: null, tested: 0, sub: '' };
    return { pct: (typeof s.pct === 'number') ? s.pct : null, tested: s.tested || 0, sub: s.sub || '' };
  }
  function dmChip(c) {
    var slot = dmSlot(c);
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

  // ── THE SHARED TOPIC SNAPSHOT ──────────────────────────────────────────────
  // THE RULE THAT PICKS THESE ISSUES IS PUBLIC, AND IT IS THIS ONE.
  //
  //   1. For every candidate in the field, read the formal-pattern index
  //      (PDXConsistency.formalPatternIndex.rows) — the shipped list of issues a
  //      person has a readable formal pattern on OR formal items on file for. It
  //      already fails closed: an issue with no formal signal is not in it.
  //   2. Union those lists. An issue counts if ANY candidate in the field has a
  //      formal file on it, because an issue one of them has legislated on and
  //      the other has not is one of the more useful rows on this sheet.
  //   3. Keep the ones the field SHARES first: sort by how many candidates hold a
  //      file on the issue, then by total judged items, then by the site's own
  //      topic order as the tie-break. Cap at SNAP_CAP.
  //   4. Re-sort the survivors into the site's topic order for display, so the
  //      rows read in the same sequence as every other Big Picture surface.
  //
  // WHAT THE RULE DOES NOT READ: the visitor's stance list, their starred issues,
  // their location, any party, and any public-lane statement. Two readers who
  // disagree about everything open this seat and get the same rows in the same
  // order — which is the only way a "shared issues" table is worth printing.
  function labelOf(k) {
    var IM = window.ISSUE_MAP || {};
    return (IM[k] && IM[k].label) || k;
  }
  function fpiOf(pid) {
    var m = {};
    try {
      var C = window.PDXConsistency;
      if (C && C.formalPatternIndex && typeof C.formalPatternIndex.rows === 'function') {
        (C.formalPatternIndex.rows(pid) || []).forEach(function (r) { if (r && r.key) m[r.key] = r; });
      }
    } catch (e) {}
    return m;
  }
  // The row's own display slot — state, plain-language label, inventory depth and
  // the single-instrument marker. Read, never derived: this file computes no
  // depth, no tier and no percentage of its own.
  function recDisplay(fr) {
    try {
      var C = window.PDXConsistency;
      if (fr && fr.row && C && C.recordPattern && typeof C.recordPattern.display === 'function') {
        return C.recordPattern.display(fr.row) || null;
      }
    } catch (e) {}
    return null;
  }

  // THE AT-A-GLANCE, AND WHY IT NAMES NO WINNER. This compares FILES, not people:
  // how much judged formal evidence each candidate has on one issue. A deeper file
  // is more evidence, and more evidence is not a better politician — a reader who
  // wants that judgement has the dossier one tap away and their own positions two.
  // "Thin" is the pattern engine's own read (it declined to characterise the
  // issue), not a floor invented here.
  var GLANCE = {
    thin: {
      two: 'Both thin', many: 'All thin',
      why: 'Nobody in this field has enough judged formal items here for the record engine to read a pattern on this issue. A cell can still say what one item did — one item is not a pattern, and thin is not a tie.'
    },
    similar: {
      word: 'Similar depth',
      why: 'Every candidate here has a readable formal pattern on this issue and the judged files are close in size. It says how much evidence there is, not who is right.'
    },
    different: {
      word: 'Different depth',
      why: 'The formal files on this issue are not the same size — one candidate has a readable pattern the other does not, or holds several times as many judged items.'
    }
  };
  function glanceFor(cells) {
    var n = cells.length;
    var read = cells.filter(function (c) { return c.read; });
    if (!read.length) return { token: 'thin', word: (n === 2 ? GLANCE.thin.two : GLANCE.thin.many), why: GLANCE.thin.why };
    if (read.length < n) return { token: 'different', word: GLANCE.different.word, why: GLANCE.different.why };
    var hi = 0, lo = -1;
    read.forEach(function (c) {
      if (c.judged > hi) hi = c.judged;
      if (lo < 0 || c.judged < lo) lo = c.judged;
    });
    if (lo > 0 && hi <= lo * 2) return { token: 'similar', word: GLANCE.similar.word, why: GLANCE.similar.why };
    return { token: 'different', word: GLANCE.different.word, why: GLANCE.different.why };
  }

  function snapshot(all) {
    var per = (all || []).map(function (c) { return { pid: c.pid, name: c.name, rows: fpiOf(c.pid) }; });
    var IM = window.ISSUE_MAP || {};
    var tally = {};
    per.forEach(function (p) {
      Object.keys(p.rows).forEach(function (k) {
        if (!IM[k]) return;                       // shared taxonomy only; nothing is coined here
        var t = tally[k] || (tally[k] = { cover: 0, judged: 0 });
        t.cover++;
        t.judged += (p.rows[k].judged || 0);
      });
    });
    var keys = Object.keys(tally);
    if (!keys.length) return { rows: [], total: 0, shown: 0, dropped: 0, cap: SNAP_CAP };
    var tax = keys.slice();
    try {
      if (typeof window._pdxBigPictureKeys === 'function') {
        tax = window._pdxBigPictureKeys(keys, { labelFn: labelOf }) || keys;
      }
    } catch (e) { tax = keys; }
    var taxRank = {};
    tax.forEach(function (k, i) { taxRank[k] = i; });
    var rankOf = function (k) { return (typeof taxRank[k] === 'number') ? taxRank[k] : 999; };
    var picked = keys.slice().sort(function (a, b) {
      if (tally[b].cover !== tally[a].cover) return tally[b].cover - tally[a].cover;
      if (tally[b].judged !== tally[a].judged) return tally[b].judged - tally[a].judged;
      return rankOf(a) - rankOf(b);
    }).slice(0, SNAP_CAP);
    picked.sort(function (a, b) { return rankOf(a) - rankOf(b); });

    var rows = picked.map(function (k) {
      var cells = per.map(function (p) {
        var fr = p.rows[k] || null;
        var d = fr ? recDisplay(fr) : null;
        return {
          pid: p.pid, name: p.name, key: k,
          onFile: !!fr,
          read: !!(fr && fr.read),
          judged: fr ? (fr.judged || 0) : 0,
          items: d ? (d.items || 0) : (fr ? (fr.held || 0) : 0),
          label: d ? (d.label || '') : '',
          depth: d ? (d.depth || '') : '',
          single: !!(d && d.single)
        };
      });
      return { key: k, label: labelOf(k), cells: cells, glance: glanceFor(cells) };
    });
    return { rows: rows, total: keys.length, shown: rows.length,
             dropped: Math.max(0, keys.length - picked.length), cap: SNAP_CAP };
  }

  // Every cell that has a file behind it is a door into the SHIPPED dossier for
  // that person on that issue — the same [data-pdxc-gap] contract the profile's
  // own rows use, handled by consistency.js's delegated listener. No second
  // opening path, so a snapshot cell cannot show one thing and the dossier
  // another.
  function snapCell(c, issueLabel) {
    var body =
      '<span class="rs-snap-who">' + esc(c.name) + '</span>' +
      '<span class="rs-snap-lbl">' + esc(c.onFile ? (c.label || 'On the record') : 'Nothing formal on file') + '</span>' +
      (c.onFile && c.depth
        ? '<span class="rs-snap-dep">' + esc(c.depth) + (c.read ? '' : ' · no pattern read yet') + '</span>'
        : '') +
      ((c.onFile && c.single)
        ? '<span class="rs-snap-1" title="Every judged item here sits on one measure. One instrument is one instrument — it is not a pattern across the issue.">📍 on 1 measure</span>'
        : '');
    if (!c.onFile) {
      return '<div class="rs-snap-cell is-empty">' + body +
        '<span class="rs-snap-dep">Nothing is inferred from what they have said.</span></div>';
    }
    return '<button type="button" class="rs-snap-cell"' +
      ' data-pdxc-gap="' + esc(c.key) + '" data-pdxc-gap-pid="' + esc(c.pid) + '"' +
      ' aria-label="' + esc('Open ' + c.name + '’s formal record on ' + issueLabel) + '">' +
      body + '<span class="rs-snap-go" aria-hidden="true">›</span></button>';
  }

  function snapshotHtml(snap) {
    if (!snap.rows.length) {
      return '<section class="rs-snap" aria-label="Issues this field has a formal record on">' +
        '<h3 class="rs-snap-hd">Issues this field has a record on · side by side</h3>' +
        '<p class="rs-snap-none">Nobody in this field has a formal record on file yet, so there is no shared issue to lay out. ' +
          'The gap is not filled in with their statements.</p></section>';
    }
    var rows = snap.rows.map(function (r) {
      return '<div class="rs-snap-row" style="' + issueStyle(r.key) + '">' +
        '<div class="rs-snap-issue">' +
          '<span class="rs-snap-name">' + esc(r.label) + '</span>' +
          '<span class="rs-snap-glance" data-rs-g="' + esc(r.glance.token) + '" title="' + esc(r.glance.why) + '">' +
            esc(r.glance.word) + '</span>' +
        '</div>' +
        '<div class="rs-snap-cells">' +
          r.cells.map(function (c) { return snapCell(c, r.label); }).join('') +
        '</div>' +
      '</div>';
    }).join('');
    return '<section class="rs-snap" aria-label="Issues this field has a formal record on">' +
      '<h3 class="rs-snap-hd">Issues this field has a record on · side by side</h3>' +
      '<p class="rs-snap-rule">Picked by a public rule, not from your positions: every issue anyone in this field has a formal file on, ' +
        'most widely shared first, capped at ' + snap.cap + ' and laid out in the site’s own topic order. ' +
        (snap.dropped
          ? snap.dropped + ' more ' + (snap.dropped === 1 ? 'issue is' : 'issues are') + ' on file and not shown here — a profile carries the whole index. '
          : '') +
        'Depth is the formal items on file; the at-a-glance compares how much of that file the record engine could judge. ' +
        'Tap any cell for that person’s dossier on that issue.</p>' +
      rows +
    '</section>';
  }

  // ── The head-to-head blurb ─────────────────────────────────────────────────
  // Assembled from three formal-lane facts and nothing else: how much has been
  // tested, what Direction Match said about it, and how many snapshot rows are
  // thin. There is no sentence in here that ranks the field, and there cannot be:
  // the only comparative words it owns are about the size of a file.
  function h2hHtml(all, snap) {
    var facts = all.map(function (c) { return { name: c.name, dm: dmFacts(c) }; });
    var tested = facts.map(function (f) {
      return '<span class="rs-h2h-n">' + esc(f.name) + ' <b>' + f.dm.tested + '</b></span>';
    }).join(' · ');
    var band = facts.map(function (f) {
      return '<span class="rs-h2h-n">' + esc(f.name) + ' ' +
        (f.dm.pct === null ? esc(f.dm.sub || 'not published yet')
                           : esc(f.dm.sub || 'tested') + ' <b>' + f.dm.pct + '%</b>') + '</span>';
    }).join(' · ');
    var n = snap.rows.length;
    var thin = snap.rows.filter(function (r) { return r.glance.token === 'thin'; }).length;
    var shared = n
      ? (n - thin) + ' of ' + n + ' shared issue' + (n === 1 ? '' : 's') +
        ' read a formal direction for at least one of them' +
        (thin ? ', and ' + thin + ' ' + (thin === 1 ? 'is' : 'are') + ' thin for everyone in this field' : '') + '.'
      : 'No issue in this field has a formal file behind it yet.';
    return '<section class="rs-h2h" aria-label="How this field compares on the formal record">' +
      '<h3 class="rs-h2h-hd">How this field compares, on the record alone</h3>' +
      '<p class="rs-h2h-l"><b>Tested formal items:</b> ' + tested +
        '. A bigger file is more evidence, not a better candidate.</p>' +
      '<p class="rs-h2h-l"><b>Direction Match:</b> ' + band +
        '. That is each of them against their own word — the reader is not in it.</p>' +
      '<p class="rs-h2h-l"><b>Issues in common:</b> ' + shared + '</p>' +
      '<p class="rs-h2h-cta">None of the above is agreement with you. ' +
        '<button type="button" class="rs-h2h-btn" onclick="' + ctaOpen() + '">Set your positions for your own record match →</button></p>' +
    '</section>';
  }

  // ── The Overview candidate card ────────────────────────────────────────────
  // Identity, seat, Direction Match with its denominator, up to three topic peeks
  // into the dossier, and the two actions. The number slot on this card can only
  // ever hold Direction Match, and it is labelled as such — there is no branch
  // here that prints a match to the reader, because this view has none to print.
  function ovCard(c, rk, picked, snap, sm) {
    var photo = '';
    try { if (fn('_getPhotoUrl')) photo = window._getPhotoUrl(c.pid) || ''; } catch (e) {}
    var avatar = photo
      ? '<span class="rs-face"><img src="' + esc(photo) + '" alt="" loading="lazy" decoding="async"></span>'
      : '<span class="rs-face rs-face--empty" aria-hidden="true">' + c.icon + '</span>';
    var d = dmFacts(c);

    // The peeks come out of the snapshot the whole sheet is already showing, so a
    // chip on a card and a cell in the table can never disagree. Readable
    // patterns first, then the deeper file, then alphabetical — deterministic.
    var mine = [];
    snap.rows.forEach(function (r) {
      r.cells.forEach(function (cl) { if (cl.pid === c.pid && cl.onFile) mine.push({ r: r, c: cl }); });
    });
    mine.sort(function (a, b) {
      if (a.c.read !== b.c.read) return a.c.read ? -1 : 1;
      if (b.c.judged !== a.c.judged) return b.c.judged - a.c.judged;
      return String(a.r.label).localeCompare(String(b.r.label));
    });
    var peeks = mine.slice(0, 3).map(function (m) {
      return '<button type="button" class="rs-peek" style="' + issueStyle(m.c.key) + '"' +
        ' data-pdxc-gap="' + esc(m.c.key) + '" data-pdxc-gap-pid="' + esc(c.pid) + '"' +
        ' aria-label="' + esc(c.name + ' on ' + m.r.label + ' — open the formal dossier') + '">' +
        '<span class="rs-peek-i">' + esc(m.r.label) + '</span>' +
        '<span class="rs-peek-o">' + esc(m.c.label || 'On the record') +
          (m.c.judged ? ' · ' + m.c.judged + ' judged' : '') + '</span>' +
      '</button>';
    }).join('');
    if (!peeks) {
      peeks = '<span class="rs-peek-none">No formal file on any issue yet. Nothing here is filled in from what they have said.</span>';
    }

    return '<article class="rs-ovcard" data-align-pid="' + esc(c.pid) + '">' +
      '<header class="rs-ovhd">' + avatar +
        '<span class="rs-whotext">' +
          '<button type="button" class="rs-name" onclick="if(window.showProfile)window.showProfile(\'' + jsq(c.pid) + '\')"' +
            ' aria-label="Open ' + esc(c.name) + '’s full record">' + esc(c.name) + '</button>' +
          '<span class="rs-ovseat">' + (sm ? sm.icon + ' ' + esc(sm.label) : '') + '</span>' +
          (c.incumbent ? '<span class="rs-inc">Holds this seat now</span>' : '') +
        '</span>' +
      '</header>' +
      '<div class="rs-ovdm" data-rs-dm="' + esc((dmSlot(c) || {}).state || 'empty') + '"' +
        ' title="Direction Match asks whether this person kept their OWN word — their stated positions against their own formal record. It is not a match to you, and it does not order this list.">' +
        (d.pct === null
          ? '<span class="rs-ovdm-s">' + esc(d.sub || 'No Direction Match published yet') + '</span>'
          : '<b class="rs-ovdm-p">' + d.pct + '%</b><span class="rs-ovdm-s">Direction Match · ' + esc(d.sub || '') + '</span>') +
        '<span class="rs-ovdm-n">' + (d.tested ? d.tested + ' tested item' + (d.tested === 1 ? '' : 's') : 'nothing tested yet') + '</span>' +
      '</div>' +
      '<div class="rs-ovpeek">' + peeks + '</div>' +
      '<div class="rs-ovacts">' +
        teamBtn(rk, c, picked, !!picked && picked !== c.pid) +
        '<button type="button" class="rs-ovprof" onclick="if(window.showProfile)window.showProfile(\'' + jsq(c.pid) + '\')">Open profile ›</button>' +
      '</div>' +
    '</article>';
  }

  // ── The race context strip ─────────────────────────────────────────────────
  // Painted on every tab, including the ranked ones, because the question it
  // answers — what seat is this, who holds it, and how much of each candidate has
  // actually been tested — does not change when the reader picks a ruler.
  function contextStrip(sm, all) {
    var scope = scopeLabel(sm.key);
    var incs = all.filter(function (c) { return c.incumbent; });
    var chips = all.map(function (c) {
      var d = dmFacts(c);
      return '<span class="rs-ctx-chip">' +
        '<span class="rs-ctx-who">' + esc(c.name) + (c.incumbent ? ' <span class="rs-ctx-i">holds it</span>' : '') + '</span>' +
        '<span class="rs-ctx-dm">' +
          (d.pct === null
            ? esc(d.sub || 'No Direction Match yet')
            : '<b class="rs-ctx-pct">' + d.pct + '%</b> Direction Match') +
        '</span>' +
        '<span class="rs-ctx-n">' + (d.tested ? d.tested + ' tested' : 'nothing tested yet') + '</span>' +
      '</span>';
    }).join('');
    return '<section class="rs-ctx" aria-label="Race context">' +
      '<div class="rs-ctx-top">' +
        '<span class="rs-ctx-seat">' + sm.icon + ' ' + esc(sm.label) + (scope ? ' · ' + esc(scope) : '') + '</span>' +
        '<span class="rs-ctx-count">' + all.length + ' candidate' + (all.length === 1 ? '' : 's') + ' on file</span>' +
        '<span class="rs-ctx-inc">' + (incs.length
          ? 'Holds this seat now: ' + esc(incs.map(function (c) { return c.name; }).join(', '))
          : 'Nobody in this field currently holds the seat') + '</span>' +
      '</div>' +
      '<div class="rs-ctx-chips">' + chips + '</div>' +
      '<p class="rs-ctx-caveat">Direction Match is the <b>formal lane only</b> — their own word against their own record. ' +
        'It is not a personal match to you, and it orders nothing on this sheet.</p>' +
    '</section>';
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
  // THREE TABS, TWO OF THEM RULERS. The Overview control deliberately does not
  // carry the .rs-mode class the other two share: that class means "this button
  // can order the field", the sheet's own contract test counts it, and Overview
  // orders nothing. A gated ruler still renders and is still pressable — pressing
  // it is how a reader with no positions finds out what would change.
  function toggleHtml(view, axisN) {
    var gated = (axisN === 0);
    var ovOn = (view === 'overview');
    var ov = '<button type="button" class="rs-vtab' + (ovOn ? ' is-on' : '') + '"' +
      ' role="tab" aria-selected="' + (ovOn ? 'true' : 'false') + '"' +
      ' onclick="window.pdxRaceSheetMode(\'overview\')"' +
      ' aria-label="' + esc(OVERVIEW.label + ' — ' + OVERVIEW.sub) + '">' +
      '<span aria-hidden="true">' + OVERVIEW.ico + '</span> ' + esc(OVERVIEW.tab) +
    '</button>';
    var btn = function (m) {
      var mm = MODES[m], on = (m === view);
      return '<button type="button" class="rs-mode' + (on ? ' is-on' : '') + (gated ? ' is-gated' : '') + '"' +
        ' role="tab" aria-selected="' + (on ? 'true' : 'false') + '"' +
        ' onclick="window.pdxRaceSheetMode(\'' + m + '\')"' +
        (gated ? ' title="' + esc(UNSET.hd + ' ' + UNSET.sub) + '"' : '') +
        ' aria-label="' + esc(mm.label + ' — ' + mm.sub + (gated ? ' Waiting on your positions: ' + UNSET.hd : '')) + '">' +
        '<span aria-hidden="true">' + mm.ico + '</span> ' + esc(mm.label) +
      '</button>';
    };
    return '<div class="rs-modes" role="tablist" aria-label="How this field is shown">' +
        ov + btn('record') + btn('stated') +
      '</div>';
  }

  // ── Share this race ────────────────────────────────────────────────────────
  // WHAT LEAVES THE APP, AND WHAT NEVER DOES
  // ────────────────────────────────────────
  // What travels: the office, the candidate ids the sender's ballot actually
  // resolved, and which of the two rulers was active. That is enough for the
  // link to open the SAME race — not a profile, not the front page.
  //
  // What does not travel: the sender's stance list, and the order this sheet
  // computed from it. Those are the two things that would turn a share into a
  // claim about the recipient. The recipient re-ranks with their own positions;
  // with none, the sheet opens in its existing unranked state and says so. There
  // is therefore no "sender's ranking at share time" snapshot to label, because
  // there is no snapshot.
  //
  // What is forbidden on the artifact and enforced by the composer below: no
  // party, no blended formal+public figure, no percentage of any kind, and no
  // sentence that implies every candidate on the sheet carries a score.
  function scopeLabel(rk) {
    var reps = null;
    try { reps = fn('pdxRepsForMe') ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }
    if (!reps || !reps.located) return '';
    var st = String(reps.state || '').trim();
    if (!st || st === 'National') return '';
    // A statewide seat IS the state. A district seat is only honestly described
    // as the sender's own districts — naming the state would overclaim the reach
    // of a single House or legislative seat.
    if (rk === 'senate' || rk === 'governor' || rk === 'president') return st;
    return reps.districtsResolvable ? 'your districts' : st;
  }

  // The composed payload, or null when there is no open sheet to describe.
  function shareBits() {
    if (!_state) return null;
    var sm = seatMeta(_state.seatKey);
    if (!sm) return null;
    var mode = readMode(), mm = meta(mode);
    var all = field(sm.key, _state.pins);
    if (!all.length) return null;

    var pids = all.map(function (c) { return c.pid; });
    var names = all.map(function (c) { return String(c.name || c.pid); });
    var shownNames = names.length > 8
      ? names.slice(0, 8).join(', ') + ' +' + (names.length - 8) + ' more'
      : names.join(', ');

    // The ruler clause is only true when something was actually ranked. With no
    // positions set the sheet is in a fixed order, and a share that borrowed the
    // mode label anyway would be describing a ranking that never happened.
    // Three states now, because there is a tab on which a reader WITH positions is
    // still looking at an unranked sheet. Borrowing the ruler's clause there would
    // describe an ordering the sender was not looking at.
    var v = activeView();
    var ruler = (v !== 'overview' && axis().length)
      ? mm.share
      : (axis().length
        ? 'shown side by side on the formal record — an overview, not a ranking'
        : 'in a fixed order — no positions set, so nobody here is ranked');
    var scope = scopeLabel(sm.key);

    return {
      title: sm.label + ' — the field, side by side',
      text: shownNames + '\n' + ruler.charAt(0).toUpperCase() + ruler.slice(1) + (scope ? ' · ' + scope : ''),
      url: (window.PDXShareLinks && typeof window.PDXShareLinks.race === 'function')
        ? window.PDXShareLinks.race(sm.key, { cands: pids, rmode: mode })
        : '',
      pids: pids,
      names: names
    };
  }

  function copyText(str) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        return Promise.resolve(navigator.clipboard.writeText(str)).then(
          function () { return true; }, function () { return legacyCopy(str); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(str));
  }
  function legacyCopy(str) {
    try {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', 'readonly');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var done = document.execCommand ? document.execCommand('copy') : false;
      document.body.removeChild(ta);
      return !!done;
    } catch (e) { return false; }
  }

  // Visible, dismissible, and re-showable: notice() is idempotent by id, so a
  // second failed attempt would otherwise be silent — which is the exact defect.
  function shareFail(msg) {
    try {
      var old = document.getElementById('pdx-race-share-failed');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (window.PDXShareLinks && typeof window.PDXShareLinks.notice === 'function') {
        window.PDXShareLinks.notice('pdx-race-share-failed', 'Share this race', msg);
      }
    } catch (e) {}
  }
  function flashShare(label) {
    try {
      var btn = document.getElementById('rs-share-btn');
      if (!btn) return;
      var was = btn.innerHTML;
      btn.innerHTML = '<span class="rs-share-ico" aria-hidden="true">✓</span><span class="rs-share-txt">' + esc(label) + '</span>';
      setTimeout(function () {
        var b2 = document.getElementById('rs-share-btn');
        if (b2) b2.innerHTML = was;
      }, 2200);
    } catch (e) {}
  }

  window.pdxRaceSheetShare = function () {
    var b = shareBits();
    if (!b || !b.url) {
      shareFail('We could not build a link for this seat, so nothing was shared. Rather than hand you a link to the front page, here is the plain answer: there is nothing addressable here yet.');
      return Promise.resolve({ ok: false, outcome: 'invalid' });
    }
    var payload = b.title + '\n' + b.text + '\n' + b.url;
    var copyOrSay = function () {
      return copyText(payload).then(function (done) {
        if (done) { flashShare('Link copied'); return { ok: true, outcome: 'copied' }; }
        shareFail('This browser would not open a share sheet and would not take the link to the clipboard either. The link is: ' + b.url);
        return { ok: false, outcome: 'failed' };
      });
    };
    var SL = window.PDXShareLinks;
    if (!SL || typeof SL.native !== 'function') return copyOrSay();
    return SL.native({ title: b.title, text: b.text, url: b.url }).then(function (res) {
      if (res && res.ok) { flashShare('Shared'); return res; }
      // A reader who dismissed the sheet chose that. Nothing is said and nothing
      // is copied behind their back.
      if (res && res.outcome === 'cancelled') return res;
      return copyOrSay();
    });
  };

  function shareBtnHtml() {
    return '<button type="button" class="rs-share" id="rs-share-btn"' +
      ' onclick="window.pdxRaceSheetShare()"' +
      ' aria-label="Share this race — sends the seat and this field, not your positions">' +
      '<span class="rs-share-ico" aria-hidden="true">↱</span>' +
      '<span class="rs-share-txt">Share this race</span>' +
    '</button>';
  }

  // ── Empty / no-stance states ───────────────────────────────────────────────
  function ctaOpen() {
    return fn('_krAlignGuideToPicker') ? 'window._krAlignGuideToPicker()'
      : (fn('openAlignBoard') ? 'window.openAlignBoard()' : 'window.pdxRaceSheetClose()');
  }
  function ctaHtml() {
    var open = ctaOpen();
    return '<div class="rs-cta">' +
        '<p class="rs-cta-hd">\u{1F3AF} Set your positions and this field re-orders itself.</p>' +
        '<p class="rs-cta-sub">Pick at least <b>' + ASK_ISSUES + '</b> issues and say where you stand. ' +
          'The sheet will then rank these candidates by how their formal record lines up with you — ' +
          'until you do, it stays in a fixed order and no one here is scored.</p>' +
        '<button type="button" class="rs-cta-btn" onclick="' + open + '">Set my positions →</button>' +
      '</div>';
  }

  // THE DISCLOSURE THAT REPLACES THE GATE. A ranking on one or two positions now
  // opens by default, so the sheet owes the reader the size of what it is
  // ranking on before they read the order — not a warning, not a hedge, and
  // certainly not a refusal: the count they set, in their words, followed by
  // what it does and does not buy them. Naming it as POSITIONS rather than
  // issues matters here, because on this tab the number is a fact about the
  // reader's own input, not about the candidates' files.
  function thinAxisNote(n) {
    if (n >= ASK_ISSUES) return '';
    return '<p class="rs-thinaxis">Ranked on the <b>' + n + ' position' + (n === 1 ? '' : 's') +
      '</b> you\u2019ve set. That is enough to order this field and not enough to be sure of it \u2014 ' +
      'add ' + (n === 1 ? 'a couple' : 'one') + ' more and the order gets a lot harder to move by accident.</p>';
  }

  // ── Paint ──────────────────────────────────────────────────────────────────
  function bodyHtml() {
    var sm = seatMeta(_state.seatKey);
    if (!sm) return '<div class="rs-empty">That seat is not one this sheet can compare yet.</div>';

    var view = activeView();
    var mode = (view === 'stated') ? 'stated' : 'record';
    var mm = meta(mode);
    var all = field(sm.key, _state.pins);
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
        '<div class="rs-hd-acts">' +
          // Only on an open sheet with a field to describe. A share control over
          // "no candidates on file" would emit a link to an empty comparison.
          (all.length ? shareBtnHtml() : '') +
          '<button type="button" class="rs-close" onclick="window.pdxRaceSheetClose()" aria-label="Close the race sheet">×</button>' +
        '</div>' +
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

    // A field of one gets the officeholder-only line ONLY when the one person is
    // the officeholder. A lone challenger on file — a filing certified before the
    // incumbent's, or a seat whose holder is not in the roster — is a different
    // fact, and telling that voter "only the officeholder is on file" would name
    // the wrong person as the sitting member. When the one is not the incumbent,
    // the sheet says nothing extra: the panes already show who is there.
    var only = (all.length === 1 && !!all[0].incumbent);
    var onlyHtml = only
      ? '<p class="rs-onlyone">Only the officeholder is on file for this seat so far — there is no field to compare yet. Their record is below, and challengers appear here as filings are certified.</p>'
      : '';

    // ARRIVED FROM A SHARED LINK. Three separate admissions, and the third is
    // said every time: what came over the wire was a seat, a list of ids and the
    // name of a ruler. No stance of the sender's travelled, so nothing on this
    // sheet is their match — it is the reader's, or it is nobody's.
    var sharedNote = '';
    if (_state.shared) {
      var pinnedN = all.filter(function (c) { return c.pinned; }).length;
      var missN = missingPins(_state.pins).length;
      sharedNote = '<p class="rs-shared">' +
        '<b>Opened from a shared link.</b> ' +
        (pinnedN ? pinnedN + ' candidate' + (pinnedN === 1 ? '' : 's') +
          ' from the sender\u2019s ballot ' + (pinnedN === 1 ? 'was' : 'were') +
          ' added to the field your own location resolves. ' : '') +
        (missN ? missN + ' name' + (missN === 1 ? '' : 's') + ' in that link ' +
          (missN === 1 ? 'is' : 'are') + ' no longer on file and ' +
          (missN === 1 ? 'is' : 'are') + ' not shown. ' : '') +
        'Nothing about the sender\u2019s positions came with it \u2014 this order is yours, not theirs.' +
      '</p>';
    }

    var explainHtml = '<p class="rs-explain">' + EXPLAINER + '</p>';
    var footHtml = '<p class="rs-foot">Only the <b>formal</b> lane — roll-call votes and formal actions — feeds the record ruler. ' +
      'Public statements are never added into it. Party is not read, printed or ranked anywhere on this sheet.</p>';
    var ctx = contextStrip(sm, all);

    // ── OVERVIEW ───────────────────────────────────────────────────────────
    // Everything on this branch is a fact about the candidates. The reader's
    // stance list is not read by any of it — snapshot() picks its issues from the
    // candidates' formal files, the cards carry Direction Match and nothing else
    // numeric, and the only ordering is the same fixed one the unranked field has
    // always used. What the reader gets by setting positions is stated, once, and
    // in their own terms rather than as a complaint about a candidate's file.
    if (view === 'overview') {
      var snap = snapshot(all);
      var gate = hasIssues
        ? ''
        : '<div class="rs-gate"><p class="rs-gate-hd">' + esc(UNSET.hd) + '</p>' +
            '<p class="rs-gate-sub">' + esc(UNSET.sub) + '</p></div>';
      var ovLine = '<p class="rs-rankline">' + OVERVIEW.line + '</p>' +
        (hasIssues
          ? '<p class="rs-rankline">Overview is never ranked — it is in a fixed order: officeholder first, then alphabetical. Your ranking is on the two tabs beside it.</p>'
          : '<p class="rs-rankline">Nothing is ranking this field yet — it is in a fixed order: officeholder first, then alphabetical.</p>');
      var cards = '<div class="rs-ovgrid" data-rs-cols="' + all.length + '">' +
        stableSort(all).map(function (c) { return ovCard(c, rk, picked, snap, sm); }).join('') +
      '</div>';
      // RUNNING ORDER, AND WHY THE RACE COMES BEFORE THE CONTROL. On a phone this
      // column IS the hierarchy. The first thing a reader should meet under the
      // seat name is the race — who is in it, who holds it now, how much of each
      // file has actually been tested — because that is the question they opened
      // the sheet with. The tabs come next, as the answer to "and how do I want
      // this shown", which is a question you can only have after you know what
      // "this" is. Everything below is the chosen view.
      return head +
        sharedNote +
        ctx +
        '<div class="rs-controls">' + toggleHtml(view, rows.length) + ovLine + explainHtml + '</div>' +
        gate +
        onlyHtml +
        snapshotHtml(snap) +
        h2hHtml(all, snap) +
        cards +
        (rows.length < ASK_ISSUES ? ctaHtml() : '') +
        footHtml;
    }

    var ranked = rank(all, mode, hasIssues);

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

    // A RANKED FIELD STILL GETS THE RACE CONTEXT. Direction Match, the seat and
    // the tested inventories are facts about the candidates, and they do not stop
    // being useful because the reader has told us what they believe — brief 7:
    // Overview stays available, and Direction Match stays as secondary context.
    //
    // AND THE ASK IS STILL MADE ON A THIN AXIS. A ranking built on one or two
    // positions is real and is shown (the sheet has never had a floor and does
    // not gain one here), but the CTA rides along under it, because three is
    // where the same ask is made everywhere else in the product.
    // Same running order as Overview: the race, then the control, then the view.
    // The thin-axis disclosure rides inside the control block, directly under the
    // rank line it qualifies, so a reader on a phone cannot meet the order before
    // they meet how much it rests on.
    return head +
      sharedNote +
      ctx +
      '<div class="rs-controls">' +
        toggleHtml(view, rows.length) +
        rankLine +
        explainHtml +
        (hasIssues ? thinAxisNote(rows.length) : '') +
      '</div>' +
      onlyHtml +
      (hasIssues ? '' : ctaHtml()) +
      panes +
      (moreBtn ? '<div class="rs-morewrap">' + moreBtn + '</div>' : '') +
      (hasIssues && rows.length < ASK_ISSUES ? ctaHtml() : '') +
      footHtml;
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

  function open(seatKey, opts) {
    var sm = seatMeta(seatKey);
    if (!sm) return;
    opts = opts || {};
    // pins/shared are per-OPEN, never sticky. A sheet opened normally after
    // following a shared link must not still be showing the sender's field.
    _state = {
      seatKey: sm.key, expanded: false,
      pins: (opts.pins || []).filter(Boolean),
      shared: !!opts.shared
    };
    var ov = ensureOverlay();
    ov.style.display = 'flex';
    // Record mode needs vote packs the stated lane never fetched. Queue the
    // field before the first paint so the warmer's own settle path repaints us
    // with real patterns instead of a sheet full of "no pattern".
    warmField(field(sm.key, _state.pins));
    render();
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    try { requestAnimationFrame(function () { ov.classList.add('is-open'); }); } catch (e) { ov.classList.add('is-open'); }
  }

  function close() {
    var ov = document.getElementById(OVERLAY_ID);
    // A shared link put #race= in the address bar. Leaving it there means a
    // refresh re-opens a sheet the reader just closed, and every onward link
    // they copy still claims to be about this seat. Strip it, without a history
    // entry, and touch nothing else in the URL.
    try {
      if (/^#race=/.test(location.hash || '')) {
        history.replaceState(history.state, '', location.pathname + location.search);
      }
    } catch (e) {}
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
  // One control, three tabs. Overview writes only the VIEW key — the active ruler
  // is a separate fact and picking a non-ruler must not silently change it, or a
  // reader who looked at the overview and then shared the race would send a link
  // naming a ruler they never chose.
  window.pdxRaceSheetMode = function (m) {
    if (m === 'overview') { writeView('overview'); render(); return readMode(); }
    writeMode(m);
    writeView(m === 'stated' ? 'stated' : 'record');
    render();
    return readMode();
  };
  window.pdxRaceSheetMatchMode = readMode;
  window.pdxRaceSheetView = activeView;
  window.pdxRaceSheetMore = function () { if (_state) { _state.expanded = !_state.expanded; render(); } };
  window.pdxRaceSheetPick = function (rk, pid) {
    try { if (fn('ballotPickCard')) window.ballotPickCard(rk, pid); } catch (e) {}
    render();
  };
  // Called by _alignRefreshAll (alignment-tool.js) whenever the visitor's issues,
  // stances or a freshly warmed vote pack change what these numbers are.
  window._pdxRaceSheetRefresh = function () {
    if (_state) render();
    // The seat strips carry "Set stances to rank this race", which is only true
    // while the visitor has no positions. Setting one has to clear it wherever it
    // is painted, not just in an open sheet — otherwise the hub keeps telling
    // someone to do a thing they already did. Guarded, read-only repaints.
    try { if (typeof window._vhSyncDistrictStrip === 'function') window._vhSyncDistrictStrip(); } catch (e) {}
    try { if (window.PDXWhoRepresentsMe && typeof window.PDXWhoRepresentsMe.sync === 'function') window.PDXWhoRepresentsMe.sync(); } catch (e) {}
  };

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

  // ── The seat row contract ──────────────────────────────────────────────────
  // One helper, three hosts. Who Represents Me, the Voter Hub district strip and
  // anything else that lists seats all need the SAME three things under a seat:
  // where the team slot stands, the way into the field, and — only for someone
  // who has not set positions yet — the one line that explains why the field
  // will not be ranked. Writing that markup three times is how the three copies
  // drift, so it lives here, next to the store reads it depends on.
  //
  // Order is deliberate: team state, then compare, then the stance line. The
  // voter's own decision is the fact; the button is the next action; the stance
  // line is a footnote and never outranks either.
  function nameOf(pid) {
    var d = recOf(pid);
    return (d && d.name) || '';
  }

  window.pdxSeatStrip = function (seatKey, opts) {
    var sm = seatMeta(seatKey);
    // No seat key this sheet understands means no race key, which means there is
    // no team slot to report and nothing to compare. Say nothing rather than
    // paint an empty slot for an office we cannot name.
    if (!sm) return '';
    opts = opts || {};

    var pid = pickedFor(sm.key);
    var nm = pid ? nameOf(pid) : '';
    var team = pid
      ? '<span class="rs-seat-team is-on"><span class="rs-seat-team-ic" aria-hidden="true">\u2b50</span>' +
          '<span>On your team: <b>' + esc(nm || pid) + '</b></span></span>'
      : '<span class="rs-seat-team"><span class="rs-seat-team-ic" aria-hidden="true">\u2606</span>' +
          '<span>No pick yet</span></span>';

    var entry = window.pdxRaceSheetEntry(sm.key, { compact: opts.compact !== false });

    // Only when the field could be ranked and the visitor has given it nothing
    // to rank on. A link, not a lecture: one line, one destination.
    var stanceLine = (entry && axis().length === 0)
      ? '<button type="button" class="rs-seat-stance"' +
          ' onclick="event.stopPropagation();if(window.PDXStances&&window.PDXStances.open)window.PDXStances.open();else location.hash=\'#my-stances\';">' +
          'Set stances to rank this race \u203a</button>'
      : '';

    return '<div class="rs-seat-strip">' + team + entry + stanceLine + '</div>';
  };

  // ── Arrival from a shared race link ────────────────────────────────────────
  // share-links.js turns /?race=house&cands=…&rmode=record into #race=house&…
  // and fires a synthetic hashchange. It is deferred earlier in the document
  // than this file, so that event has already gone by the time we run — hence
  // both a boot read and a listener. Neither can open the same sheet twice: open()
  // replaces _state outright.
  function readRaceHash() {
    var h = String(location.hash || '');
    var m = h.match(/^#race=([^&]*)(.*)$/);
    if (!m) return null;
    var seat = '';
    try { seat = decodeURIComponent(m[1] || ''); } catch (e) { seat = m[1] || ''; }
    if (!seat) return null;
    var rest = m[2] || '';
    var g = function (k) {
      var mm = rest.match(new RegExp('[&]' + k + '=([^&]*)'));
      if (!mm) return '';
      try { return decodeURIComponent(mm[1] || ''); } catch (e) { return mm[1] || ''; }
    };
    var rmode = g('rmode');
    return {
      seat: seat,
      pins: g('cands').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
      rmode: (rmode === 'record' || rmode === 'stated') ? rmode : ''
    };
  }

  // THE HONEST FALLBACK. Two ways a race link cannot mount: a seat key this
  // sheet does not speak, and a seat with nothing on file for this reader that
  // the link's own ids could not fill either. Both land the reader on their own
  // seats with the one they were sent marked — never on a random profile, and
  // never on a silent front page.
  function raceFallback(rk, label) {
    try {
      if (window.PDXShareLinks && typeof window.PDXShareLinks.notice === 'function') {
        window.PDXShareLinks.notice('pdx-race-unresolved', 'Shared race',
          'We couldn’t open ' + (label || 'that seat') + ' as a comparison here — ' +
          'nothing is on file for it against your location, and the candidates named in the link ' +
          'aren’t on our roster either. Your own seats are below.');
      }
    } catch (e) {}
    try {
      if (window.PDXWhoRepresentsMe && typeof window.PDXWhoRepresentsMe.focus === 'function') {
        window.PDXWhoRepresentsMe.focus(rk || '');
      }
    } catch (e) {}
  }

  function openFromHash() {
    var r = readRaceHash();
    if (!r) return false;
    var sm = seatMeta(r.seat);
    if (!sm) { raceFallback('', ''); return false; }
    if (r.rmode) writeMode(r.rmode);
    // Checked BEFORE opening: an overlay that mounts onto "no candidates on
    // file" is a worse answer than the seat list, because it looks like the
    // shared race arrived and turned out to be empty.
    if (!field(sm.key, r.pins).length) { raceFallback(sm.key, sm.label); return false; }
    open(sm.key, { pins: r.pins, shared: true });
    return true;
  }

  window.addEventListener('hashchange', function () {
    if (/^#race=/.test(location.hash || '')) openFromHash();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _state) close();
  });

  window.PDXRaceSheet = {
    open: open, close: close, entry: window.pdxRaceSheetEntry,
    mode: readMode, setMode: window.pdxRaceSheetMode,
    MODES: MODES, ASK_ISSUES: ASK_ISSUES, AXIS_SHOWN: AXIS_SHOWN,
    // Exposed for the harness and for any caller that wants the model without
    // the markup. Pure reads; nothing here writes.
    seatStrip: window.pdxSeatStrip,
    share: window.pdxRaceSheetShare,
    // The Overview model, without its markup: `_view` is the resolved tab,
    // `_snapshot` the shared-issue table the harness pins, `_dm` the ledger facts
    // a card prints. Pure reads.
    view: activeView, OVERVIEW: OVERVIEW, UNSET: UNSET, SNAP_CAP: SNAP_CAP,
    _view: activeView, _snapshot: snapshot, _dm: dmFacts, _glance: glanceFor,
    _field: field, _axis: axis, _rank: rank, _seat: seatMeta,
    _shareBits: shareBits, _openFromHash: openFromHash, _readRaceHash: readRaceHash,
    _missingPins: missingPins, _scope: scopeLabel
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
      // AFTER the hosts have painted, never before: the shared-link fallback
      // sends the reader to the Who Represents Me list, and that list has to
      // exist before we point at a row in it.
      try { openFromHash(); } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  })();
})();
