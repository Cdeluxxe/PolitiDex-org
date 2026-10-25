/* ═══════════════════════════════════════════════════════════════════════════
   wi-ballot-2026.js — Wisconsin's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan and Ohio files set. This file holds the State Assembly
   and State Senate races Wisconsin's own reporting names as contested on the
   November 3, 2026 general-election ballot, with a sitting member running,
   and the formal acts on file for the people in them.

   THE SITTING MEMBERS. Before this pass the roster held three Wisconsin
   senators by district and no Assembly member by district, so none of these
   seats could be seated. cmp-data.js gains one identity row for each
   incumbent here, and for the one challenger who sits in the Assembly today
   (Jenna Jacobson, Assembly District 50) — name, office, state and district,
   read off the Legislature's own member list. No existing row is touched.
   A challenger with no legislative record is named, with party, and "No
   formal act on file"; they get no row and no file.

   LEFT OUT, AND WHY. Open seats (Senate 5, 21 and 25, Assembly 21 and 53)
   have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the roll call
   on the Wisconsin Legislature's own site (docs.legis.wisconsin.gov), which
   each act links to; the measure links to its bill history page. A member
   listed as not voting or paired has no act on that roll call. Nothing here
   is a score, a tally of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   relating clause on docs.legis.wisconsin.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other five states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/wi — mounted into #pdx-wi-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXWiBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Wisconsin';
  var LEG = 'https://docs.legis.wisconsin.gov/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'AB 1 (May 2026 Special Session)': {
      title: 'Tips and overtime income tax, surplus refunds, school and technical college aid', status: 'failed',
      act: 'Senate refused concurrence, May 13, 2026', session: '2025–26 Legislature',
      effect: 'Would have exempted tips and overtime from state income tax, paid surplus refunds, and raised school and technical college aid.',
      from: 'Relating to: “an income tax subtraction for qualified tips and for qualified overtime compensation; state aid for school districts; surplus refund payments; increasing funding for special education and school age parents programs; state aid to technical colleges…”',
      source: LEG + '2025/proposals/my6/asm/bill/ab1'
    },
    'AB 387': {
      title: 'Correction bill for the 2025–27 budget', status: 'law',
      act: 'Signed April 3, 2026 (2025 Wisconsin Act 181)', session: '2025–26 Legislature',
      effect: 'Corrected 2025 Wisconsin Act 15, the 2025–27 state budget, and made an appropriation.',
      from: 'Relating to: “correction bill for 2025 Wisconsin Act 15 and making an appropriation.”',
      source: LEG + '2025/proposals/reg/asm/bill/ab387'
    },
    'SB 45': {
      title: 'State budget, 2025–27', status: 'law',
      act: 'Signed with partial vetoes July 3, 2025 (2025 Wisconsin Act 15)', session: '2025–26 Legislature',
      effect: 'Enacted the 2025–27 state budget, setting state finances and appropriations.',
      from: 'Relating to: “state finances and appropriations, constituting the executive budget act of the 2025 legislature.”',
      source: LEG + '2025/proposals/reg/sen/bill/sb45'
    },
    'AB 245 (2023)': {
      title: 'County and municipal aid', status: 'law',
      act: 'Signed June 20, 2023 (2023 Wisconsin Act 12)', session: '2023–24 Legislature',
      effect: 'Raised state aid to counties and municipalities and let Milwaukee’s city and county levy added sales taxes for pension costs.',
      from: 'Relating to: “county and municipal aid; imposing a city sales tax and an additional county sales tax to pay the unfunded actuarial accrued liability of city and county retirement systems…”',
      source: LEG + '2023/proposals/reg/asm/bill/ab245'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, the roll call's page (session/related/votes/…),
  //  { pid: 'Yea' | 'Nay' }]
  var ACTS = [
    ['AB 1 (May 2026 Special Session)', 'Senate concurrence', '2026-05-13', '2025/related/votes/senate/sv0261',
      { marklein_wi: 'Yea', smith_wi: 'Nay' }],
    ['AB 1 (May 2026 Special Session)', 'Assembly passage', '2026-05-13', '2025/related/votes/assembly/av0302',
      { sheehan_wi: 'Yea', novak_wi: 'Yea', donovan_wi: 'Yea', snyder_wi: 'Yea', franklin_wi: 'Yea',
        spaude_wi: 'Yea', emerson_wi: 'Yea', moses_wi: 'Yea', doyle_wi: 'Yea', jacobson_wi: 'Yea' }],
    ['AB 387', 'Senate concurrence', '2026-03-17', '2025/related/votes/senate/sv0259',
      { marklein_wi: 'Yea', smith_wi: 'Yea' }],
    ['AB 387', 'Assembly passage', '2026-02-20', '2025/related/votes/assembly/av0300',
      { zimmerman_wi: 'Yea', novak_wi: 'Yea', donovan_wi: 'Yea', snyder_wi: 'Yea', franklin_wi: 'Yea',
        spaude_wi: 'Yea', emerson_wi: 'Yea', moses_wi: 'Yea', doyle_wi: 'Yea', jacobson_wi: 'Yea' }],
    ['SB 45', 'Assembly concurrence', '2025-07-03', '2025/related/votes/assembly/av0084',
      { sheehan_wi: 'Nay', zimmerman_wi: 'Yea', novak_wi: 'Yea', donovan_wi: 'Yea', snyder_wi: 'Yea', franklin_wi: 'Yea',
        spaude_wi: 'Nay', emerson_wi: 'Yea', moses_wi: 'Yea', doyle_wi: 'Yea', jacobson_wi: 'Nay' }],
    ['SB 45', 'Senate passage', '2025-07-02', '2025/related/votes/senate/sv0081',
      { marklein_wi: 'Yea', smith_wi: 'Yea' }],
    // 2023–24: Sheehan, Franklin and Spaude were not yet in the Assembly.
    ['AB 245 (2023)', 'Assembly concurrence in Senate amendment', '2023-06-14', '2023/related/votes/assembly/av0050',
      { novak_wi: 'Yea', donovan_wi: 'Yea', snyder_wi: 'Yea', emerson_wi: 'Nay', moses_wi: 'Yea', doyle_wi: 'Yea', jacobson_wi: 'Nay' }],
    ['AB 245 (2023)', 'Senate concurrence', '2023-06-14', '2023/related/votes/senate/sv0046',
      { marklein_wi: 'Yea', smith_wi: 'Yea' }],
    ['AB 245 (2023)', 'Assembly passage', '2023-05-17', '2023/related/votes/assembly/av0039',
      { zimmerman_wi: 'Yea', novak_wi: 'Yea', donovan_wi: 'Yea', snyder_wi: 'Yea', emerson_wi: 'Nay', moses_wi: 'Yea', doyle_wi: 'Nay', jacobson_wi: 'Nay' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every Assembly seat and the odd-numbered Senate seats are on the 2026
  // ballot; these are the seats Wisconsin reporting names as toss-ups, leaning
  // or in play, with a sitting member running and the opponent named.
  var WPR_OCT = 'https://www.wpr.org/news/wisconsin-assembly-campaign-roundup-2026';
  var WPR_AUG = 'https://www.wpr.org/news/primaries-battle-control-wisconsin-legislature';
  var MU = 'https://law.marquette.edu/facultyblog/2026/07/rating-the-battleground-districts-in-the-wisconsin-legislature/';
  var RACES = [
    { chamber: 'statesenate', district: 17, where: 'Southwest Wisconsin, around Platteville', source: WPR_AUG, field: [
      { name: 'Howard Marklein', party: 'R', pid: 'marklein_wi', incumbent: true },
      { name: 'Jenna Jacobson', party: 'D', pid: 'jacobson_wi', note: 'State Representative, Assembly District 50' }] },
    { chamber: 'statesenate', district: 31, where: 'Eau Claire area', source: MU, field: [
      { name: 'Jeff Smith', party: 'D', pid: 'smith_wi', incumbent: true },
      { name: 'Michele Magadance Skinner', party: 'R' }] },
    { chamber: 'statehouse', district: 26, where: 'Sheboygan', source: WPR_OCT, field: [
      { name: 'Joe Sheehan', party: 'D', pid: 'sheehan_wi', incumbent: true },
      { name: 'John Belanger', party: 'R' }] },
    { chamber: 'statehouse', district: 30, where: 'River Falls', source: WPR_OCT, field: [
      { name: 'Shannon Zimmerman', party: 'R', pid: 'zimmerman_wi', incumbent: true },
      { name: 'Kevin Knoke', party: 'D' }] },
    { chamber: 'statehouse', district: 51, where: 'Dodgeville', source: WPR_OCT, field: [
      { name: 'Todd Novak', party: 'R', pid: 'novak_wi', incumbent: true },
      { name: 'Ben Gruber', party: 'D' },
      { name: 'Nathan Tataje', party: 'American Solidarity' }] },
    { chamber: 'statehouse', district: 61, where: 'Greenfield, Greendale and Hales Corners', source: WPR_OCT, field: [
      { name: 'Bob Donovan', party: 'R', pid: 'donovan_wi', incumbent: true },
      { name: 'Ben Brist', party: 'D' }] },
    { chamber: 'statehouse', district: 85, where: 'Wausau', source: WPR_OCT, field: [
      { name: 'Patrick Snyder', party: 'R', pid: 'snyder_wi', incumbent: true },
      { name: 'John Kroll', party: 'D' }] },
    { chamber: 'statehouse', district: 88, where: 'De Pere', source: WPR_OCT, field: [
      { name: 'Benjamin Franklin', party: 'R', pid: 'franklin_wi', incumbent: true },
      { name: 'Brandy Tollefson', party: 'D', note: 'De Pere School Board member' }] },
    { chamber: 'statehouse', district: 89, where: 'Ashwaubenon', source: WPR_OCT, field: [
      { name: 'Ryan Spaude', party: 'D', pid: 'spaude_wi', incumbent: true },
      { name: 'Bobby Lindsey', party: 'R' }] },
    { chamber: 'statehouse', district: 91, where: 'Eau Claire', source: WPR_OCT, field: [
      { name: 'Jodi Emerson', party: 'D', pid: 'emerson_wi', incumbent: true },
      { name: 'Bruce Stabenow', party: 'R' }] },
    { chamber: 'statehouse', district: 92, where: 'Menomonie', source: WPR_OCT, field: [
      { name: 'Clint Moses', party: 'R', pid: 'moses_wi', incumbent: true },
      { name: 'Jeremiah Fredrickson', party: 'D' }] },
    { chamber: 'statehouse', district: 94, where: 'Onalaska and La Crosse', source: WPR_OCT, field: [
      { name: 'Steve Doyle', party: 'D', pid: 'doyle_wi', incumbent: true },
      { name: 'Keith Purnell', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'wi-' + chamber + '-' + num(district); }
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
  function actsFor(who) {
    var out = [];
    ACTS.forEach(function (a) {
      var how = a[4][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: '', source: LEG + a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State Assembly') + ' District ' + num(district);
  }
  // Wisconsin elects every Assembly seat, and its odd-numbered Senate seats, in 2026.
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
    return '<div class="pdxpa-seat" data-pdxwi-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/wi">This seat is on your ' + esc(ELECTION) +
        ' ballot — see every name in the race ›</a></p>' : '') +
    '</div>';
  }

  // ── MOUNT 2: the ballot view ──────────────────────────────────────────────
  function candidateHtml(c) {
    var acts = c.pid ? actsFor(c.pid) : [];
    var name = c.pid
      ? '<a class="pdxpa-name" ' + personAttrs(c.pid) + '>' + esc(c.name) + '</a>'
      : '<span class="pdxpa-name">' + esc(c.name) + '</span>';
    var meta = [c.incumbent ? 'Incumbent' : 'Challenger'];
    if (c.note) meta.push(c.note);
    return '<li class="pdxpa-cand" data-pdxwi-cand="' + esc(c.pid || c.name) + '">' +
      '<p class="pdxpa-cand-hd">' + name + ' <span class="pdxpa-party">(' + esc(c.party) + ')</span></p>' +
      '<p class="pdxpa-cand-meta">' + esc(meta.join(' · ')) + '</p>' +
      (acts.length
        ? '<ul class="pdxpa-acts">' + acts.map(actHtml).join('') + '</ul>' +
          '<p class="pdxpa-file"><a ' + personAttrs(c.pid) + '>Open ' + esc(c.name) + '’s file ›</a></p>'
        : '<p class="pdxpa-none">No formal act on file. PolitiDex holds no legislative record for this candidate.</p>') +
    '</li>';
  }
  function raceHtml(r) {
    var board = boardPath(r.seat);
    return '<section class="pdxpa-race" data-pdxwi-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxwi-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: Wisconsin elects this Senate seat in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Wisconsin address in the ' +
        '<a href="/find">district finder</a> and this page lists the State Assembly and State Senate races on your ' +
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
      return '<p class="pdxpa-lede">Your saved Wisconsin location has no State Assembly or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State Assembly seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s roll call that records it.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-wi-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxwi-boot', 'painted');
  }

  root.PDXWiBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
