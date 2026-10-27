/* ═══════════════════════════════════════════════════════════════════════════
   co-ballot-2026.js — Colorado's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York, Texas,
   Illinois and Minnesota files set. This file holds the State House and State
   Senate races Colorado's own reporting names as competitive or targeted on
   the November 3, 2026 general-election ballot, with a sitting member
   running, and the formal acts on file for the people in them. Every House
   seat and 21 of the 35 Senate seats are on the 2026 ballot. Each sitting
   member it names by pid has a thin shell in cmp-data.js, identity only.

   EVERY NAME ON THE BALLOT. Each race lists every candidate the Secretary of
   State's official candidate list (certified to the counties September 4)
   names for that seat, spelled as the list spells them, which `filed` links.
   One challenger has served in the General Assembly: Rob Woodward, Senate
   District 15 (2019–2023). He holds no roster row, so his acts are filed
   under '@woodward', as Michigan's file does for its former members, and he
   gets no file. Every other challenger has no record in the General
   Assembly: each is named, with party, and "No formal act on file", and gets
   no file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Senate 3, House
   16 and 51) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the vote record
   the General Assembly publishes on leg.colorado.gov, which each act links
   to; the measure links to its bill page there. A member listed as excused or
   absent, or a seat listed as vacant, has no act on that vote. Nothing here
   is a score, a tally of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   title on leg.colorado.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other twelve states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/co — mounted into #pdx-co-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXCoBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Colorado';
  function bill(id) { return 'https://leg.colorado.gov/bills/' + id; }
  var VOTE = 'https://leg.colorado.gov/bill_votes/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'HB26-1410': {
      title: '2026–27 Long Appropriations Bill', status: 'law',
      act: 'Signed May 8, 2026', session: '75th General Assembly, Second Regular Session',
      effect: 'Paid for the executive, legislative and judicial departments of the state and their agencies for the 2026–27 fiscal year.',
      from: 'Title: “Concerning the provision for payment of the expenses of the executive, legislative, and judicial departments of the state of Colorado, and of its agencies and institutions, for and during the fiscal year beginning July 1, 2026…”',
      source: bill('HB26-1410')
    },
    'SB26-023': {
      title: 'School Finance Act', status: 'law',
      act: 'Signed May 28, 2026', session: '75th General Assembly, Second Regular Session',
      effect: 'Set how the state finances its public schools for the 2026–27 school year, and changed the appropriations that pay for it.',
      from: 'Title: “Concerning the financing of public schools, and, in connection therewith, making and reducing an appropriation.”',
      source: bill('SB26-023')
    },
    'HB26-1174': {
      title: 'School Finance Mid-Year Adjustments', status: 'law',
      act: 'Signed March 26, 2026', session: '75th General Assembly, Second Regular Session',
      effect: 'Adjusted school funding for the 2025–26 budget year and reduced that year’s school finance appropriation.',
      from: 'Title: “Concerning adjustments to school funding for the 2025-26 budget year, and, in connection therewith, reducing an appropriation.”',
      source: bill('HB26-1174')
    },
    'HB22-1329': {
      title: '2022–23 Long Appropriations Bill', status: 'law',
      act: 'Signed April 25, 2022', session: '73rd General Assembly, Second Regular Session',
      effect: 'Paid for the executive, legislative and judicial departments of the state and their agencies for the 2022–23 fiscal year.',
      from: 'Title: “Concerning the provision for payment of the expenses of the executive, legislative, and judicial departments of the state of Colorado, and of its agencies and institutions, for and during the fiscal year beginning July 1, 2022…”',
      source: bill('HB22-1329')
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, the vote record's number on leg.colorado.gov,
  //  { pid or @former-member key: vote }] — 'Yes' or 'No', as the vote record
  // prints it.
  var ACTS = [
    ['SB26-023', 'Senate repassage, as amended by the House', '2026-05-13', '29995',
      { exum_co: 'Yes', marchman_co: 'Yes', benavidez_co: 'Yes', carson_co: 'Yes' }],
    ['SB26-023', 'House third reading', '2026-05-12', '29881',
      { woog_co: 'Yes', story_co: 'Yes', kenny_nguyen_co: 'Yes', bob_marshall_co: 'Yes', mauro_co: 'Yes', ryan_gonzalez_co: 'Yes', katie_stewart_co: 'Yes' }],
    ['HB26-1410', 'Senate repassage, conference report', '2026-04-28', '29404',
      { exum_co: 'Yes', marchman_co: 'Yes', benavidez_co: 'Yes', carson_co: 'No' }],
    ['HB26-1410', 'House repassage, conference report', '2026-04-28', '29440',
      { woog_co: 'No', kenny_nguyen_co: 'Yes', bob_marshall_co: 'No', mauro_co: 'Yes', ryan_gonzalez_co: 'No', katie_stewart_co: 'Yes' }],
    ['HB26-1174', 'Senate third reading', '2026-02-20', '28470',
      { exum_co: 'Yes', marchman_co: 'Yes', carson_co: 'Yes' }],
    ['HB26-1174', 'House third reading', '2026-02-12', '28424',
      { woog_co: 'Yes', story_co: 'Yes', kenny_nguyen_co: 'Yes', bob_marshall_co: 'Yes', mauro_co: 'Yes', ryan_gonzalez_co: 'Yes', katie_stewart_co: 'Yes' }],
    ['HB22-1329', 'Senate repassage, conference report', '2022-04-14', '12552',
      { '@woodward': 'No' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Colorado reporting names these seats as competitive or as targets for
  // November, each with a sitting member on the ballot. `filed` is the
  // Secretary of State's official candidate list for the November 3 ballot,
  // which lists every name in each of these seats.
  var CP = 'https://www.coloradopolitics.com/2026/09/28/early-spending-reveals-colorados-top-legislative-battlegrounds-4/';
  var CSUN = 'https://coloradosun.com/2026/10/14/republicans-outspending-democrats-to-prevent-colorado-supermajority/';
  var CPVG = 'https://www.coloradopolitics.com/2026/10/18/understanding-colorados-unusual-2026-elections-cronin-and-loevy-5/';
  var SOS = 'https://www.coloradosos.gov/pubs/elections/vote/generalCandidates.html';
  var RACES = [
    { chamber: 'statesenate', district: 11, where: 'Colorado Springs', source: CP, filed: SOS, field: [
      { name: 'Tony Exum Sr', party: 'D', pid: 'exum_co', incumbent: true },
      { name: 'Levon Stilson', party: 'R' },
      { name: 'Janet Turner', party: 'Libertarian' }] },
    { chamber: 'statesenate', district: 15, where: 'Loveland and Berthoud, Larimer and Boulder counties', source: CP, filed: SOS, field: [
      { name: 'Janice Marchman', party: 'D', pid: 'marchman_co', incumbent: true },
      { name: 'Rob Woodward', party: 'R', key: '@woodward', note: 'Former State Senator, Senate District 15 (2019–2023)' }] },
    { chamber: 'statesenate', district: 21, where: 'Adams County', source: CPVG, filed: SOS, field: [
      { name: 'Adrienne Benavidez', party: 'D', pid: 'benavidez_co', incumbent: true, note: 'Appointed after the February 2026 vacancy' },
      { name: 'Frederick Alfred Jr', party: 'R' }] },
    { chamber: 'statesenate', district: 30, where: 'Highlands Ranch, Douglas County', source: CP, filed: SOS, field: [
      { name: 'John Carson', party: 'R', pid: 'carson_co', incumbent: true },
      { name: 'Kevin Leung', party: 'D' }] },
    { chamber: 'statehouse', district: 19, where: 'Erie, Boulder and Weld counties', source: CP, filed: SOS, field: [
      { name: 'Dan Woog', party: 'R', pid: 'woog_co', incumbent: true },
      { name: 'Jillaire McMillan', party: 'D' }] },
    { chamber: 'statehouse', district: 25, where: 'Evergreen, Jefferson County', source: CP, filed: SOS, field: [
      { name: 'Tammy Story', party: 'D', pid: 'story_co', incumbent: true },
      { name: 'Mark Herzfeld', party: 'R' }] },
    { chamber: 'statehouse', district: 33, where: 'Broomfield', source: CSUN, filed: SOS, field: [
      { name: 'Kenny Van Nguyen', party: 'D', pid: 'kenny_nguyen_co', incumbent: true },
      { name: 'Nate Jorgensen', party: 'R' }] },
    { chamber: 'statehouse', district: 43, where: 'Highlands Ranch, Douglas County', source: CP, filed: SOS, field: [
      { name: 'Robert “Bob” Marshall', party: 'D', pid: 'bob_marshall_co', incumbent: true },
      { name: 'Nate Marsh', party: 'R' }] },
    { chamber: 'statehouse', district: 46, where: 'Pueblo', source: CSUN, filed: SOS, field: [
      { name: 'Tisha Mauro', party: 'D', pid: 'mauro_co', incumbent: true },
      { name: 'Jonathan Post', party: 'R' }] },
    { chamber: 'statehouse', district: 50, where: 'Greeley', source: CP, filed: SOS, field: [
      { name: 'Ryan Gonzalez', party: 'R', pid: 'ryan_gonzalez_co', incumbent: true },
      { name: 'Tommy Butler', party: 'D' }] },
    { chamber: 'statehouse', district: 59, where: 'La Plata County', source: CP, filed: SOS, field: [
      { name: 'Katie Stewart', party: 'D', pid: 'katie_stewart_co', incumbent: true },
      { name: 'Naomi Riess', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'co-' + chamber + '-' + num(district); }
  var BY_SEAT = {};
  RACES.forEach(function (r) { r.seat = seatKey(r.chamber, r.district); BY_SEAT[r.seat] = r; });

  function race(chamber, district) { return BY_SEAT[seatKey(chamber, district)] || null; }
  function raceForPid(pid) {
    for (var i = 0; i < RACES.length; i++) {
      for (var j = 0; j < RACES[i].field.length; j++) if (RACES[i].field[j].pid === pid) return RACES[i];
    }
    return null;
  }
  // Every act on file for one pid (or a former member's @key), newest first.
  function actsFor(who) {
    var out = [];
    ACTS.forEach(function (a) {
      var how = a[4][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: '', source: VOTE + a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function districtText(chamber, district) { return 'District ' + num(district); }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' ' + districtText(chamber, district);
  }
  // Colorado elects every House seat in 2026, and the 21 Senate seats the
  // Secretary of State's ballot order lists as up for election.
  var SENATE_2026 = {};
  [1, 3, 4, 7, 8, 9, 11, 15, 17, 20, 21, 22, 24, 25, 27, 29, 30, 31, 32, 34, 35].forEach(function (d) { SENATE_2026[d] = 1; });
  function onBallot2026(chamber, district) {
    var n = num(district);
    return n > 0 && (chamber === 'statehouse' || (chamber === 'statesenate' && !!SENATE_2026[n]));
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
    return '<div class="pdxpa-seat" data-pdxco-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/co">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxco-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxco-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxco-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">' + esc(districtText(lv.key, lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this Colorado Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Colorado address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Colorado location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s own record of the vote.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-co-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxco-boot', 'painted');
  }

  root.PDXCoBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatLabel: seatLabel,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
