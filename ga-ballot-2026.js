/* ═══════════════════════════════════════════════════════════════════════════
   ga-ballot-2026.js — Georgia's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern pa-ballot-2026.js set for Pennsylvania.
   This file holds the State House and State Senate races Georgia's own
   reporting names as contested on the November 3, 2026 general-election
   ballot, and the formal acts on file for the people in them. It is not a
   roster: every incumbent it names by pid already has a record in
   cmp-data.js, and those records are not touched.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (Farooq Mughal,
   House District 105 in 2023–24) is keyed here by name, not pid: the acts are
   listed under the name, and no file is linked, because a file would be a new
   roster row. A challenger with no legislative record is named, with party,
   and "No formal act on file".

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the Georgia
   General Assembly's own site (legis.ga.gov). The site opens each roll call
   from its bill page, so every act links to that bill page and names the vote
   number printed there. A member marked excused or not voting has no act on
   that roll call and none is listed. Nothing here is a score, a tally of a
   member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the measure's own
   caption on legis.ga.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as Pennsylvania's, sharing its
   stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/ga — mounted into #pdx-ga-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXGaBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Georgia';
  var BILL = 'https://www.legis.ga.gov/legislation/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'SB 443': {
      title: 'Obstructing public passages', status: 'law', act: 'Act 512 of 2026', session: '2025–26',
      effect: 'Increased the penalty for obstructing highways, streets, sidewalks or other public passages and allowed civil damages.',
      from: 'Caption: “to increase the punishment for the offense of obstructing highways, streets, sidewalks, or other public passages … to authorize civil liability for damages”',
      source: BILL + '72639'
    },
    'SB 175': {
      title: 'Ranked-choice voting', status: 'failed', session: '2025–26',
      effect: 'Would have prohibited ranked-choice voting in Georgia elections, with certain exceptions.',
      from: 'Caption: “to prohibit the use of ranked-choice voting; to provide for certain exceptions”; status: House Third Reading Lost, March 31, 2026.',
      source: BILL + '70344'
    },
    'HR 450': {
      title: 'Sports betting constitutional amendment', status: 'failed', session: '2025–26',
      effect: 'Would have proposed a constitutional amendment letting the General Assembly provide for sports betting by general law.',
      from: 'Caption: “proposing an amendment to the Constitution … to authorize the Georgia General Assembly to provide by general law for sports betting”; status: House Third Reading Lost, March 6, 2026.',
      source: BILL + '71020'
    },
    'HB 1324': {
      title: 'Silencer possession', status: 'failed', session: '2025–26',
      effect: 'Would have repealed Georgia’s prohibition on possessing a silencer.',
      from: 'Caption: “so as to repeal the prohibition on possessing a silencer”; status: House Third Reading Lost, March 6, 2026.',
      source: BILL + '73253'
    },
    'HB 1001': {
      title: 'Income tax rate (2026)', status: 'passed', session: '2025–26',
      effect: 'Would reduce the rate of Georgia’s income tax.',
      from: 'Caption: “relating to the imposition, rate, computation, exemptions, and credits relative to income taxes, so as to reduce the rate of the tax”; status: Senate Tabled, March 31, 2026.',
      source: BILL + '72294'
    },
    'SB 1': {
      title: 'Fair and Safe Athletic Opportunities Act', status: 'law', act: 'Act 11 of 2025', session: '2025–26',
      effect: 'Barred males from school and college sports teams designated as female.',
      from: 'Caption: “to prohibit males from participating in interscholastic and intercollegiate competitions on teams designated as female”',
      source: BILL + '69274'
    },
    'SB 68': {
      title: 'Civil practice and tort revision', status: 'law', act: 'Act 9 of 2025', session: '2025–26',
      effect: 'Revised Georgia’s civil-practice and tort-damages rules, including limits on pain and suffering testimony.',
      from: 'Caption: “substantive and comprehensive revision of provisions regarding civil practice, evidentiary matters, damages, and liability in tort actions; to provide limitations relative to pain and suffering testimony”',
      source: BILL + '69756'
    },
    'HB 111': {
      title: 'Income tax rate (2025)', status: 'law', act: 'Act 7 of 2025', session: '2025–26',
      effect: 'Reduced the rate of Georgia’s income tax.',
      from: 'Caption: “relating to the imposition, rate, computation, exemptions, and credits relative to income taxes, so as to reduce the rate of the tax”',
      source: BILL + '69464'
    },
    'HB 1105': {
      title: 'Georgia Criminal Alien Track and Report Act of 2024', status: 'law', act: 'Act 505 of 2024', session: '2023–24',
      effect: 'Required corrections and jail reports on the immigration status, offenses and home countries of people in custody.',
      from: 'Caption: “to require the commissioner of corrections to report certain information regarding the immigration status, offenses, and home countries … to provide for quarterly reports by jailers regarding foreign born inmates”',
      source: BILL + '66568'
    },
    'SB 189': {
      title: 'Counting ballot text', status: 'law', act: 'Act 697 of 2024', session: '2023–24',
      effect: 'Required the text portions of ballots, not machine coding, to be counted for vote tabulation and recounts.',
      from: 'Caption: “the text portions of ballots produced by ballot marking devices shall be counted for vote tabulation and recounts purposes instead of any machine coding”',
      source: BILL + '64471'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, vote number as legis.ga.gov prints it,
  //  { pid or @name-key: 'Yea' | 'Nay' }]
  // The source of each is its bill page, where the vote is listed.
  var H = ['parsons_ga', 'hilton_ga', 'silcox_ga', 'reeves_ga', 'donatucci_ga', 'cheokas_ga', 'greene_ga'];
  function all(list, how, except) {
    var o = {};
    list.forEach(function (p) { if (!except || !Object.prototype.hasOwnProperty.call(except, p)) o[p] = how; });
    if (except) for (var k in except) if (except[k]) o[k] = except[k];
    return o;
  }
  var ACTS = [
    ['SB 175', 'House passage', '2026-03-31', 'House Vote #817',
      all(H, 'Yea', { silcox_ga: null, greene_ga: null })],
    ['SB 443', 'House passage', '2026-03-23', 'House Vote #752', all(H, 'Yea')],
    ['HR 450', 'House adoption', '2026-03-06', 'House Vote #686',
      all(H, 'Yea', { parsons_ga: 'Nay', donatucci_ga: 'Nay' })],
    ['HB 1324', 'House passage', '2026-03-06', 'House Vote #665',
      all(H, 'Yea', { hilton_ga: null, silcox_ga: null, donatucci_ga: null })],
    ['SB 443', 'Senate passage', '2026-03-03', 'Senate Vote #606', { setzler_ga: 'Yea', still_ga: 'Yea' }],
    ['HB 1001', 'House passage', '2026-02-25', 'House Vote #552', all(H, 'Yea')],
    ['SB 1', 'House passage', '2025-03-31', 'House Vote #350', all(H, 'Yea')],
    ['SB 68', 'House passage', '2025-03-20', 'House Vote #290', all(H, 'Yea')],
    ['HB 111', 'Senate passage', '2025-03-20', 'Senate Vote #256', { setzler_ga: 'Yea', still_ga: 'Yea' }],
    ['HB 111', 'House passage', '2025-03-06', 'House Vote #196', all(H, 'Yea')],
    ['SB 175', 'Senate passage', '2025-03-03', 'Senate Vote #131', { setzler_ga: 'Yea', still_ga: 'Yea' }],
    ['SB 68', 'Senate passage', '2025-02-21', 'Senate Vote #83', { setzler_ga: 'Yea', still_ga: 'Yea' }],
    ['SB 1', 'Senate passage', '2025-02-06', 'Senate Vote #26', { setzler_ga: 'Yea', still_ga: 'Yea' }],
    // 2023–24: Donatucci was not yet seated; Mughal held House District 105.
    ['HB 1105', 'House concurrence', '2024-03-28', 'House Vote #871',
      all(['parsons_ga', 'hilton_ga', 'silcox_ga', 'reeves_ga', 'cheokas_ga', 'greene_ga'], 'Yea', { '@mughal': 'Nay' })],
    ['SB 189', 'House passage', '2024-03-28', 'House Vote #866',
      all(['parsons_ga', 'hilton_ga', 'silcox_ga', 'reeves_ga', 'cheokas_ga', 'greene_ga'], 'Yea', { '@mughal': 'Nay' })]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every State House and State Senate seat is on Georgia's 2026 ballot; these
  // are the ones Georgia reporting names as contested, with both names.
  var APC = 'https://atlpresscollective.com/2026/10/08/2026-midterms-metro-atlantas-local-races-to-watch/';
  var DLCC = 'https://www.dlcc.org/news/press/target-race-launch-dlcc-announces-slate-of-targets-in-georgia-senate/';
  var ALB = 'https://albanyherald.com/news/district-151-challengers-wolfe-lockhart-offer-plans-for-schools-rural-jobs-health-care/';
  var WTXL = 'https://www.wtxl.com/news/elections/election-2026/georgia-voter-guide-2026-key-dates-candidates-amendments-and-polling-information';
  var RACES = [
    { chamber: 'statesenate', district: 37, where: 'Bartow and Cobb counties', source: APC, field: [
      { name: 'Ed Setzler', party: 'R', pid: 'setzler_ga', incumbent: true },
      { name: 'Darcy Castro', party: 'D' }] },
    { chamber: 'statesenate', district: 48, where: 'Gwinnett and Fulton counties', source: DLCC, field: [
      { name: 'Shawn Still', party: 'R', pid: 'still_ga', incumbent: true },
      { name: 'Laura Murvartian', party: 'D' }] },
    { chamber: 'statehouse', district: 44, where: 'Cobb County', source: APC, field: [
      { name: 'Don Parsons', party: 'R', pid: 'parsons_ga', incumbent: true },
      { name: 'Danielle Bell', party: 'D' }] },
    { chamber: 'statehouse', district: 48, where: 'Gwinnett and Fulton counties', source: APC, field: [
      { name: 'Scott Hilton', party: 'R', pid: 'hilton_ga', incumbent: true },
      { name: 'Adam Cleveland', party: 'D' }] },
    { chamber: 'statehouse', district: 53, where: 'Fulton County', source: APC, field: [
      { name: 'Deborah Silcox', party: 'R', pid: 'silcox_ga', incumbent: true },
      { name: 'Beth Fuller', party: 'D' }] },
    { chamber: 'statehouse', district: 99, where: 'Gwinnett County', source: APC, field: [
      { name: 'Matt Reeves', party: 'R', pid: 'reeves_ga', incumbent: true },
      { name: 'Michelle Kang', party: 'D' }] },
    { chamber: 'statehouse', district: 105, where: 'Gwinnett County', source: APC, field: [
      { name: 'Sandy Donatucci', party: 'R', pid: 'donatucci_ga', incumbent: true },
      { name: 'Farooq Mughal', party: 'D', key: '@mughal', note: 'Former State Representative, House District 105 (2023–25)' }] },
    { chamber: 'statehouse', district: 151, where: 'Southwest Georgia', source: ALB, field: [
      { name: 'Mike Cheokas', party: 'R', pid: 'cheokas_ga', incumbent: true },
      { name: 'Ethan Wolfe', party: 'D' },
      { name: 'Travis Lockhart', party: 'I' }] },
    { chamber: 'statehouse', district: 154, where: 'Southwest Georgia', source: WTXL, field: [
      { name: 'Gerald Greene', party: 'R', pid: 'greene_ga', incumbent: true },
      { name: 'Harry James', party: 'D', note: 'Former Dougherty County Commissioner' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'ga-' + chamber + '-' + num(district); }
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
        vote: a[3], source: m.source, how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Georgia elects every State House and State Senate seat every two years.
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
        esc(a.how) + ' · ' + esc(a.what) + ' · ' + esc(a.vote) + ' · ' + esc(day(a.date)) + '</a>' +
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
    return '<div class="pdxpa-seat" data-pdxga-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/ga">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxga-cand="' + esc(c.pid || c.key || '') + '">' +
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
    return '<section class="pdxpa-race" data-pdxga-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxga-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
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
      return '<p class="pdxpa-lede">Set a Georgia address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Georgia location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the General Assembly bill page that lists the vote.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-ga-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxga-boot', 'painted');
  }

  root.PDXGaBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
