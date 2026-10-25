/* ═══════════════════════════════════════════════════════════════════════════
   az-ballot-2026.js — Arizona's contested State Senate seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin and Florida files set — for the
   Arizona Senate only. Each of Arizona's 30 legislative districts elects one
   Senator and TWO Representatives, so a House seat is shared: the roster
   holds no House rows, the seat resolver names nobody for a seat two members
   claim, and this file holds no House race. The House row on /ballot/az says
   so rather than naming anyone.

   This file holds the Senate races Arizona's own reporting names as
   contested on the November 3, 2026 general-election ballot, with a sitting
   member running, and the formal acts on file for the people in them. Every
   incumbent it names by pid already has a thin shell in cmp-data.js, and
   those shells are not touched.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (Aaron Lieberman,
   a former State Representative) is keyed here by name, not pid: the acts
   are listed under the name and no file is linked, because a file would be a
   new roster row. A challenger with no legislative record is named, with
   party, and "No formal act on file".

   LEFT OUT, AND WHY. Open seats (Senate 13 and 17) have no sitting member
   running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the bill's
   floor actions in the Arizona Legislature's own bill status system
   (apps.azleg.gov), whose bill page each act links to. A member listed as not
   voting or excused has no act on that vote. Nothing here is a score, a tally
   of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   short title on azleg.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other seven states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/az — mounted into #pdx-az-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXAzBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Arizona';
  var LEG = 'https://apps.azleg.gov/BillStatus/BillOverview/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'SB 1847 (2026)': {
      title: 'General appropriations act, 2026–27', status: 'law',
      act: 'Signed June 13, 2026 (Laws 2026, Chapter 126)', session: '57th Legislature, Second Regular Session',
      effect: 'Made the state’s general appropriations for the 2026–27 fiscal year.',
      from: 'Short title: “general appropriations act; 2026-2027.”',
      source: LEG + '85734?SessionId=130'
    },
    'SB 1735 (2025)': {
      title: 'General appropriations act, 2025–26', status: 'law',
      act: 'Signed June 27, 2025 (Laws 2025, Chapter 233)', session: '57th Legislature, First Regular Session',
      effect: 'Made the state’s general appropriations for the 2025–26 fiscal year.',
      from: 'Short title: “2025-2026; general appropriations act”',
      source: LEG + '83469?SessionId=129'
    },
    'HB 2862 (2022)': {
      title: 'General appropriations act, 2022–23', status: 'law',
      act: 'Signed with line-item vetoes June 28, 2022 (Laws 2022, Chapter 313)', session: '55th Legislature, Second Regular Session',
      effect: 'Made the state’s general appropriations for the 2022–23 fiscal year.',
      from: 'Short title: “general appropriations act; 2022-2023”',
      source: LEG + '77992?SessionId=125'
    },
    'SB 1823 (2021)': {
      title: 'General appropriations act, 2021–22', status: 'law',
      act: 'Signed June 30, 2021 (Laws 2021, Chapter 408)', session: '55th Legislature, First Regular Session',
      effect: 'Made the state’s general appropriations for the 2021–22 fiscal year.',
      from: 'Short title: “general appropriations act; 2021-2022”',
      source: LEG + '76144?SessionId=123'
    },
    'SB 1690 (2020)': {
      title: 'Budget procedures and reconciliation, 2020–21', status: 'law',
      act: 'Signed March 28, 2020 (Laws 2020, Chapter 56)', session: '54th Legislature, Second Regular Session',
      effect: 'Set the budget procedures and budget reconciliation for the 2020–21 fiscal year.',
      from: 'Short title: “budget procedures; budget reconciliation; 2020-2021.”',
      source: LEG + '74227?SessionId=122'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, { pid or @name-key: 'Yea' | 'Nay' }] — each vote is
  // recorded among the floor actions on the measure's own bill status page.
  var ACTS = [
    ['SB 1847 (2026)', 'Senate third reading', '2026-06-11',
      { bolick_az: 'Yea', werner_az: 'Yea', sears_az: 'Yea', fernandez_az: 'Yea' }],
    ['SB 1735 (2025)', 'Senate final reading', '2025-06-27',
      { bolick_az: 'Yea', werner_az: 'Yea', sears_az: 'Yea', fernandez_az: 'Yea' }],
    // 2020–2022: Bolick and Brian Fernandez sat in the House; Lieberman was a
    // Representative. The House's 2019–2021 "Fernandez" is Charlene Fernandez.
    ['HB 2862 (2022)', 'House third reading', '2022-06-23',
      { bolick_az: 'Yea', fernandez_az: 'Yea' }],
    ['SB 1823 (2021)', 'House third reading', '2021-06-24',
      { bolick_az: 'Yea', '@lieberman': 'Nay' }],
    ['SB 1690 (2020)', 'House third reading', '2020-03-23',
      { bolick_az: 'Yea', '@lieberman': 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every Senate seat is on the 2026 ballot; these are the seats Arizona
  // reporting names as contested, with a sitting member running and the
  // opponent named.
  var ACT_MONEY = 'https://azcapitoltimes.com/news/2026/10/22/arizona-senate-races-draw-big-money-in-key-districts/';
  var RACES = [
    { chamber: 'statesenate', district: 2, where: 'North Phoenix', source: ACT_MONEY, field: [
      { name: 'Shawnna Bolick', party: 'R', pid: 'bolick_az', incumbent: true },
      { name: 'Amelia Gallitano', party: 'D' }] },
    { chamber: 'statesenate', district: 4, where: 'Scottsdale and north-central Phoenix', source: ACT_MONEY, field: [
      { name: 'Carine Werner', party: 'R', pid: 'werner_az', incumbent: true },
      { name: 'Aaron Lieberman', party: 'D', key: '@lieberman', note: 'Former State Representative' }] },
    { chamber: 'statesenate', district: 9, where: 'West Mesa', source: 'https://www.kjzz.org/elections/2026-10-08/2026-arizona-senate-9th-legislative-district-the-candidates', field: [
      { name: 'Kiana Sears', party: 'D', pid: 'sears_az', incumbent: true, note: 'Appointed in 2025' },
      { name: 'Bridget Fitzgibbons', party: 'R' }] },
    { chamber: 'statesenate', district: 23, where: 'Yuma and southwest Arizona', source: 'https://www.kjzz.org/elections/2026-10-06/2026-arizona-senate-23rd-legislative-district-race-the-candidates-elex', field: [
      { name: 'Brian Fernandez', party: 'D', pid: 'fernandez_az', incumbent: true },
      { name: 'Michelle Altherr', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'az-' + chamber + '-' + num(district); }
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
      var how = a[3][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: '', source: m.source, how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Arizona elects every seat in both chambers every two years, 2026 included.
  function onBallot2026(chamber, district) {
    return num(district) > 0 && (chamber === 'statehouse' || chamber === 'statesenate');
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
    return '<div class="pdxpa-seat" data-pdxaz-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/az">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxaz-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxaz-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxaz-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (lv.key === 'statehouse'
        ? 'Each Arizona legislative district elects two State Representatives; PolitiDex does not hold Arizona House races.'
        : onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set an Arizona address in the ' +
        '<a href="/find">district finder</a> and this page lists the State Senate races on your ' +
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
      return '<p class="pdxpa-lede">Your saved Arizona location has no legislative district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s bill status page, where its floor vote is recorded.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-az-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxaz-boot', 'painted');
  }

  root.PDXAzBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
