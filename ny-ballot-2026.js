/* ═══════════════════════════════════════════════════════════════════════════
   ny-ballot-2026.js — New York's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida and Arizona files set. This
   file holds the State Assembly and State Senate races New York's own
   reporting names as contested on the November 3, 2026 general-election
   ballot, with a sitting member running, and the formal acts on file for the
   people in them. Every seat in both chambers is single-member and on the
   2026 ballot. Every incumbent it names by pid already has a thin shell in
   cmp-data.js, and those shells are not touched. No challenger here has a
   record in the Legislature: each is named, with party, and "No formal act on
   file", and gets no file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Senate 7,
   Assembly 16 and 23) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote on a bill, read from the
   chamber's own site: a Senate vote from the bill's page on nysenate.gov, an
   Assembly vote from the bill's Floor Votes page on nyassembly.gov. Each act
   links to the page that records it, and the measure links to its bill page
   on nysenate.gov. Where one house substituted the other's bill, the act is
   filed under the bill both houses passed. A member listed as excused or
   absent has no act on that vote. Nothing here is a score, a tally of a
   member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   summary on nyassembly.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other eight states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/ny — mounted into #pdx-ny-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXNyBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'New York';
  var SEN = 'https://www.nysenate.gov/legislation/bills/2025/';
  function asm(bn) { return 'https://nyassembly.gov/leg/?bn=' + bn + '&term=2025&Floor%26nbspVotes=Y'; }

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'A10000-D': {
      title: 'State operations budget, 2026–27', status: 'law',
      act: 'Signed with line-item vetoes June 9, 2026 (Chapter 50 of 2026)', session: '2025–26 Legislature',
      effect: 'Made the appropriations for the operations of state government in the 2026–27 fiscal year.',
      from: 'Summary: “Makes appropriations for the support of government - State Operations Budget.”',
      source: SEN + 'A10000'
    },
    'S9009-C': {
      title: 'Revenue budget, 2026–27', status: 'law',
      act: 'Signed May 28, 2026 (Chapter 59 of 2026)', session: '2025–26 Legislature',
      effect: 'Set the 2026–27 state fiscal plan, including a child and dependent care credit and a state income tax exclusion for up to $25,000 in tips.',
      from: 'Summary: “…the state fiscal plan for the 2026-2027 state fiscal year; sets forth a child and dependent care credit… (Part A); excludes up to twenty-five thousand dollars in qualified tips earned from New York adjusted gross income (Part B)…”',
      source: SEN + 'S9009'
    },
    'A10006-C': {
      title: 'Education, labor, housing and family assistance budget, 2026–27', status: 'law',
      act: 'Signed May 28, 2026 (Chapter 56 of 2026)', session: '2025–26 Legislature',
      effect: 'Enacted the 2026–27 education, labor, housing and family assistance budget, including school foundation aid and universal pre-K aid.',
      from: 'Summary: “…the state education, labor, housing and family assistance budget for the 2026-2027 state fiscal year; relates to contracts for excellence, foundation aid… and to apportioning aid for universal prekindergarten…”',
      source: SEN + 'A10006'
    },
    'A136': {
      title: 'Medical Aid in Dying Act', status: 'law',
      act: 'Signed Feb. 6, 2026 (Chapter 714)', session: '2025–26 Legislature',
      effect: 'Let a terminally ill adult request and use medication for medical aid in dying.',
      from: 'Summary: “Relates to the medical aid in dying act; relates to a terminally ill patient’s request for and use of medication for medical aid in dying.”',
      source: SEN + 'A136'
    },
    'S3006-C': {
      title: 'Education, labor, housing and family assistance budget, 2025–26', status: 'law',
      act: 'Signed May 9, 2025 (Chapter 56 of 2025)', session: '2025–26 Legislature',
      effect: 'Enacted the 2025–26 education, labor, housing and family assistance budget, including universal free school meals.',
      from: 'Summary: “…the state education, labor, housing and family assistance budget for the 2025-2026 state fiscal year… establishes a universal free school meals program (Part B)…”',
      source: SEN + 'S3006'
    },
    'A3009-C': {
      title: 'Revenue budget, 2025–26', status: 'law',
      act: 'Signed May 9, 2025 (Chapter 59 of 2025)', session: '2025–26 Legislature',
      effect: 'Set the 2025–26 state fiscal plan, including an inflation refund credit, a middle-class tax cut and a larger Empire State child credit.',
      from: 'Summary: “…the state fiscal plan for the 2025-2026 state fiscal year; relates to establishing an inflation refund credit (Part A); provides for a middle-class tax cut… (Part B); enhances the empire state child credit for three years (Part C)…”',
      source: SEN + 'A3009'
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, the page that records the vote, { pid: vote }] — a
  // Senate vote reads 'Aye' or 'Nay' as nysenate.gov prints it, an Assembly
  // vote 'Yes' or 'No' as nyassembly.gov prints it.
  var ACTS = [
    ['A10000-D', 'Senate passage', '2026-05-27', SEN + 'A10000',
      { weber_ny: 'Aye', rolison_ny: 'Aye', ashby_ny: 'Aye', tedisco_ny: 'Nay' }],
    ['A10000-D', 'Assembly passage', '2026-05-27', asm('A10000'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'Yes', wieder_ny: 'Yes', bendett_ny: 'No', chludzinski_ny: 'No' }],
    ['S9009-C', 'Senate passage', '2026-05-27', SEN + 'S9009',
      { weber_ny: 'Nay', rolison_ny: 'Aye', ashby_ny: 'Nay', tedisco_ny: 'Nay' }],
    ['S9009-C', 'Assembly passage', '2026-05-27', asm('S09009'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'Yes', wieder_ny: 'Yes', bendett_ny: 'No', chludzinski_ny: 'No' }],
    ['A10006-C', 'Senate passage', '2026-05-20', SEN + 'A10006',
      { weber_ny: 'Aye', rolison_ny: 'Aye', ashby_ny: 'Aye', tedisco_ny: 'Aye' }],
    ['A10006-C', 'Assembly passage', '2026-05-20', asm('A10006'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'Yes', wieder_ny: 'Yes', bendett_ny: 'Yes', chludzinski_ny: 'Yes' }],
    ['A136', 'Senate passage', '2025-06-09', SEN + 'A136',
      { weber_ny: 'Nay', rolison_ny: 'Nay', ashby_ny: 'Nay', tedisco_ny: 'Nay' }],
    ['S3006-C', 'Senate passage', '2025-05-08', SEN + 'S3006',
      { weber_ny: 'Aye', rolison_ny: 'Aye', ashby_ny: 'Aye', tedisco_ny: 'Nay' }],
    ['S3006-C', 'Assembly passage', '2025-05-08', asm('S03006'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'Yes', wieder_ny: 'Yes', bendett_ny: 'Yes', chludzinski_ny: 'Yes' }],
    ['A3009-C', 'Senate passage', '2025-05-08', SEN + 'A3009',
      { weber_ny: 'Nay', rolison_ny: 'Nay', ashby_ny: 'Nay', tedisco_ny: 'Nay' }],
    ['A3009-C', 'Assembly passage', '2025-05-08', asm('A03009'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'No', wieder_ny: 'Yes', bendett_ny: 'No', chludzinski_ny: 'Yes' }],
    ['A136', 'Assembly passage', '2025-04-29', asm('A00136'),
      { griffin_ny: 'Yes', brook_krasny_ny: 'No', wieder_ny: 'No', bendett_ny: 'No', chludzinski_ny: 'No' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every Senate and Assembly seat is on the 2026 ballot; these are the seats
  // New York reporting names as general-election races to watch after the
  // June 23 primary, with a sitting member running and the opponent named.
  var CSNY = 'https://www.cityandstateny.com/politics/2026/07/early-look-state-legislative-races-our-radar-november/415030/';
  var RACES = [
    { chamber: 'statesenate', district: 38, where: 'Rockland County', source: CSNY, field: [
      { name: 'Bill Weber', party: 'R', pid: 'weber_ny', incumbent: true },
      { name: 'Joe Rand', party: 'D' }] },
    { chamber: 'statesenate', district: 39, where: 'Mid-Hudson Valley', source: CSNY, field: [
      { name: 'Rob Rolison', party: 'R', pid: 'rolison_ny', incumbent: true },
      { name: 'Lisa Kaul', party: 'D', note: 'Dutchess County Legislator' }] },
    { chamber: 'statesenate', district: 43, where: 'Capital Region', source: CSNY, field: [
      { name: 'Jake Ashby', party: 'R', pid: 'ashby_ny', incumbent: true },
      { name: 'Devin Lander', party: 'D', note: 'New York State Historian' }] },
    { chamber: 'statesenate', district: 44, where: 'Capital Region', source: CSNY, field: [
      { name: 'Jim Tedisco', party: 'R', pid: 'tedisco_ny', incumbent: true },
      { name: 'Sarah Rogerson', party: 'D' }] },
    { chamber: 'statehouse', district: 21, where: 'Long Island, southwest Nassau County', source: CSNY, field: [
      { name: 'Judy Griffin', party: 'D', pid: 'griffin_ny', incumbent: true },
      { name: 'Irene Villacci', party: 'R' }] },
    { chamber: 'statehouse', district: 46, where: 'Southern Brooklyn', source: CSNY, field: [
      { name: 'Alec Brook-Krasny', party: 'R', pid: 'brook_krasny_ny', incumbent: true },
      { name: 'Chris McCreight', party: 'D' }] },
    { chamber: 'statehouse', district: 97, where: 'Rockland County', source: CSNY, field: [
      { name: 'Aron Wieder', party: 'D', pid: 'wieder_ny', incumbent: true },
      { name: 'Rob Bonomolo', party: 'R' },
      { name: 'Abraham Klein', party: 'Conservative' }] },
    { chamber: 'statehouse', district: 107, where: 'Capital Region', source: CSNY, field: [
      { name: 'Scott Bendett', party: 'R', pid: 'bendett_ny', incumbent: true },
      { name: 'Chloe Pierce', party: 'D' }] },
    { chamber: 'statehouse', district: 143, where: 'Western New York', source: CSNY, field: [
      { name: 'Patrick Chludzinski', party: 'R', pid: 'chludzinski_ny', incumbent: true },
      { name: 'Ryan Taughrin', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'ny-' + chamber + '-' + num(district); }
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
        vote: '', source: a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State Assembly') + ' District ' + num(district);
  }
  // New York elects every seat in both chambers every two years, 2026 included.
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
    return '<div class="pdxpa-seat" data-pdxny-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/ny">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxny-cand="' + esc(c.pid || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxny-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxny-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a New York address in the ' +
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
      return '<p class="pdxpa-lede">Your saved New York location has no State Assembly or State Senate district yet. ' +
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
    var host = document.getElementById('pdx-ny-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxny-boot', 'painted');
  }

  root.PDXNyBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
