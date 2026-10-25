/* ═══════════════════════════════════════════════════════════════════════════
   oh-ballot-2026.js — Ohio's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina and Michigan files set. This file holds the Ohio House and Ohio
   Senate races Ohio's own reporting names as contested on the November 3,
   2026 general-election ballot, with a sitting member running, and the formal
   acts on file for the people in them. It is not a roster: every incumbent it
   names by pid already has a record in cmp-data.js, and those records are not
   touched.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (Thomas West,
   House District 49 in 2017–2022) is keyed here by name, not pid: the acts
   are listed under the name and no file is linked, because a file would be a
   new roster row. A challenger with no legislative record is named, with
   party, and "No formal act on file".

   LEFT OUT, AND WHY. Open seats (Senate 13 and 27, House 31, 35 and 52) have
   no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the bill's
   Votes page on the Ohio General Assembly's own site (legislature.ohio.gov),
   which each act links to; the measure links to its bill page. A member
   listed neither yea nor nay on a vote has no act on it. Nothing here is a
   score, a tally of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   short title on legislature.ohio.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other four states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/oh — mounted into #pdx-oh-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXOhBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Ohio';
  var LEG = 'https://www.legislature.ohio.gov/legislation/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'HB 335': {
      title: 'County budget commissions, property and sales tax', status: 'law', act: 'Signed December 19, 2025', session: '136th General Assembly',
      effect: 'Changed the rules for county budget commissions, property and sales taxes, and related funds.',
      from: 'Short title: “Regards county budget commissions, property and sales tax, funds”',
      source: LEG + '136/hb335'
    },
    'HB 96': {
      title: 'State operating budget, FY 2026–27', status: 'law', act: 'Signed June 30, 2025', session: '136th General Assembly',
      effect: 'Made state operating appropriations for fiscal years 2026–27.',
      from: 'Short title: “Make state operating appropriations for FY 2026-27”',
      source: LEG + '136/hb96'
    },
    'SB 1': {
      title: 'Advance Ohio Higher Education Act', status: 'law', act: 'Signed March 28, 2025', session: '136th General Assembly',
      effect: 'Enacted the Advance Ohio Higher Education Act.',
      from: 'Short title: “Enact Advance Ohio Higher Education Act”',
      source: LEG + '136/sb1'
    },
    'HB 128': {
      title: 'Electric utility law; partial repeal of HB 6', status: 'law', act: 'Signed March 31, 2021', session: '134th General Assembly',
      effect: 'Revised electric utility service law and repealed portions of House Bill 6.',
      from: 'Short title: “Revise electric utility service law; repeal portions of HB 6”',
      source: LEG + '134/hb128'
    },
    'SB 22': {
      title: 'Legislative oversight of health orders', status: 'law', act: 'Enacted over the governor’s veto, March 24, 2021', session: '134th General Assembly',
      effect: 'Established legislative oversight over the governor’s and health orders.',
      from: 'Short title: “Establish legislative oversight over Governor\'s and health orders”',
      source: LEG + '134/sb22'
    },
    'HB 6': {
      title: 'Ohio Clean Air Program', status: 'law', act: 'Signed July 23, 2019', session: '133rd General Assembly',
      effect: 'Created the Ohio Clean Air Program.',
      from: 'Short title: “Creates Ohio Clean Air Program”',
      source: LEG + '133/hb6'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, the bill's Votes page (assembly/bill),
  //  { pid or @name-key: 'Yea' | 'Nay' }]
  var ACTS = [
    ['HB 335', 'Senate passage', '2025-11-19', '136/hb335', { timken_oh: 'Yea' }],
    ['HB 335', 'House concurrence', '2025-11-19', '136/hb335',
      { sigrist_oh: 'Yea', dovilla_oh: 'Yea', andrea_white_oh: 'Yea', lorenz_oh: 'Yea' }],
    ['HB 96', 'House final passage', '2025-06-25', '136/hb96',
      { sigrist_oh: 'Nay', dovilla_oh: 'Yea', andrea_white_oh: 'Yea', lorenz_oh: 'Yea' }],
    ['HB 96', 'Senate final passage', '2025-06-25', '136/hb96', { timken_oh: 'Yea' }],
    ['SB 1', 'Senate concurrence', '2025-03-26', '136/sb1', { timken_oh: 'Yea' }],
    ['SB 1', 'House passage', '2025-03-19', '136/sb1',
      { sigrist_oh: 'Nay', dovilla_oh: 'Yea', andrea_white_oh: 'Yea', lorenz_oh: 'Yea' }],
    // 134th: West held House District 49; White was in the House.
    ['HB 128', 'House concurrence', '2021-03-25', '134/hb128', { andrea_white_oh: 'Yea', '@west': 'Yea' }],
    ['SB 22', 'House veto override', '2021-03-24', '134/sb22', { andrea_white_oh: 'Nay', '@west': 'Nay' }],
    // 133rd.
    ['HB 6', 'House concurrence', '2019-07-23', '133/hb6', { '@west': 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every Ohio House seat and half the Ohio Senate is on the 2026 ballot;
  // these are the seats Ohio reporting names as contested, with a sitting
  // member running and both names given.
  var SNB = 'https://www.statenews.org/government-politics/2026-10-16/ohio-statehouse-races-which-races-are-close-this-cycle';
  var CPA = 'https://ohiocpa.com/for-the-public/news/2026/07/10/twenty-legislative-races-to-watch-for-the-137th-general-assembly';
  var RACES = [
    { chamber: 'statesenate', district: 29, where: 'Stark County', source: CPA, field: [
      { name: 'Jane M. Timken', party: 'R', pid: 'timken_oh', incumbent: true, note: 'Appointed in 2025' },
      { name: 'Thomas West', party: 'D', key: '@west', note: 'Former State Representative, House District 49 (2017–2022)' }] },
    { chamber: 'statehouse', district: 10, where: 'Franklin County', source: SNB, field: [
      { name: 'Mark Sigrist', party: 'D', pid: 'sigrist_oh', incumbent: true },
      { name: 'Denise D’Angelo', party: 'R', note: 'South-Western City Schools board member' }] },
    { chamber: 'statehouse', district: 17, where: 'Southern Cuyahoga County', source: SNB, field: [
      { name: 'Michael D. Dovilla', party: 'R', pid: 'dovilla_oh', incumbent: true },
      { name: 'Megan Coy', party: 'D', note: 'City council member' }] },
    { chamber: 'statehouse', district: 36, where: 'Montgomery County, near Dayton', source: SNB, field: [
      { name: 'Andrea White', party: 'R', pid: 'andrea_white_oh', incumbent: true },
      { name: 'Rose Lounsbury', party: 'D' }] },
    { chamber: 'statehouse', district: 60, where: 'Southern Delaware County', source: SNB, field: [
      { name: 'Brian Lorenz', party: 'R', pid: 'lorenz_oh', incumbent: true },
      { name: 'Shelby Kimball', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'oh-' + chamber + '-' + num(district); }
  var BY_SEAT = {};
  RACES.forEach(function (r) { r.seat = seatKey(r.chamber, r.district); BY_SEAT[r.seat] = r; });

  function race(chamber, district) { return BY_SEAT[seatKey(chamber, district)] || null; }
  function raceForPid(pid) {
    for (var i = 0; i < RACES.length; i++) {
      for (var j = 0; j < RACES[i].field.length; j++) if (RACES[i].field[j].pid === pid) return RACES[i];
    }
    return null;
  }
  // Every act on file for one pid (or @name key), newest first.
  function actsFor(who) {
    var out = [];
    ACTS.forEach(function (a) {
      var how = a[4][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: '', source: LEG + a[3] + '/votes', how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Ohio elects every House seat, and its odd-numbered Senate seats, in 2026.
  function onBallot2026(chamber, district) {
    return num(district) > 0 && (chamber === 'statehouse' || (chamber === 'statesenate' && num(district) % 2 === 1));
  }

  // ── PAINT HELPERS ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function day(iso) {
    var p = String(iso).split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }
  function personHref(pid) {
    var PL = root.PDXPersonLink;
    try { if (PL && typeof PL.href === 'function') { var h = PL.href(pid); if (h) return h; } } catch (e) {}
    return '/p/' + encodeURIComponent(pid);
  }
  function personAttrs(pid) {
    var PL = root.PDXPersonLink;
    try { if (PL && typeof PL.attrs === 'function') { var a = PL.attrs(pid); if (a) return a; } } catch (e) {}
    return 'href="' + esc(personHref(pid)) + '"';
  }
  function boardPath(seat) {
    var V = root.PDXVoice;
    try { return (V && typeof V.boardPath === 'function') ? (V.boardPath(seat) || '') : ''; } catch (e) { return ''; }
  }
  function actHtml(a) {
    return '<li class="pdxpa-act">' +
      '<p class="pdxpa-act-hd"><a href="' + esc(a.billSource) + '" target="_blank" rel="noopener">' + esc(a.measure) + '</a> ' +
        '<span class="pdxpa-act-title">' + esc(a.title) + '</span></p>' +
      '<p class="pdxpa-act-how"><a href="' + esc(a.source) + '" target="_blank" rel="noopener">' +
        esc(a.how) + ' · ' + esc(a.what) + ' · ' + esc(day(a.date)) + '</a>' +
        (a.law ? ' · ' + esc(a.law) : '') + '</p>' +
      '<p class="pdxpa-effect">' + esc(a.effect) + '</p>' +
    '</li>';
  }

  // ── MOUNT 1: one act under a sitting member's row ─────────────────────────
  function seatActHtml(pid, level) {
    var acts = actsFor(pid);
    if (!acts.length) return '';
    var r = level ? race(level.key || level.seat, level.district) : null;
    if (r && !r.field.some(function (c) { return c.pid === pid; })) r = null;
    return '<div class="pdxpa-seat" data-pdxoh-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/oh">This seat is on your ' + esc(ELECTION) +
        ' ballot — see every name in the race ›</a></p>' : '') +
    '</div>';
  }

  // ── MOUNT 2: the ballot view ──────────────────────────────────────────────
  function candidateHtml(c) {
    var acts = actsFor(c.pid || c.key || '');
    var name = c.pid
      ? '<a class="pdxpa-name" ' + personAttrs(c.pid) + '>' + esc(c.name) + '</a>'
      : '<span class="pdxpa-name">' + esc(c.name) + '</span>';
    var meta = [c.incumbent ? 'Incumbent' : 'Challenger'];
    if (c.note) meta.push(c.note);
    return '<li class="pdxpa-cand" data-pdxoh-cand="' + esc(c.pid || c.key || '') + '">' +
      '<p class="pdxpa-cand-hd">' + name + ' <span class="pdxpa-party">(' + esc(c.party) + ')</span></p>' +
      '<p class="pdxpa-cand-meta">' + esc(meta.join(' · ')) + '</p>' +
      (acts.length
        ? '<ul class="pdxpa-acts">' + acts.map(actHtml).join('') + '</ul>' +
          (c.pid ? '<p class="pdxpa-file"><a ' + personAttrs(c.pid) + '>Open ' + esc(c.name) + '’s file ›</a></p>' : '')
        : '<p class="pdxpa-none">No formal act on file. PolitiDex holds no legislative record for this candidate.</p>') +
    '</li>';
  }
  function raceHtml(r) {
    var board = boardPath(r.seat);
    return '<section class="pdxpa-race" data-pdxoh-seat="' + esc(r.seat) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(r.chamber, r.district)) +
        ' <span class="pdxpa-where">' + esc(r.where) + '</span></h2>' +
      (r.issue ? '<p class="pdxpa-issue"><strong>Local issue:</strong> ' + esc(r.issue) + '</p>' : '') +
      '<ul class="pdxpa-field">' + r.field.map(candidateHtml).join('') + '</ul>' +
      '<p class="pdxpa-race-foot">' +
        (board ? '<a class="pdxpa-board" href="' + esc(board) + '">Open this seat’s District Voice board ›</a> · ' : '') +
        '<a href="' + esc(r.source) + '" target="_blank" rel="noopener">Who is running: source</a></p>' +
    '</section>';
  }
  function quietSeatHtml(lv) {
    var CD = root.CMP_DATA || root.PROFILES || {};
    var who = lv.pid && CD[lv.pid] ? CD[lv.pid].name : '';
    var acts = lv.pid ? actsFor(lv.pid) : [];
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxoh-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: Ohio elects this Senate seat in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set an Ohio address in the ' +
        '<a href="/find">district finder</a> and this page lists the State House and State Senate races on your ' +
        esc(ELECTION) + ' ballot, with each candidate’s formal record.</p>' +
        '<h2 class="pdxpa-all-hd">Contested seats on file</h2>' +
        '<ul class="pdxpa-all">' + RACES.map(function (r) {
          return '<li>' + esc(seatLabel(r.chamber, r.district)) + ' · ' + esc(r.where) + ' · ' +
            esc(r.field.map(function (c) { return c.name; }).join(' vs. ')) + '</li>';
        }).join('') + '</ul>';
    }
    var levels = (reps.levels || []).filter(function (l) {
      return (l.key === 'statesenate' || l.key === 'statehouse') && num(l.district);
    });
    if (!levels.length) {
      return '<p class="pdxpa-lede">Your saved Ohio location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the General Assembly Votes page that records it.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-oh-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxoh-boot', 'painted');
  }

  root.PDXOhBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
