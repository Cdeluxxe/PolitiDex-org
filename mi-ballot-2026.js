/* ═══════════════════════════════════════════════════════════════════════════
   mi-ballot-2026.js — Michigan's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern pa-ballot-2026.js, ga-ballot-2026.js
   and nc-ballot-2026.js set. This file holds the State House and State Senate
   races Michigan's own reporting names as contested on the November 3, 2026
   general-election ballot, with a sitting member running, and the formal acts
   on file for the people in them. It is not a roster: every incumbent it
   names by pid already has a record in cmp-data.js, and those records are not
   touched.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (Jaime Churches,
   House District 27 in 2023–24; Jim Haadsma, House District 44 in 2019–24) is
   keyed here by name, not pid: the acts are listed under the name and no file
   is linked, because a file would be a new roster row. A challenger with no
   legislative record is named, with party, and "No formal act on file".

   LEFT OUT, AND WHY. Open seats (Senate 13 and 32, House 31 and 54) have no
   sitting member running. Senate 12 and 30 are on the watch lists, but the
   reporting read for this pass names no November challenger for either.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the House or
   Senate Journal on the Michigan Legislature's own site
   (legislature.mi.gov), which each act links to and whose roll-call number it
   names; the measure links to its bill page. A member listed neither yea nor
   nay on a roll call has no act on it. Nothing here is a score, a tally of a
   member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   description on legislature.mi.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other three states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/mi — mounted into #pdx-mi-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXMiBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Michigan';
  var BILL = 'https://www.legislature.mi.gov/Bills/Bill?ObjectName=';
  // A journal object name (2026-SJ-07-03-062) → its HTML document.
  function journalUrl(obj) {
    var y = parseInt(obj.slice(0, 4), 10);
    var sess = y % 2 ? y + '-' + (y + 1) : (y - 1) + '-' + y;
    var ch = obj.charAt(5) === 'H' ? 'House' : 'Senate';
    return 'https://www.legislature.mi.gov/documents/' + sess + '/journal/' + ch + '/htm/' + obj + '.htm';
  }

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'SB 878': {
      title: 'Fiscal year 2026–27 omnibus budget', status: 'law', act: 'Public Act 21 of 2026', session: '2025–26',
      effect: 'Appropriated funds for multiple state departments and branches for fiscal year 2026–27, with supplemental funds for 2025–26.',
      from: 'Description: “supplemental appropriations for multiple departments and branches for the fiscal year 2026-2027 and supplemental appropriations for fiscal year 2025-2026”',
      source: BILL + '2026-SB-0878'
    },
    'HB 5697': {
      title: 'K–5 teacher training', status: 'law', act: 'Public Act 26 of 2026', session: '2025–26',
      effect: 'Required K–5 teachers to complete certain training.',
      from: 'Description: “completion of certain training for K-5 teachers; require”',
      source: BILL + '2026-HB-5697'
    },
    'HB 4706': {
      title: 'Fiscal year 2025–26 omnibus budget', status: 'law', act: 'Public Act 22 of 2025', session: '2025–26',
      effect: 'Appropriated funds for multiple state departments and branches for fiscal year 2025–26, with supplemental funds for 2024–25.',
      from: 'Description: “appropriations for multiple departments and branches for the fiscal year 2025-2026 and supplemental appropriations for fiscal year 2024-2025”',
      source: BILL + '2025-HB-4706'
    },
    'SB 8': {
      title: 'Minimum wage', status: 'law', act: 'Public Act 1 of 2025', session: '2025–26',
      effect: 'Modified the state minimum hourly wage rate law.',
      from: 'Description: “minimum hourly wage rate; modify”',
      source: BILL + '2025-SB-0008'
    },
    'SB 271': {
      title: 'Clean and renewable energy targets', status: 'law', act: 'Public Act 235 of 2023', session: '2023–24',
      effect: 'Set targets for energy storage, clean energy and increased renewable energy.',
      from: 'Description: “energy storage, clean energy, and increased renewable energy; set targets for”',
      source: BILL + '2023-SB-0271'
    },
    'HB 4004': {
      title: 'Public-sector agency fees', status: 'law', act: 'Public Act 9 of 2023', session: '2023–24',
      effect: 'Allowed public-sector bargaining agreements to require an agency fee from nonunion members as a condition of employment.',
      from: 'Description: “requirement for agency fee for nonunion members; allow in bargaining agreements and as condition of employment in public sector”',
      source: BILL + '2023-HB-4004'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, journal object name, roll-call number,
  //  { pid or @name-key: 'Yea' | 'Nay' }]
  var H = ['linting_mi', 'thompson_mi', 'frisbie_mi', 'schmaltz_mi', 'tisdel_mi', 'mentzer_mi', 'deboer_mi', 'bohnak_mi'];
  var H23 = ['thompson_mi', 'schmaltz_mi', 'tisdel_mi', 'mentzer_mi', 'deboer_mi', '@churches', '@haadsma'];
  function all(list, how, except) {
    var o = {};
    list.forEach(function (p) { if (!except || !Object.prototype.hasOwnProperty.call(except, p)) o[p] = how; });
    if (except) for (var k in except) if (except[k]) o[k] = except[k];
    return o;
  }
  var ACTS = [
    ['SB 878', 'Senate conference report', '2026-07-03', '2026-SJ-07-03-062', 227, { webber_mi: 'Yea', chedrick_greene_mi: 'Yea' }],
    ['SB 878', 'House conference report', '2026-07-03', '2026-HJ-07-03-056', 342, all(H, 'Yea')],
    ['HB 5697', 'Senate passage', '2026-07-03', '2026-SJ-07-03-062', 208, { webber_mi: 'Yea', chedrick_greene_mi: 'Yea' }],
    ['HB 5697', 'House passage', '2026-06-18', '2026-HJ-06-18-049', 231, all(H, 'Yea', { thompson_mi: null })],
    ['HB 4706', 'Senate conference report', '2025-10-03', '2025-SJ-10-03-088', 258, { webber_mi: 'Yea' }],
    ['HB 4706', 'House conference report', '2025-10-02', '2025-HJ-10-02-092', 240, all(H, 'Yea')],
    ['SB 8', 'House passage', '2025-02-19', '2025-HJ-02-19-018', 8, all(H, 'Yea', { mentzer_mi: 'Nay' })],
    ['SB 8', 'Senate passage', '2025-02-13', '2025-SJ-02-13-014', 7, { webber_mi: 'Yea' }],
    // 2023–24: Churches held House District 27 and Haadsma House District 44.
    ['SB 271', 'Senate passage', '2023-11-08', '2023-SJ-11-08-099', 674, { webber_mi: 'Nay' }],
    ['SB 271', 'House passage', '2023-11-03', '2023-HJ-11-03-094', 486,
      all(H23, 'Nay', { mentzer_mi: 'Yea', '@churches': 'Yea', '@haadsma': 'Yea' })],
    ['HB 4004', 'House concurrence', '2023-03-21', '2023-HJ-03-21-027', 38,
      all(H23, 'Nay', { mentzer_mi: 'Yea', '@churches': 'Yea', '@haadsma': 'Yea' })],
    ['HB 4004', 'Senate passage', '2023-03-21', '2023-SJ-03-21-029', 101, { webber_mi: 'Nay' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every State House and State Senate seat is on Michigan's 2026 ballot;
  // these are the ones Michigan reporting names as contested, with a sitting
  // member running and both names given.
  var GANDER = 'https://gandernewsroom.com/news/elections/michigan-midterm-election-races/';
  var CHAMBER = 'https://www.michamber.com/news/the-battle-for-michigan-2026-election-preview/';
  var RACES = [
    { chamber: 'statesenate', district: 9, where: 'Oakland County', source: GANDER, field: [
      { name: 'Michael Webber', party: 'R', pid: 'webber_mi', incumbent: true },
      { name: 'Theresa Brooks', party: 'D', note: 'Troy City Council member' }] },
    { chamber: 'statesenate', district: 35, where: 'Bay, Midland and Saginaw counties', source: CHAMBER, field: [
      { name: 'Chedrick Greene', party: 'D', pid: 'chedrick_greene_mi', incumbent: true, note: 'Seated after the May 2026 special election' },
      { name: 'Jason Tunney', party: 'R' }] },
    { chamber: 'statehouse', district: 27, where: 'Wayne County', source: GANDER, field: [
      { name: 'Rylee Linting', party: 'R', pid: 'linting_mi', incumbent: true },
      { name: 'Jaime Churches', party: 'D', key: '@churches', note: 'Former State Representative, House District 27 (2023–2024)' }] },
    { chamber: 'statehouse', district: 28, where: 'Wayne County', source: GANDER, field: [
      { name: 'Jamie Thompson', party: 'R', pid: 'thompson_mi', incumbent: true },
      { name: 'Sherry Berecz', party: 'D' }] },
    { chamber: 'statehouse', district: 44, where: 'Calhoun County', source: GANDER, field: [
      { name: 'Steve Frisbie', party: 'R', pid: 'frisbie_mi', incumbent: true },
      { name: 'Jim Haadsma', party: 'D', key: '@haadsma', note: 'Former State Representative, House District 44 (2019–2024)' }] },
    { chamber: 'statehouse', district: 46, where: 'Jackson County', source: GANDER, field: [
      { name: 'Kathy Schmaltz', party: 'R', pid: 'schmaltz_mi', incumbent: true },
      { name: 'Jan Maino', party: 'D', note: 'East Jackson School Board member' }] },
    { chamber: 'statehouse', district: 55, where: 'Oakland County', source: GANDER, field: [
      { name: 'Mark A Tisdel', party: 'R', pid: 'tisdel_mi', incumbent: true },
      { name: 'Alex Hawkins', party: 'D' }] },
    { chamber: 'statehouse', district: 61, where: 'Macomb County', source: GANDER, field: [
      { name: 'Denise Mentzer', party: 'D', pid: 'mentzer_mi', incumbent: true },
      { name: 'Robert Wojtowicz', party: 'R' }] },
    { chamber: 'statehouse', district: 86, where: 'Ottawa County', source: GANDER, field: [
      { name: 'Nancy DeBoer', party: 'R', pid: 'deboer_mi', incumbent: true },
      { name: 'Joseph McClusky', party: 'D' }] },
    { chamber: 'statehouse', district: 109, where: 'Upper Peninsula', source: GANDER, field: [
      { name: 'Karl Bohnak', party: 'R', pid: 'bohnak_mi', incumbent: true },
      { name: 'Anna Aho Rink', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'mi-' + chamber + '-' + num(district); }
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
      var how = a[5][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: 'Roll Call No. ' + a[4], source: journalUrl(a[3]), how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Michigan elects every State House and State Senate seat every two years.
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
    return '<div class="pdxpa-seat" data-pdxmi-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/mi">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxmi-cand="' + esc(c.pid || c.key || '') + '">' +
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
    return '<section class="pdxpa-race" data-pdxmi-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxmi-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
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
      return '<p class="pdxpa-lede">Set a Michigan address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Michigan location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the House or Senate Journal page that records the roll call.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-mi-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxmi-boot', 'painted');
  }

  root.PDXMiBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
