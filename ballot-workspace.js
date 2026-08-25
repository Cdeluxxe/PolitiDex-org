/* ═══════════════════════════════════════════════════════════════════════════
   ballot-workspace.js — Door 2 as one continuous ballot, not a list of seats
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN, STRUCTURALLY
   ─────────────────────────────
   Every piece of the ballot loop already shipped, and no two pieces were in the
   same place. Who Represents Me resolved the seats at the top of the document.
   Compare the Field ranked one seat's roster on the formal record — in a
   full-screen overlay that replaced the page. My Voting Team stored the picks,
   two and a half thousand lines further down, behind its own heading. So the
   loop a voter actually walks —

        resolve my seats → open a seat → compare the field → pick → next seat

   — was four context resets and a scroll hunt, and the reader's sense of "what
   have I decided, what is left" survived none of them. Each surface answered
   that question with its own "what now?" stack, which is what made Door 2 read
   as a brochure wrapped around a list rather than a tool.

   WHAT THIS FILE IS
   ─────────────────
   One surface that holds the whole loop: a persistent rail of every seat on the
   ballot with its pick state and a running count, plus one open seat carrying
   who holds it, the field on the formal record, the pick control, and the way
   into the next undecided seat. Picking never leaves the surface. Moving seats
   never leaves the surface. The count is never off screen.

   WHAT IT OWNS, AND WHAT IT REFUSES TO OWN
   ────────────────────────────────────────
   It owns layout, sequencing and one piece of state — which seat is open — and
   nothing else. Every fact on it is read from the surface that already owns it:

     · the seat list          → window.TEAM_POSITIONS (the same six slots the
                                team builder's own meter counts, so "3 of 6"
                                here cannot disagree with "3 of 6" there)
     · who holds a seat       → window.pdxRepsForMe() (the one resolver Who
                                Represents Me and the Voter Hub both read)
     · the field for a seat   → PDXRaceSheet._field (which wraps
                                _ballotCandidates, including its district match)
     · the order of the field → PDXRaceSheet._rank(list, 'record', …), i.e. the
                                app's one match brain, in its record lane
     · what the records say   → PDXRaceSheet._snapshot's tally of the formal
                                pattern index
     · Direction Match        → PDXRaceSheet._dm, which reads the ledger slot
                                that owns the publishable floor
     · local coverage         → window.pdxLocalSeatsForMe()
     · the picks              → window._ballotLoad / window.ballotPickCard

   Nothing here computes a score, derives a direction, coins an issue, or invents
   a seat. There is no second copy of any of those questions in this file, which
   is the only reason a workspace can be added to this app without becoming a
   fifth thing that disagrees with the other four.

   THE HARD RULES, AND HOW THIS SURFACE KEEPS THEM
   ───────────────────────────────────────────────
   · FORMAL RECORD IS THE RULER. The field is ordered by Your Match · record and
     the line above it says so. That is the local default everywhere on the seat
     spine, and this surface has no toggle that could change it — a reader who
     wants the stated lane opens the full sheet, which owns that choice.
   · DIRECTION MATCH IS SECONDARY AND ORDERS NOTHING. It is printed under the
     name, in grey, prefixed with the question it answers, and it is never read
     by anything that sorts. _rank() is the only sort on this file.
   · NO PARTY. Not read, not printed, not grouped, not scored. The seat rail is
     coloured by office, and the candidate rows are coloured by nothing.
   · NO ARTIFICIAL STRENGTH ON THIN DATA. A candidate the record lane cannot
     score gets no number — not a zero, not the other lane's figure — and a
     sentence saying which lane came up empty. A field of nought and a field of
     one get their own honest copy and are never dressed as a comparison.
   · RESOLVED MEANS RESOLVED. A district seat whose district this app does not
     map renders as an explicit gap. It never falls back to a statewide or
     national roster, because the failure that rule exists to prevent — showing
     a Columbus voter Utah's House field — is exactly the failure a "helpful"
     fallback produces.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MOUNT_ID = 'ballot-workspace';
  var BODY_ID = 'bw-body';
  var HUB_ID = 'voter-hub';
  // Which seat is open is a within-visit fact, not a preference, so it lives in
  // sessionStorage. A returning visitor starts on their first undecided seat,
  // which is the more useful answer than "wherever you were last week".
  var OPEN_KEY = 'pdx_bw_seat';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function fn(n) { return typeof window[n] === 'function'; }
  function rs() {
    var r = window.PDXRaceSheet;
    return (r && typeof r._field === 'function') ? r : null;
  }

  // ── The ballot: six slots, from the list that defines them ─────────────────
  // TEAM_POSITIONS is the team builder's own definition of a ballot, and the
  // rail is a projection of it. Deriving the seat list from anything else — the
  // resolver's levels, the curated ballot, a literal here — is how a workspace
  // ends up counting five slots over a builder counting six.
  var SEAT_FALLBACK = [
    { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8' },
    { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa' },
    { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399' },
    { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa' },
    { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf' },
    { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24' }
  ];
  function seats() {
    var out = [];
    try {
      (window.TEAM_POSITIONS || []).forEach(function (p) {
        if (p && p.key) out.push({ key: p.key, label: p.label || p.key, icon: p.icon || '\u{1F3DB}', color: p.color || '#9fb4d4' });
      });
    } catch (e) {}
    return out.length ? out : SEAT_FALLBACK;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────
  function reps() {
    try { return fn('pdxRepsForMe') ? window.pdxRepsForMe() : null; } catch (e) { return null; }
  }
  function located(r) { return !!(r && r.located); }

  // The pick for a seat, through the race sheet's own store reader. That helper
  // already knows the one rule this file would otherwise have to copy — local
  // offices are stored per-seat as local_<key>, so the generic 'local' slot has
  // to accept any of them — and a second copy of that rule is a second chance to
  // get it wrong.
  function pickedFor(rk) {
    var R = rs();
    if (R && typeof R._picked === 'function') {
      try { return R._picked(rk) || null; } catch (e) {}
    }
    try {
      var sel = fn('_ballotLoad') ? (window._ballotLoad() || {}) : {};
      if (sel[rk]) return sel[rk];
      if (rk === 'local') {
        var hit = null;
        Object.keys(sel).forEach(function (k) { if (!hit && k.indexOf('local') === 0) hit = sel[k]; });
        return hit;
      }
    } catch (e) {}
    return null;
  }
  function personOf(pid) {
    if (!pid) return null;
    try { if (fn('_pdxPersonById')) return window._pdxPersonById(pid) || null; } catch (e) {}
    try { return (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) {}
    return null;
  }
  function nameOf(pid) {
    var p = personOf(pid);
    return (p && p.name) || pid || '';
  }
  function axisN() {
    var R = rs();
    if (!R || typeof R._axis !== 'function') return 0;
    try { return R._axis().length; } catch (e) { return 0; }
  }
  function localCov() {
    try { return fn('pdxLocalSeatsForMe') ? window.pdxLocalSeatsForMe() : null; } catch (e) { return null; }
  }

  // The levels of the resolver that map onto one ballot slot. U.S. Senate maps
  // TWO (both of a state's seats), which is why this returns a list rather than
  // a level — and why the seat head names both holders instead of picking one.
  function holdersFor(rk, r) {
    var R = rs();
    if (!r || !r.levels || !R || typeof R._seat !== 'function') return [];
    var out = [];
    r.levels.forEach(function (lv) {
      if (!lv || !lv.key) return;
      var sm = null;
      try { sm = R._seat(lv.key); } catch (e) { sm = null; }
      if (sm && sm.key === rk) out.push(lv);
    });
    return out;
  }

  // ── WHETHER THIS SEAT CAN HONESTLY SHOW A FIELD ────────────────────────────
  // Three answers, and the difference between them is the whole truthfulness
  // rule of this surface:
  //
  //   'ok'       → show the field.
  //   'district' → the office is real, the reader's district for it is not
  //                mapped. Do NOT ask for a field: _ballotCandidates resolves
  //                from the reader's districts, and a seat with no district
  //                either comes back empty (which would read as "nobody is
  //                running") or comes back with somebody else's district. Say
  //                which of the two facts is missing instead.
  //   'localgap' → located, and this app holds no curated local roster for the
  //                area. A real, checkable admission — not an empty list.
  //
  // The statewide seats are absent from this list on purpose: every state has two
  // senators and a governor, so those resolve from a state alone, everywhere.
  function fieldGate(seat, r) {
    if (!located(r)) return 'nolocation';
    if (seat.key === 'local') {
      var cov = localCov();
      if (!cov || !cov.resolved) return 'nolocation';
      return cov.ok ? 'ok' : 'localgap';
    }
    var hold = holdersFor(seat.key, r);
    if (!hold.length) return 'ok';
    // A district seat is gated on its own level resolving, not on the state-wide
    // districtsResolvable flag, so one unmapped seat cannot silence a mapped one.
    var district = hold.filter(function (lv) { return !lv.statewide; });
    if (district.length && !district.some(function (lv) { return lv.resolved; })) return 'district';
    return 'ok';
  }

  function fieldFor(rk) {
    var R = rs();
    if (!R) return [];
    try { return R._field(rk) || []; } catch (e) { return []; }
  }

  // ── The rail ──────────────────────────────────────────────────────────────
  function railHtml(list, openKey) {
    var chips = list.map(function (s) {
      var pid = pickedFor(s.key);
      var sub = pid ? nameOf(pid) : 'No pick yet';
      return '<button type="button" class="bw-seat' +
          (s.key === openKey ? ' is-open' : '') + (pid ? ' is-picked' : '') + '"' +
        ' style="--bw-accent:' + esc(s.color) + ';"' +
        ' aria-current="' + (s.key === openKey ? 'true' : 'false') + '"' +
        ' onclick="window.pdxBallotWorkspaceOpen(\'' + jsq(s.key) + '\')"' +
        ' aria-label="' + esc(s.label + ' — ' + (pid ? 'your pick is ' + sub : 'no pick yet') + '. Open this seat.') + '">' +
        (pid ? '<span class="bw-seat-tick" aria-hidden="true">⭐</span>' : '') +
        '<span class="bw-seat-ic" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="bw-seat-txt">' +
          '<span class="bw-seat-t">' + esc(s.label) + '</span>' +
          '<span class="bw-seat-s">' + esc(sub) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
    return '<div class="bw-rail">' +
        '<div class="bw-rail-lbl">Your ballot · ' + list.length + ' seats</div>' +
        '<div class="bw-seats" role="list">' + chips + '</div>' +
      '</div>';
  }

  // ── The seat head: who holds it, and what you decided ─────────────────────
  function holderFact(seat, r, gate) {
    var hold = holdersFor(seat.key, r);
    var named = hold.filter(function (lv) { return lv.pid && personOf(lv.pid); });
    if (named.length) {
      var who = named.map(function (lv) {
        return '<b><button type="button" class="bw-cand-name" style="font-size:0.8rem;"' +
          ' onclick="if(window.showProfile)window.showProfile(\'' + jsq(lv.pid) + '\')"' +
          ' aria-label="Open ' + esc(nameOf(lv.pid)) + '’s full record">' + esc(nameOf(lv.pid)) + '</button></b>';
      }).join(' · ');
      return '<span class="bw-fact"><span aria-hidden="true">\u{1F3DB}</span>' +
        '<span>Holds this seat now: ' + who + '</span></span>';
    }
    if (gate === 'district') {
      return '<span class="bw-fact"><span aria-hidden="true">\u{1F5FA}</span>' +
        '<span>District not mapped for your area</span></span>';
    }
    if (seat.key === 'local') {
      var cov = localCov();
      var n = (cov && cov.pids && cov.pids.length) || 0;
      if (cov && cov.resolved && cov.ok && n) {
        return '<span class="bw-fact"><span aria-hidden="true">\u{1F3D9}</span>' +
          '<span><b>' + n + '</b> local seat' + (n === 1 ? '' : 's') + ' on file for ' + esc(cov.area || 'your area') + '</span></span>';
      }
      return '';
    }
    return '<span class="bw-fact"><span aria-hidden="true">\u{1F3DB}</span>' +
      '<span>No record on file for the current holder</span></span>';
  }

  function pickFact(seat) {
    var pid = pickedFor(seat.key);
    if (!pid) {
      return '<span class="bw-fact"><span aria-hidden="true">☆</span><span>No pick yet for this seat</span></span>';
    }
    return '<span class="bw-fact is-team"><span aria-hidden="true">⭐</span>' +
      '<span>On your team: <b>' + esc(nameOf(pid)) + '</b></span></span>';
  }

  function scopeFact(seat) {
    var R = rs();
    var sc = '';
    if (R && typeof R._scope === 'function') { try { sc = R._scope(seat.key) || ''; } catch (e) { sc = ''; } }
    if (!sc) return '';
    return '<span class="bw-fact"><span aria-hidden="true">\u{1F4CD}</span><span>' + esc(sc) + '</span></span>';
  }

  // ── The ruler line ────────────────────────────────────────────────────────
  // Two sentences, and the second one is the load-bearing half: it names what is
  // NOT ordering the field. A reader who has set no positions is told what would
  // change if they did, once, with one destination — not lectured.
  // `scored` is how many candidates the record lane could actually place. It is
  // passed in rather than inferred, because the difference between "ordered by
  // the record" and "listed, because the record could not order it" is the
  // difference between a true sentence and a flattering one. Having positions is
  // not the same as the field having a record to read against them: a seat can
  // have five issues on the axis and nobody on file who ever acted on any of
  // them, and in that case the visible order is officeholder-then-alphabetical.
  // Saying "ordered by their formal record" over that order would manufacture a
  // ranking out of nothing, which is exactly the thin-data claim this surface
  // exists to refuse.
  function rulerHtml(n, hasIssues, scored) {
    if (n < 2) return '';
    if (!hasIssues) {
      return '<p class="bw-ruler">This field is <b>not ranked</b> — ranking it needs your own positions. ' +
        'It is listed with the officeholder first, then alphabetically.' +
        '<span class="bw-ruler-alt"><button type="button" class="bw-cand-name" style="font-size:0.72rem;"' +
        ' onclick="if(window.PDXStances&&window.PDXStances.open)window.PDXStances.open();else location.hash=\'#my-stances\';">' +
        'Set your positions to rank this seat ›</button></span></p>';
    }
    if (!scored) {
      return '<p class="bw-ruler">Your positions are set, but <b>no one in this field has a formal record</b> ' +
        'on them yet — so there is nothing to order them by. It is listed with the officeholder first, ' +
        'then alphabetically.' +
        '<span class="bw-ruler-alt">Direction Match is shown under each name where it exists, and it orders ' +
        'nothing. Party is never read here.</span></p>';
    }
    if (scored < n) {
      return '<p class="bw-ruler"><b>' + scored + ' of ' + n + '</b> ordered by <b>their formal record</b> — ' +
        'votes and formal actions against the positions you set. The rest have no readable record on your ' +
        'issues yet, and are listed after them, not ranked among them.' +
        '<span class="bw-ruler-alt">Not by party, which is never read here, and not by Direction Match, ' +
        'which is shown under each name and orders nothing.</span></p>';
    }
    return '<p class="bw-ruler">Ordered by <b>their formal record</b> — votes and formal actions against the positions you set.' +
      '<span class="bw-ruler-alt">Not by party, which is never read here, and not by Direction Match, ' +
      'which is shown under each name and orders nothing.</span></p>';
  }

  // ── Where these records part company ──────────────────────────────────────
  // Counts of rows from the formal-pattern index, lifted whole out of
  // _snapshot's own tally. No average, no share, no score, and nothing here
  // moves a candidate up or down.
  function divergeHtml(all) {
    var R = rs();
    if (!R || typeof R._snapshot !== 'function' || all.length < 2) return '';
    var snap = null;
    try { snap = R._snapshot(all); } catch (e) { return ''; }
    var t = snap && snap.tally;
    if (!t || !t.n) return '';
    var bits = [];
    if (t.diverge) {
      bits.push('<b class="bw-d-hot">' + t.diverge + '</b> where the records point <b>different ways</b>' +
        (t.keys && t.keys.length
          ? ' <span class="bw-d-keys">(' + t.keys.slice(0, 4).map(function (r) { return esc(r.label); }).join(', ') + ')</span>'
          : ''));
    }
    if (t.align) bits.push('<b>' + t.align + '</b> where every readable record went the same way');
    if (t.one) bits.push('<b>' + t.one + '</b> where only one of them has a readable direction');
    if (t.quiet) bits.push('<b>' + t.quiet + '</b> with no direction on file for anyone yet');
    if (!bits.length) return '';
    return '<p class="bw-diverge">Of <b>' + t.n + '</b> shared issue' + (t.n === 1 ? '' : 's') +
      ' with a formal file behind them: ' + bits.join(' · ') + '.</p>';
  }

  // ── One candidate row ─────────────────────────────────────────────────────
  function scoreColor(s) {
    try { if (fn('_alignScoreColor')) return window._alignScoreColor(s); } catch (e) {}
    return s >= 70 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171';
  }

  // Direction Match, read from the slot that owns the publishable floor. `pct` is
  // null on every branch the ledger has not published and `tested` rides with it,
  // so there is no shape here where a figure prints without its denominator — and
  // no branch where this line becomes a sort key.
  function dmLine(c) {
    var R = rs();
    if (!R || typeof R._dm !== 'function') return '';
    var d = null;
    try { d = R._dm(c); } catch (e) { return ''; }
    if (!d || (!d.sub && d.pct === null)) return '';
    var num = (typeof d.pct === 'number')
      ? ' · <b>' + d.pct + '%</b> of ' + (d.tested || 0) + ' tested'
      : '';
    return '<span class="bw-dm" title="Direction Match asks whether this person kept their OWN word — their stated positions against their own formal record. It is not a match to you, and it does not order this field.">' +
      '<span class="bw-dm-k" aria-hidden="true">⚖️</span> Direction Match · did they keep their own word: ' +
      esc(d.sub || '') + num + '</span>';
  }

  function candHtml(c, i, rk, picked, banded, hasIssues) {
    var mine = picked === c.pid;
    var head;
    if (banded) {
      // The number slot carries a REASON, never a placeholder percentage. Which
      // reason depends on a fact about them, not about the lane: a candidate with
      // votes on the reader's issues that the pattern engine would not
      // characterise has a file, and saying "no formal record" over it would be
      // false.
      head = '<span class="bw-score"><span class="bw-score-dash" aria-hidden="true">—</span>' +
        '<span class="bw-score-l">no score</span></span>';
    } else {
      var col = scoreColor(c.score);
      head = '<span class="bw-score">' +
        '<span class="bw-score-n" style="color:' + col + ';">' + c.score + '<i>%</i></span>' +
        '<span class="bw-score-l">record</span></span>';
    }
    // The gap word belongs to a candidate the ACTIVE LANE could not score, and it
    // is a claim about them — so it is only printed where there is a lane doing
    // the scoring. With no positions set, nobody has a number, the ruler line
    // above has already said why once, and repeating that sentence on every row
    // turns one honest explanation into the stack of nags this pass removed.
    var gapWord = (banded && hasIssues)
      ? '<span class="bw-gapword">' + (
          c.filed ? 'Formal file on your issues · no readable direction yet'
                  : 'No formal record on your issues yet'
        ) + '</span>'
      : '';
    var tags = '';
    if (c.incumbent) tags += '<span class="bw-tag is-inc">Holds this seat</span>';
    if (mine) tags += '<span class="bw-tag is-mine">⭐ On your team</span>';

    var lbl = mine ? '✓ On my team' : (picked ? 'Replace my pick' : '➕ Add to my team');
    var aria = mine ? 'Remove ' + c.name + ' from your voting team'
      : (picked ? 'Replace your pick for this seat with ' + c.name
                : 'Add ' + c.name + ' to your voting team');

    return '<li class="bw-cand' + (mine ? ' is-mine' : '') + (banded ? ' is-gap' : '') + '">' +
      head +
      '<span class="bw-cand-who">' +
        '<button type="button" class="bw-cand-name"' +
          ' onclick="if(window.showProfile)window.showProfile(\'' + jsq(c.pid) + '\')"' +
          ' aria-label="Open ' + esc(c.name) + '’s full record">' + esc(c.name) + '</button>' +
        (tags ? '<span class="bw-cand-tags">' + tags + '</span>' : '') +
        gapWord +
        dmLine(c) +
      '</span>' +
      '<span class="bw-cand-act">' +
        '<button type="button" class="bw-pick' + (mine ? ' is-on' : '') + '"' +
          ' onclick="window.pdxBallotWorkspacePick(\'' + jsq(rk) + '\',\'' + jsq(c.pid) + '\')"' +
          ' aria-label="' + esc(aria) + '">' + lbl + '</button>' +
      '</span>' +
    '</li>';
  }

  // ── The honest states ─────────────────────────────────────────────────────
  function honest(kind, seat, r) {
    if (kind === 'district') {
      return '<div class="bw-honest">' +
        '<p><b>Your ' + esc(seat.label) + ' district isn’t mapped for your area yet.</b></p>' +
        '<p>This seat is real and you will vote in it. PolitiDex draws district lines for Utah only, ' +
        'so outside it there is no honest way to say which district you are in — and a field ' +
        'for the wrong district is worse than no field at all.</p>' +
        '<p>The statewide seats on this ballot resolve from your state alone, so they are ready now.</p>' +
      '</div>';
    }
    if (kind === 'localgap') {
      var cov = localCov();
      return '<div class="bw-honest">' +
        '<p><b>Local offices aren’t mapped for ' + esc((cov && cov.area) || 'your area') + ' yet.</b></p>' +
        '<p>Mayor, city council, school board and county seats are curated area by area, and this ' +
        'one isn’t done. We would rather tell you that than hand you a list of people who ' +
        'do not represent you.</p>' +
      '</div>';
    }
    if (kind === 'empty') {
      return '<div class="bw-honest">' +
        '<p><b>Nobody is on file for this seat yet.</b></p>' +
        '<p>That is a gap in what PolitiDex holds, not a finding about the race. ' +
        'What would fill it: a certified filing for this cycle, or a formal record for someone ' +
        'already in the office.</p>' +
        '<p>Other seats on your ballot may already have a field — the rail keeps your place.</p>' +
      '</div>';
    }
    if (kind === 'one') {
      return '<div class="bw-honest">' +
        '<p><b>Only one person is on file for this seat so far</b> — so there is no field to compare.</p>' +
        '<p>A field of one is not a finding about the seat. It means nobody else has a certified ' +
        'filing here yet. Their own record still stands on its own, and you can still pick them.</p>' +
      '</div>';
    }
    return '';
  }

  // ── The desk: one seat, whole ─────────────────────────────────────────────
  function nextUndecided(list, fromKey) {
    var i = 0;
    list.forEach(function (s, n) { if (s.key === fromKey) i = n; });
    for (var step = 1; step <= list.length; step++) {
      var s = list[(i + step) % list.length];
      if (!pickedFor(s.key)) return s;
    }
    return null;
  }

  function footHtml(seat, list, canCompare) {
    var nx = nextUndecided(list, seat.key);
    var bits = '';
    if (canCompare) {
      bits += '<button type="button" class="bw-go is-lead"' +
        ' onclick="window.pdxOpenRaceSheet&&window.pdxOpenRaceSheet(\'' + jsq(seat.key) + '\')"' +
        ' aria-label="Open the full side-by-side comparison for ' + esc(seat.label) + '">' +
        '<span aria-hidden="true">⚖️</span> Full side-by-side</button>';
    }
    bits += '<button type="button" class="bw-go"' +
      ' onclick="(window.openLocationModal||window.toggleChangeLocation||function(){})()">' +
      '<span aria-hidden="true">\u{1F4CD}</span> Change location</button>';
    if (nx) {
      bits += '<button type="button" class="bw-go is-next"' +
        ' onclick="window.pdxBallotWorkspaceOpen(\'' + jsq(nx.key) + '\')"' +
        ' aria-label="Move to your next undecided seat: ' + esc(nx.label) + '">' +
        'Next seat · ' + esc(nx.label) + ' <span aria-hidden="true">›</span></button>';
    } else {
      bits += '<button type="button" class="bw-go is-next"' +
        ' onclick="var e=document.getElementById(\'my-politicians\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});"' +
        ' aria-label="Every seat has a pick — review your full team">' +
        'Every seat decided · review my team <span aria-hidden="true">›</span></button>';
    }
    return '<div class="bw-foot">' + bits + '</div>';
  }

  function deskHtml(seat, list, r) {
    var gate = fieldGate(seat, r);
    var all = (gate === 'ok') ? fieldFor(seat.key) : [];
    var hasIssues = axisN() > 0;
    var picked = pickedFor(seat.key);

    var body = '';
    var canCompare = false;
    if (gate !== 'ok') {
      body = honest(gate, seat, r);
    } else if (!all.length) {
      body = honest('empty', seat, r);
    } else {
      var R = rs();
      var ranked = { ranked: [], gap: all, unranked: true };
      if (R && typeof R._rank === 'function') {
        try { ranked = R._rank(all, 'record', hasIssues); } catch (e) {}
      }
      var rows = '';
      (ranked.ranked || []).forEach(function (c, i) {
        rows += candHtml(c, i, seat.key, picked, false, hasIssues);
      });
      (ranked.gap || []).forEach(function (c, i) {
        rows += candHtml(c, i, seat.key, picked, true, hasIssues);
      });
      body =
        (all.length === 1 ? honest('one', seat, r) : '') +
        rulerHtml(all.length, hasIssues, (ranked.ranked || []).length) +
        divergeHtml(all) +
        '<ul class="bw-field">' + rows + '</ul>';
      canCompare = true;
    }

    var facts = scopeFact(seat) + holderFact(seat, r, gate) + pickFact(seat);
    return '<div class="bw-desk">' +
        '<div class="bw-deskhd">' +
          '<span class="bw-deskhd-ic" style="--bw-accent:' + esc(seat.color) + ';" aria-hidden="true">' + seat.icon + '</span>' +
          '<div style="min-width:0;">' +
            '<h4 class="bw-deskhd-t">' + esc(seat.label) + '</h4>' +
            '<p class="bw-deskhd-s">Compare the field on the formal record, then pick for your team.</p>' +
          '</div>' +
        '</div>' +
        '<div class="bw-facts">' + facts + '</div>' +
        body +
        footHtml(seat, list, canCompare) +
      '</div>';
  }

  // ── Not located yet ───────────────────────────────────────────────────────
  function locateHtml() {
    return '<div class="bw-locate">' +
      '<div class="bw-eyebrow">Your ballot workspace</div>' +
      '<h3 class="bw-title">One seat at a time</h3>' +
      '<p>Set where you vote and this becomes <b>your</b> ballot — every seat on it, the field ' +
      'for each one on the formal record, and your pick saved as you go.</p>' +
      '<button type="button" class="bw-go is-lead"' +
        ' onclick="(window.openLocationModal||window.toggleChangeLocation||function(){})()">' +
        '<span aria-hidden="true">\u{1F4CD}</span> Set my location</button>' +
    '</div>';
  }

  // ── Paint ─────────────────────────────────────────────────────────────────
  function readOpen(list) {
    var k = '';
    try { k = sessionStorage.getItem(OPEN_KEY) || ''; } catch (e) { k = ''; }
    var ok = false;
    list.forEach(function (s) { if (s.key === k) ok = true; });
    if (ok) return k;
    // Default: the first seat still waiting on a decision. That is the seat the
    // reader came here to work; opening on a decided one would make the first
    // thing they see a job already done.
    for (var i = 0; i < list.length; i++) { if (!pickedFor(list[i].key)) return list[i].key; }
    return list.length ? list[0].key : '';
  }
  function writeOpen(k) {
    try { sessionStorage.setItem(OPEN_KEY, String(k || '')); } catch (e) {}
  }

  // The brochure flag. Set from the same located read the workspace paints from,
  // so the hub's opening pitch and the workspace can never disagree about which
  // state the reader is in. CSS does the hiding; the markup is untouched.
  function markHub(working) {
    var hub = document.getElementById(HUB_ID);
    if (!hub) return;
    try {
      if (working) hub.setAttribute('data-bw-working', '1');
      else hub.removeAttribute('data-bw-working');
    } catch (e) {}
  }

  function sync() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    var host = document.getElementById(BODY_ID);
    if (!host) return;
    var r = reps();
    var list = seats();

    if (!located(r)) {
      markHub(false);
      host.innerHTML = locateHtml();
      try { mount.removeAttribute('data-located'); } catch (e) {}
      return;
    }

    markHub(true);
    var openKey = readOpen(list);
    var seat = null;
    list.forEach(function (s) { if (s.key === openKey) seat = s; });
    if (!seat) seat = list[0];

    var decided = 0;
    list.forEach(function (s) { if (pickedFor(s.key)) decided++; });
    var pct = list.length ? Math.round((decided / list.length) * 100) : 0;
    var area = r.area ? esc(r.area) : '';

    host.innerHTML =
      '<div class="bw-hd">' +
        '<div class="bw-eyebrow">Your ballot workspace' + (area ? ' · ' + area : '') + '</div>' +
        '<h3 class="bw-title">Work your ballot, one seat at a time</h3>' +
        '<p class="bw-sub">Every seat is below. Open one, read the field on <b>the formal record</b>, ' +
        'pick who earns it, move on. Your picks save as you go.</p>' +
        '<div class="bw-prog">' +
          '<span class="bw-prog-n">' + decided + '<small>/' + list.length + '</small></span>' +
          '<span class="bw-prog-bar"><i style="width:' + pct + '%;"></i></span>' +
          '<span class="bw-prog-lbl">seat' + (decided === 1 ? '' : 's') + ' decided</span>' +
        '</div>' +
      '</div>' +
      '<div class="bw-body">' + railHtml(list, seat ? seat.key : '') +
        (seat ? deskHtml(seat, list, r) : '') + '</div>';
    try { mount.setAttribute('data-located', '1'); } catch (e) {}
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  // Opening a seat repaints in place and never navigates. That is the whole
  // point: the loop's second step used to be a full-screen overlay and its
  // fourth step used to be two thousand lines down the document.
  window.pdxBallotWorkspaceOpen = function (seatKey) {
    var list = seats(), hit = null;
    var R = rs();
    var want = String(seatKey || '');
    if (R && typeof R._seat === 'function') {
      try { var sm = R._seat(want); if (sm) want = sm.key; } catch (e) {}
    }
    list.forEach(function (s) { if (s.key === want) hit = s; });
    if (!hit) return false;
    writeOpen(hit.key);
    sync();
    var mount = document.getElementById(MOUNT_ID);
    if (mount && mount.scrollIntoView) {
      try { mount.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { mount.scrollIntoView(true); }
    }
    return true;
  };

  // One writer for picks, app-wide. ballotPickCard mirrors into the membership
  // store and repaints every other host, which is what makes a pick made here
  // read as "On Team" on a profile, in the team builder and on the seat list.
  window.pdxBallotWorkspacePick = function (rk, pid) {
    try { if (fn('ballotPickCard')) window.ballotPickCard(rk, pid); } catch (e) {}
    sync();
  };

  window.pdxBallotWorkspaceNext = function () {
    var list = seats();
    var nx = nextUndecided(list, readOpen(list));
    if (nx) return window.pdxBallotWorkspaceOpen(nx.key);
    return false;
  };

  window.PDXBallotWorkspace = {
    sync: sync,
    open: window.pdxBallotWorkspaceOpen,
    next: window.pdxBallotWorkspaceNext,
    // Exposed for the harness: the seat list, the gate that decides whether a
    // seat may show a field, and the running count. Pure reads.
    _seats: seats, _gate: fieldGate, _picked: pickedFor,
    _decided: function () {
      var n = 0; seats().forEach(function (s) { if (pickedFor(s.key)) n++; }); return n;
    }
  };

  // ── Staying in step with everything that can change what this shows ───────
  // Three writers upstream can invalidate this surface: a pick (anywhere), a
  // location change, and the visitor's own positions changing what the record
  // lane can score. Each already announces itself by calling a function; this
  // wraps those functions rather than polling, and each wrapper is idempotent
  // and marked, so a double boot cannot stack two of them.
  function wrap(name, flag) {
    if (!fn(name) || window[name][flag]) return;
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
    wrap('ballotPickCard', '__bwPick');
    wrap('_updateTeamPositionsForLocation', '__bwLoc');
    wrap('_pdxRaceSheetRefresh', '__bwRefresh');
  }

  function boot() {
    hook();
    sync();
    // The upstream modules this reads are a mix of plain and deferred scripts, so
    // the first paint can legitimately land before the resolver or the roster is
    // ready. Same settle schedule the seat list uses, for the same reason.
    [400, 1200, 3000].forEach(function (ms) {
      setTimeout(function () { hook(); sync(); }, ms);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
