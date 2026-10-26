/* ═══════════════════════════════════════════════════════════════════════════
   nc-ballot-2026.js — North Carolina's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern pa-ballot-2026.js and ga-ballot-2026.js
   set. This file holds the State House and State Senate races North
   Carolina's own reporting names as contested on the November 3, 2026
   general-election ballot, with a sitting member running, and the formal acts
   on file for the people in them. It is not a roster: every incumbent it
   names by pid already has a record in cmp-data.js, and those records are not
   touched.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (James Gailliard,
   House District 25 in 2019–2023; John Rhodes, House District 98 in
   2003–2007) is keyed here by name, not pid: the acts are listed under the
   name and no file is linked, because a file would be a new roster row. A
   challenger with no legislative record is named, with party, and "No formal
   act on file".

   LEFT OUT, AND WHY. State Senate 1 is contested, but its sitting member was
   appointed after the chamber's last recorded vote of the session and has no
   formal act on file; a race whose incumbent has no record is not opened
   here. Open seats (House 20, Senate 34) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the North
   Carolina General Assembly's own roll-call transcript (ncleg.gov), which
   each act links to; the measure links to its bill page. A member marked
   excused or not voting has no act on that roll call and none is listed.
   Nothing here is a score, a tally of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own long
   title on ncleg.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as Pennsylvania's and Georgia's,
   sharing their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/nc — mounted into #pdx-nc-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXNcBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'North Carolina';
  var BILL = 'https://www.ncleg.gov/BillLookUp/';
  var RC = 'https://www.ncleg.gov/Legislation/Votes/RollCallVoteTranscript/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'SB 257': {
      title: '2026 Appropriations Act', status: 'law', act: 'S.L. 2026-41', session: '2025–26',
      effect: 'Made base budget appropriations for the current operations of state agencies, departments and institutions.',
      from: 'Long title: “AN ACT TO MAKE BASE BUDGET APPROPRIATIONS FOR CURRENT OPERATIONS OF STATE AGENCIES, DEPARTMENTS, AND INSTITUTIONS.”',
      source: BILL + '2025/S257'
    },
    'HB 87': {
      title: 'Educational Choice for Children Act', status: 'law', act: 'S.L. 2026-6', session: '2025–26',
      effect: 'Opted the state into the federal tax credit for gifts to scholarship granting organizations and required a published list of them.',
      from: 'Long title: “to elect the State of north carolina to participate in the federal tax credit … for contributions of individuals to certain scholarship granting organizations and to require the state education assistance authority to publish and maintain an annual list of scholarship granting organizations”',
      source: BILL + '2025/H87'
    },
    'HB 1089': {
      title: 'Constitutional amendment: property tax levy limit', status: 'law', act: 'S.L. 2026-5', session: '2025–26',
      effect: 'Proposed a constitutional amendment requiring the legislature to enact a property tax levy limit.',
      from: 'Long title: “AN ACT to amend the constitution of the state to require the legislature to enact a property tax levy limit.”',
      source: BILL + '2025/H1089'
    },
    'SB 153': {
      title: 'North Carolina Border Protection Act', status: 'law', act: 'S.L. 2026-19', session: '2025–26',
      effect: 'Required cooperation with federal immigration officials and barred UNC institutions from becoming sanctuary universities.',
      from: 'Long title: “(i) requiring cooperation with federal immigration officials … and (iv) prohibiting unc CONSTITUENT INSTITUTIONS from becoming sanctuary universities”',
      source: BILL + '2025/S153'
    },
    'HB 307': {
      title: 'Iryna’s Law', status: 'law', act: 'S.L. 2025-93', session: '2025–26',
      effect: 'Enacted Iryna’s Law, changing pretrial release conditions, magistrate suspensions and death penalty proceedings.',
      from: 'Long title: “to enact iryna’s law; TO modify the law related to pretrial release conditions; … to modify suspension of magistrates; … to modify death penalty proceedings”',
      source: BILL + '2025/H307'
    },
    'SB 266': {
      title: 'Power Bill Reduction Act', status: 'law', act: 'S.L. 2025-78', session: '2025–26',
      effect: 'Eliminated an interim carbon-reduction date for certain electric utilities and changed how they recover construction financing costs.',
      from: 'Long title: “to ELIMINATE the INTERIM DATE FOR CARBON REDUCTION BY CERTAIN ELECTRIC PUBLIC UTILITIES, to allow an alternative cost recovery mechanism for the financing costs of construction work in progress”',
      source: BILL + '2025/S266'
    },
    'HB 569': {
      title: 'GenX and PFAS in drinking water', status: 'passed', session: '2025–26',
      effect: 'Would protect North Carolina drinking water from contamination by GenX and other PFAS compounds.',
      from: 'Long title: “AN ACT TO PROTECT THE CITIZENS OF NORTH CAROLINA FROM DRINKING WATER CONTAMINATED BY GENX AND OTHER PFAS COMPOUNDS.”; passed the House only.',
      source: BILL + '2025/H569'
    },
    'SB 101': {
      title: 'Require Cooperation with ICE 2.0', status: 'failed', session: '2021–22',
      effect: 'Would have required compliance with immigration detainers and administrative warrants and certain local law enforcement reports.',
      from: 'Long title: “AN ACT to require compliance with immigration detainers and administrative warrants and to require certain reports from local law enforcement.”; vetoed July 11, 2022, never overridden.',
      source: BILL + '2021/S101'
    },
    'SB 105': {
      title: '2021 Appropriations Act', status: 'law', act: 'S.L. 2021-180', session: '2021–22',
      effect: 'Made 2021 base budget appropriations for the current operations of state agencies, departments and institutions.',
      from: 'Long title: “AN ACT to make base budget appropriations for current operations of state agencies, departments, and institutions and for other purposes.”',
      source: BILL + '2021/S105'
    },
    'HB 1023': {
      title: 'North Carolina State Lottery Act', status: 'law', act: 'S.L. 2005-344', session: '2005–06',
      effect: 'Established the North Carolina State Lottery.',
      from: 'Short title: “NORTH CAROLINA STATE LOTTERY ACT.”',
      source: BILL + '2005/H1023'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, transcript path (session/chamber/number),
  //  { pid or @name-key: 'Yea' | 'Nay' }]
  var H = ['chesser_nc', 'pare_nc', 'helfrich_nc', 'cotham_nc'];
  function all(list, how, except) {
    var o = {};
    list.forEach(function (p) { if (!except || !Object.prototype.hasOwnProperty.call(except, p)) o[p] = how; });
    if (except) for (var k in except) if (except[k]) o[k] = except[k];
    return o;
  }
  var ACTS = [
    ['SB 257', 'Senate conference report', '2026-07-02', '2025/S/672', { barnes_nc: 'Yea', michael_lee_nc: 'Yea', bradley_nc: 'Yea' }],
    ['SB 257', 'House conference report', '2026-07-02', '2025/H/783', all(H, 'Yea', { helfrich_nc: null })],
    ['SB 153', 'House veto override', '2026-06-24', '2025/H/736', all(H, 'Yea', { helfrich_nc: 'Nay' })],
    ['HB 87', 'Senate veto override', '2026-06-03', '2025/S/557', { barnes_nc: 'Yea', michael_lee_nc: 'Yea', bradley_nc: 'Nay', fatmi_nc: 'Nay' }],
    ['HB 1089', 'House third reading', '2026-05-20', '2025/H/662', all(H, 'Yea', { helfrich_nc: 'Nay' })],
    ['HB 1089', 'Senate third reading', '2026-05-20', '2025/S/548', { barnes_nc: 'Yea', michael_lee_nc: 'Yea' }],
    ['HB 87', 'House veto override', '2026-05-20', '2025/H/656', all(H, 'Yea', { helfrich_nc: 'Nay' })],
    ['HB 307', 'House concurrence', '2025-09-23', '2025/H/605', all(H, 'Yea')],
    ['HB 307', 'Senate second reading', '2025-09-22', '2025/S/485', { barnes_nc: 'Yea', michael_lee_nc: 'Yea' }],
    ['SB 153', 'Senate veto override', '2025-07-29', '2025/S/433', { barnes_nc: 'Yea', michael_lee_nc: 'Yea', bradley_nc: 'Nay' }],
    ['SB 266', 'Senate veto override', '2025-07-29', '2025/S/431', { barnes_nc: 'Yea', michael_lee_nc: 'Yea', bradley_nc: 'Nay' }],
    ['SB 266', 'House veto override', '2025-07-29', '2025/H/586', all(H, 'Yea', { helfrich_nc: 'Nay' })],
    ['HB 569', 'House second reading', '2025-05-07', '2025/H/335', all(H, 'Yea')],
    // 2021–22: Gailliard held House District 25; Paré was in the House.
    ['SB 101', 'House second reading', '2022-06-30', '2021/H/714', { pare_nc: 'Yea', '@gailliard': 'Nay' }],
    ['SB 105', 'House conference report', '2021-11-18', '2021/H/574', { pare_nc: 'Yea', '@gailliard': 'Yea' }],
    // 2005–06: Rhodes held House District 98.
    ['HB 1023', 'House second reading', '2005-04-06', '2005/H/107', { '@rhodes': 'Nay' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every State House and State Senate seat is on North Carolina's 2026
  // ballot; these are the ones North Carolina reporting names as contested,
  // with a sitting member running and both names given.
  var NSJ = 'https://nsjonline.com/article/2026/10/nc-senate-races-to-watch/';
  var CPP = 'https://carolinapublicpress.org/82653/keeping-an-eye-on-2-close-nc-legislative-2026-races-in-new-hanover-county/';
  var RMT = 'https://www.rockymounttelegram.com/news/local/wilkins-wants-a-fall-rematch-with-chesser/article_fe12fdc5-e0e0-4371-970e-bb99bbc7151f.html';
  var HSU = 'https://www.hollyspringsupdate.com/p/winn-decker-wins-democratic-primary';
  var WFAE = 'https://www.wfae.org/2026-09-22/n-c-house-of-representatives-98';
  var WCNC = 'https://www.wcnc.com/article/news/politics/elections/north-carolina-house-district-105-midterm-election-preview-tricia-cotham-ken-mccool/275-79886836-db3f-4739-85c3-895dad7de3e0';
  // FILED: the State Board of Elections' candidate list for the 2026 cycle,
  // read at its November 3 rows (the general-election ballot, not the March
  // primary). A race with `filed` lists every name on it.
  var SBE = 'https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/Candidate_Listing_2026.csv';
  var RACES = [
    { chamber: 'statesenate', district: 7, where: 'New Hanover County', source: CPP,
      issue: 'GenX and PFAS water contamination from the Chemours plant, utility cost recovery and the property tax levy limit amendment.',
      field: [
        { name: 'Michael Lee', party: 'R', pid: 'michael_lee_nc', incumbent: true },
        { name: 'Jessica Bichler', party: 'D' }] },
    { chamber: 'statesenate', district: 11, where: 'Franklin, Nash and Vance counties', source: NSJ, filed: SBE, field: [
      { name: 'Lisa S. Barnes', party: 'R', pid: 'barnes_nc', incumbent: true },
      { name: 'James Gailliard', party: 'D', key: '@gailliard', note: 'Former State Representative, House District 25 (2019–2023)' },
      { name: 'Gavin Bell', party: 'L' }] },
    { chamber: 'statesenate', district: 18, where: 'Wake County', source: NSJ, filed: SBE, field: [
      { name: 'Haseeb Fatmi', party: 'D', pid: 'fatmi_nc', incumbent: true, note: 'Appointed in 2026' },
      { name: 'Chris Stock', party: 'R' },
      { name: 'Brad Hessel', party: 'L' }] },
    { chamber: 'statesenate', district: 42, where: 'Mecklenburg County', source: NSJ, field: [
      { name: 'Woodson Bradley', party: 'D', pid: 'bradley_nc', incumbent: true },
      { name: 'Stacie McGinn', party: 'R' }] },
    { chamber: 'statehouse', district: 25, where: 'Nash County', source: RMT, field: [
      { name: 'Allen Chesser', party: 'R', pid: 'chesser_nc', incumbent: true },
      { name: 'Lorenza Wilkins', party: 'D' },
      { name: 'Nick Taylor', party: 'L' }] },
    { chamber: 'statehouse', district: 37, where: 'Wake County', source: HSU, field: [
      { name: 'Erin Paré', party: 'R', pid: 'pare_nc', incumbent: true },
      { name: 'Winn Decker', party: 'D' }] },
    { chamber: 'statehouse', district: 98, where: 'Mecklenburg County', source: WFAE, field: [
      { name: 'Beth Helfrich', party: 'D', pid: 'helfrich_nc', incumbent: true },
      { name: 'John Rhodes', party: 'R', key: '@rhodes', note: 'Former State Representative, House District 98 (2003–2007)' }] },
    { chamber: 'statehouse', district: 105, where: 'Mecklenburg County', source: WCNC, field: [
      { name: 'Tricia Ann Cotham', party: 'R', pid: 'cotham_nc', incumbent: true },
      { name: 'Ken McCool', party: 'D', note: 'Matthews Town Commissioner' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'nc-' + chamber + '-' + num(district); }
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
        vote: a[3], source: RC + a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // North Carolina elects every State House and State Senate seat every two years.
  function onBallot2026(chamber, district) {
    return (chamber === 'statehouse' || chamber === 'statesenate') && num(district) > 0;
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
    return '<div class="pdxpa-seat" data-pdxnc-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/nc">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxnc-cand="' + esc(c.pid || c.key || '') + '">' +
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
    return '<section class="pdxpa-race" data-pdxnc-seat="' + esc(r.seat) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(r.chamber, r.district)) +
        ' <span class="pdxpa-where">' + esc(r.where) + '</span></h2>' +
      (r.issue ? '<p class="pdxpa-issue"><strong>Local issue:</strong> ' + esc(r.issue) + '</p>' : '') +
      '<ul class="pdxpa-field">' + r.field.map(candidateHtml).join('') + '</ul>' +
      '<p class="pdxpa-race-foot">' +
        (board ? '<a class="pdxpa-board" href="' + esc(board) + '">Open this seat’s District Voice board ›</a> · ' : '') +
        '<a href="' + esc(r.source) + '" target="_blank" rel="noopener">Who is running: source</a>' +
        (r.filed ? ' · <a href="' + esc(r.filed) + '" target="_blank" rel="noopener">Every candidate on the ballot: official list</a>' : '') + '</p>' +
    '</section>';
  }
  function quietSeatHtml(lv) {
    var CD = root.CMP_DATA || root.PROFILES || {};
    var who = lv.pid && CD[lv.pid] ? CD[lv.pid].name : '';
    var acts = lv.pid ? actsFor(lv.pid) : [];
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxnc-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">Not one of the contested races on file for this ballot.</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a North Carolina address in the ' +
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
      return '<p class="pdxpa-lede">Your saved North Carolina location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the General Assembly roll call it was read from.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-nc-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxnc-boot', 'painted');
  }

  root.PDXNcBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
