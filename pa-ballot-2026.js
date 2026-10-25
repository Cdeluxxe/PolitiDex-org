/* ═══════════════════════════════════════════════════════════════════════════
   pa-ballot-2026.js — Pennsylvania's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE. This file holds the State House and State Senate
   races Pennsylvania's own press names as the contested ones on the
   November 3, 2026 general-election ballot, and the formal acts on file for
   the people in them. It is not a roster: every person it names by pid
   already has a record in cmp-data.js, and those records are not touched.
   A challenger with no record here is named, with the office they hold or
   held where the press names one, and is never given a file.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote or a bill sponsorship, read
   off the General Assembly's own pages (palegis.us): the roll-call summary for
   a vote, the bill page for a sponsorship and for the act's status. Every act
   carries the address it was read from. Nothing here is a score, a tally of a
   member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md's rules for effect lines: one sentence, 140 characters or
   fewer, the act as its subject, "Would have…" for an act that failed,
   "Would…" for one that carried a chamber and is not law, done tense for a
   law. Each is written from the measure's own short title, memo subject or
   enacted text, which `from` quotes.

   WHERE IT PAINTS.
     · seatActHtml(pid, level) — one act and its effect line under a sitting
       member's row on Who Represents Me, and the door to the ballot view when
       that seat is one of the races below. '' for anyone else, so no other
       state's row changes.
     · the ballot view at /ballot/pa — mounted into #pdx-pa-ballot: the reader's
       saved location → the races on their ballot → each name, their file and
       their acts → the seat's District Voice board where one is open.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXPaBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Pennsylvania';
  var LEG = 'https://www.palegis.us';
  var RC_H = LEG + '/house/roll-calls/summary?sessYr=2025&sessInd=0&rcNum=';
  var RC_S = LEG + '/senate/roll-calls/summary?sessYr=2025&sessInd=0&rcNum=';
  var BILL = LEG + '/legislation/bills/2025/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed' | 'pending'
  // (introduced, no floor vote yet).
  var MEASURES = {
    'HB 2400': {
      title: 'General Appropriation Act of 2026', status: 'law', act: 'Act 1A of 2026',
      effect: 'Appropriated the General Fund for the Commonwealth’s departments, public debt and public schools for 2026–27.',
      from: 'Short title: “to provide appropriations from the General Fund for the expenses of the Executive, Legislative and Judicial Departments of the Commonwealth, the public debt and the public schools for the fiscal year July 1, 2026, to June 30, 2027”',
      source: BILL + 'hb2400'
    },
    'SB 160': {
      title: 'General Appropriation Act of 2025', status: 'law', act: 'Act 1A of 2025',
      effect: 'Appropriated the General Fund for the Commonwealth’s departments, public debt and public schools for 2025–26.',
      from: 'Short title: “to provide appropriations from the General Fund for the expenses of the Executive, Legislative and Judicial Departments of the Commonwealth, the public debt and the public schools for the fiscal year July 1, 2025, to June 30, 2026”',
      source: BILL + 'sb160'
    },
    'HB 2189': {
      title: 'Minimum wage increase', status: 'passed',
      effect: 'Would raise the state minimum wage to $11 an hour in 2027, $13 in 2028 and $15 in 2029.',
      from: 'PN 3059: “(9) Eleven dollars ($11) an hour beginning January 1, 2027. (10) Thirteen dollars ($13) an hour beginning January 1, 2028. (11) Fifteen dollars ($15) an hour beginning January 1, 2029.”',
      source: BILL + 'hb2189'
    },
    'HB 1200': {
      title: 'Adult-use cannabis through state-run stores', status: 'failed',
      effect: 'Would have legalized and regulated adult-use cannabis sold through state-run Pennsylvania Cannabis Stores.',
      from: 'Short title: “providing for the regulation and treatment of cannabis … establishing Pennsylvania Cannabis Stores”; last action: Senate committee motion to report defeated, May 13, 2025.',
      source: BILL + 'hb1200'
    },
    'HB 1500': {
      title: 'Cyber charter school funding', status: 'passed',
      effect: 'Would set new funding rules, fund-balance limits and accountability requirements for cyber charter schools.',
      from: 'Short title: “for funding for cyber charter schools … providing for fund balance limits … providing for cyber charter school fund balance accountability”; memo subject: “Cyber charter school reform, transparency and accountability”',
      source: BILL + 'hb1500'
    },
    'HB 369': {
      title: 'Land banks in any municipality', status: 'law', act: 'Act 65 of 2026',
      effect: 'Let a Pennsylvania municipality of any size establish a land bank.',
      from: 'Memo subject: “Permitting Municipalities of any Size to Establish a Land Bank”',
      source: BILL + 'hb369'
    },
    'HB 1123': {
      title: 'Colorectal cancer screening coverage', status: 'law', act: 'Act 72 of 2026',
      effect: 'Updated the colorectal cancer screening coverage that casualty insurance policies must provide.',
      from: 'Short title: “in casualty insurance, further providing for coverage for colorectal cancer screening”',
      source: BILL + 'hb1123'
    },
    'SB 1408': {
      title: 'Data center transparency', status: 'pending',
      effect: 'Would bar nondisclosure agreements between public agencies and data centers and require energy and water reporting.',
      from: 'Short title: “prohibiting certain nondisclosure agreements between public agencies and data centers … and for energy and water reporting”',
      source: BILL + 'sb1408'
    },
    'SB 1345': {
      title: 'Local data center moratorium', status: 'pending',
      effect: 'Would let a municipality adopt a temporary moratorium on new applications for high impact data centers.',
      from: 'Short title: “providing for optional temporary moratorium on acceptance or consideration of new applications for high impact data centers”',
      source: BILL + 'sb1345'
    }
  };

  // ── THE ROLL CALLS AND SPONSORSHIPS ───────────────────────────────────────
  // [measure, what, date, source, { pid: 'Yea' | 'Nay' | 'Prime sponsor' | 'Co-sponsor' }]
  var ACTS = [
    ['HB 369', 'House concurrence', '2026-10-21', RC_H + '1614', { dukes_pa: 'Yea' }],
    ['HB 1123', 'House concurrence', '2026-10-21', RC_H + '1611', { dukes_pa: 'Yea' }],
    ['HB 369', 'Senate final passage', '2026-10-21', RC_S + '598',
      { farry_pa: 'Yea', coleman_pa: 'Nay', pennycuick_pa: 'Nay', malone_pa: 'Yea', rosemary_brown_pa: 'Yea' }],
    ['SB 1408', 'Introduced', '2026-07-20', BILL + 'sb1408',
      { pennycuick_pa: 'Prime sponsor', malone_pa: 'Co-sponsor', rosemary_brown_pa: 'Co-sponsor' }],
    ['SB 1345', 'Introduced', '2026-06-04', BILL + 'sb1345',
      { coleman_pa: 'Prime sponsor', pennycuick_pa: 'Co-sponsor' }],
    ['HB 2400', 'House concurrence', '2026-07-12', RC_H + '1339',
      { munroe_pa: 'Yea', hogan_pa: 'Yea', emrick_pa: 'Yea', tomlinson_pa: 'Yea', craig_williams_pa: 'Yea', burns_pa: 'Yea', tom_jones_pa: 'Nay' }],
    ['HB 2400', 'Senate final passage', '2026-07-12', RC_S + '484',
      { farry_pa: 'Yea', coleman_pa: 'Nay', pennycuick_pa: 'Yea', malone_pa: 'Yea', rosemary_brown_pa: 'Yea' }],
    ['HB 2189', 'House final passage', '2026-03-24', RC_H + '880',
      { munroe_pa: 'Yea', hogan_pa: 'Yea', emrick_pa: 'Yea', tomlinson_pa: 'Yea', craig_williams_pa: 'Nay', burns_pa: 'Nay', tom_jones_pa: 'Nay' }],
    ['SB 160', 'House concurrence', '2025-11-12', RC_H + '715',
      { munroe_pa: 'Yea', hogan_pa: 'Yea', emrick_pa: 'Yea', tomlinson_pa: 'Yea', craig_williams_pa: 'Yea', burns_pa: 'Yea', tom_jones_pa: 'Nay' }],
    ['SB 160', 'Senate concurrence', '2025-11-12', RC_S + '270',
      { farry_pa: 'Yea', coleman_pa: 'Nay', pennycuick_pa: 'Yea', malone_pa: 'Yea', rosemary_brown_pa: 'Yea' }],
    ['HB 1500', 'House final passage', '2025-06-04', RC_H + '319',
      { munroe_pa: 'Yea', hogan_pa: 'Nay', emrick_pa: 'Nay', tomlinson_pa: 'Yea', craig_williams_pa: 'Nay', burns_pa: 'Yea', tom_jones_pa: 'Nay' }],
    ['HB 1200', 'House final passage', '2025-05-07', RC_H + '221',
      { munroe_pa: 'Yea', hogan_pa: 'Nay', emrick_pa: 'Nay', tomlinson_pa: 'Nay', craig_williams_pa: 'Nay', burns_pa: 'Yea', tom_jones_pa: 'Nay' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Only seats on the 2026 ballot that the state's press names as contested.
  // Pennsylvania elects its even-numbered State Senate seats in 2026.
  var SPOT = 'https://www.spotlightpa.org/news/2026/09/races-to-watch-pennsylvania-house-senate-2026-midterm-election-elections/';
  var WPSU = 'https://radio.wpsu.org/2026-10-19/pa-election-2026-these-state-house-and-senate-races-could-change-the-balance-of-power-in-harrisburg';
  var WHYY = 'https://whyy.org/articles/pennsylvania-election-2026-state-house-senate-harrisburg-power-democratic-republican-parties/';
  var DATA_CENTERS = 'Data center development — local disclosure and moratorium bills are before the Senate.';
  var RACES = [
    { chamber: 'statesenate', district: 6, where: 'Bucks County', source: WPSU, field: [
      { name: 'Frank A. Farry', party: 'R', pid: 'farry_pa', incumbent: true },
      { name: 'Eileen Hartnett Albillar', party: 'D' }] },
    { chamber: 'statesenate', district: 16, where: 'Upper Bucks and Lehigh counties', source: WHYY, field: [
      { name: 'Jarrett Coleman', party: 'R', pid: 'coleman_pa', incumbent: true },
      { name: 'Mark Pinsley', party: 'D', note: 'Lehigh County Controller' }] },
    { chamber: 'statesenate', district: 24, where: 'Montgomery and Berks counties', source: SPOT, issue: DATA_CENTERS, field: [
      { name: 'Tracy Pennycuick', party: 'R', pid: 'pennycuick_pa', incumbent: true },
      { name: 'Chris Thomas', party: 'D' },
      { name: 'Mike Schonewolf', party: 'G' }] },
    { chamber: 'statesenate', district: 36, where: 'Lancaster County', source: SPOT, field: [
      { name: 'James Andrew Malone', party: 'D', pid: 'malone_pa', incumbent: true },
      { name: 'Tom Jones', party: 'R', pid: 'tom_jones_pa', note: 'State Representative, House District 98' }] },
    { chamber: 'statesenate', district: 40, where: 'Monroe, Lackawanna and Wayne counties', source: SPOT, issue: DATA_CENTERS, field: [
      { name: 'Rosemary M. Brown', party: 'R', pid: 'rosemary_brown_pa', incumbent: true },
      { name: 'Brian Wrightson', party: 'D' }] },
    { chamber: 'statehouse', district: 12, where: 'Butler County', source: WPSU, field: [
      { name: 'Brandon Dukes', party: 'D', pid: 'dukes_pa', incumbent: true, note: 'Seated after the August 2026 special election' },
      { name: 'Scott Timko', party: 'R' }] },
    { chamber: 'statehouse', district: 18, where: 'Bucks County', source: WPSU, field: [
      { name: 'Kathleen C. Tomlinson', party: 'R', pid: 'tomlinson_pa', incumbent: true },
      { name: 'Bryan Allen', party: 'D', note: 'Former Bensalem Township Council member' }] },
    { chamber: 'statehouse', district: 72, where: 'Cambria County', source: WPSU, field: [
      { name: 'Frank Burns', party: 'D', pid: 'burns_pa', incumbent: true },
      { name: 'Phil Rice', party: 'R' }] },
    { chamber: 'statehouse', district: 137, where: 'Northampton County', source: WPSU, field: [
      { name: 'Joe Emrick', party: 'R', pid: 'emrick_pa', incumbent: true },
      { name: 'Jeff Warren', party: 'D', note: 'Bethlehem City Council member' }] },
    { chamber: 'statehouse', district: 142, where: 'Bucks County', source: WPSU, field: [
      { name: 'Joe Hogan', party: 'R', pid: 'hogan_pa', incumbent: true },
      { name: 'Kristin Egan', party: 'D' }] },
    { chamber: 'statehouse', district: 144, where: 'Bucks County', source: WPSU, field: [
      { name: 'Brian Munroe', party: 'D', pid: 'munroe_pa', incumbent: true },
      { name: 'Mike Murphy', party: 'R' }] },
    { chamber: 'statehouse', district: 160, where: 'Chester and Delaware counties', source: WPSU, field: [
      { name: 'Craig Williams', party: 'R', pid: 'craig_williams_pa', incumbent: true },
      { name: 'Elizabeth Moro', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'pa-' + chamber + '-' + num(district); }
  var BY_SEAT = {};
  RACES.forEach(function (r) { r.seat = seatKey(r.chamber, r.district); BY_SEAT[r.seat] = r; });

  function race(chamber, district) { return BY_SEAT[seatKey(chamber, district)] || null; }
  function raceForPid(pid) {
    for (var i = 0; i < RACES.length; i++) {
      for (var j = 0; j < RACES[i].field.length; j++) if (RACES[i].field[j].pid === pid) return RACES[i];
    }
    return null;
  }
  // Every act on file for one pid, newest first.
  function actsFor(pid) {
    var out = [];
    ACTS.forEach(function (a) {
      var how = a[4][pid];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        source: a[3], how: how, effect: m.effect, billSource: m.source });
    });
    // Stable on a tie, so two acts on one day keep the order ACTS lists them in.
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Pennsylvania elects even-numbered Senate seats in 2026 and every House seat.
  function onBallot2026(chamber, district) {
    return chamber === 'statehouse' || (chamber === 'statesenate' && num(district) % 2 === 0);
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
    return '<div class="pdxpa-seat" data-pdxpa-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/pa">This seat is on your ' + esc(ELECTION) +
        ' ballot — see every name in the race ›</a></p>' : '') +
    '</div>';
  }

  // ── MOUNT 2: the ballot view ──────────────────────────────────────────────
  function candidateHtml(c, r) {
    var acts = c.pid ? actsFor(c.pid) : [];
    var name = c.pid
      ? '<a class="pdxpa-name" ' + personAttrs(c.pid) + '>' + esc(c.name) + '</a>'
      : '<span class="pdxpa-name">' + esc(c.name) + '</span>';
    var meta = [c.incumbent ? 'Incumbent' : 'Challenger'];
    if (c.note) meta.push(c.note);
    return '<li class="pdxpa-cand" data-pdxpa-cand="' + esc(c.pid || '') + '">' +
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
    return '<section class="pdxpa-race" data-pdxpa-seat="' + esc(r.seat) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(r.chamber, r.district)) +
        ' <span class="pdxpa-where">' + esc(r.where) + '</span></h2>' +
      (r.issue ? '<p class="pdxpa-issue"><strong>Local issue:</strong> ' + esc(r.issue) + '</p>' : '') +
      '<ul class="pdxpa-field">' + r.field.map(function (c) { return candidateHtml(c, r); }).join('') + '</ul>' +
      '<p class="pdxpa-race-foot">' +
        (board ? '<a class="pdxpa-board" href="' + esc(board) + '">Open this seat’s District Voice board ›</a> · ' : '') +
        '<a href="' + esc(r.source) + '" target="_blank" rel="noopener">Who is running: source</a></p>' +
    '</section>';
  }
  // A seat on the reader's ballot that is not one of the races above: the
  // sitting member if the roster names one, and the same "no member on file"
  // sentence Who Represents Me prints when it does not.
  function quietSeatHtml(lv) {
    var label = seatLabel(lv.key, lv.district);
    var CD = root.CMP_DATA || root.PROFILES || {};
    var who = lv.pid && CD[lv.pid] ? CD[lv.pid].name : '';
    var acts = lv.pid ? actsFor(lv.pid) : [];
    var line = !onBallot2026(lv.key, lv.district)
      ? 'Not on the ' + ELECTION + ' ballot: Pennsylvania elects this Senate seat in 2028.'
      : 'Not one of the contested races on file for this ballot.';
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxpa-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(label) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + esc(line) + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Pennsylvania address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Pennsylvania location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the General Assembly page it was read from.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-pa-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxpa-boot', 'painted');
  }

  root.PDXPaBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
