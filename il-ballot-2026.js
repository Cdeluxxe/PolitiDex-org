/* ═══════════════════════════════════════════════════════════════════════════
   il-ballot-2026.js — Illinois's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York and Texas
   files set. This file holds the State House and State Senate races
   Illinois's own reporting names as competitive or targeted on the November
   3, 2026 general-election ballot, with a sitting member running, and the
   formal acts on file for the people in them. Every House seat and 39 of the
   59 Senate seats are on the 2026 ballot. Every member it names by pid
   already has a thin shell in cmp-data.js, and those shells are not touched.

   EVERY NAME ON THE BALLOT. Each race lists every candidate the State Board
   of Elections lists as active for that seat on the November 3, 2026 ballot,
   which `filed` links; a withdrawn or removed filing is not a name on the
   ballot. One challenger sits in the Legislature today (Nabeela Syed, House
   District 51): her acts are listed and her file is linked. Every other
   challenger has no record in the Legislature: each is named, with party, and
   "No formal act on file", and gets no file. Jessica Dixon Heitman (House 97)
   was appointed in July 2026 and the House has not met since, so she too has
   no act on file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Senate 33, House
   47, 51 and 118) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote in the 104th General
   Assembly, read from the roll call the General Assembly publishes on
   ilga.gov, which each act links to; the measure links to its bill status
   page. A member listed as excused or not voting has no act on that roll
   call. Nothing here is a score, a tally of a member's record, a ranking or a
   match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   synopsis on ilga.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other ten states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/il — mounted into #pdx-il-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXIlBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Illinois';
  var ILGA = 'https://www.ilga.gov/';
  function bill(type, num) { return ILGA + 'Legislation/BillStatus?DocTypeID=' + type + '&DocNum=' + num + '&GAID=18&SessionID=114'; }
  var ROLL = ILGA + 'Documents/legislation/votehistory/104/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'HB 111': {
      title: 'State budget, fiscal year 2027', status: 'law',
      act: 'Signed with item and reduction vetoes June 16, 2026 (Public Act 104-0464)', session: '104th General Assembly',
      effect: 'Made the state’s appropriations for the 2027 fiscal year.',
      from: 'Synopsis: “Makes appropriations and reappropriations for capital and operating expenditures and other purposes for State Fiscal Year 2027.”',
      source: bill('HB', 111)
    },
    'SB 25': {
      title: 'Energy law changes', status: 'law',
      act: 'Signed Jan. 8, 2026 (Public Act 104-0458)', session: '104th General Assembly',
      effect: 'Changed state energy law, including utility resource planning, energy storage and the Illinois Power Agency’s programs.',
      from: 'Synopsis: “Requires certain electric cooperatives, municipal power agencies, and municipalities… to initiate an integrated resource planning process… Adds provisions concerning energy storage systems… Amends the Illinois Power Agency Act.”',
      source: bill('SB', 25)
    },
    'SB 2111': {
      title: 'Northern Illinois Transit Authority', status: 'law',
      act: 'Signed Dec. 16, 2025 (Public Act 104-0457)', session: '104th General Assembly',
      effect: 'Replaced the Regional Transportation Authority with the Northern Illinois Transit Authority and barred parking minimums near transit.',
      from: 'Synopsis: “Creates the Northern Illinois Transit Authority to replace the Regional Transportation Authority… a unit of local government may not impose or enforce any minimum automobile parking requirements on a development project if the project is located within one-half mile of a public transportation hub…”',
      source: bill('SB', 2111)
    },
    'SB 2510': {
      title: 'State budget, fiscal year 2026', status: 'law',
      act: 'Signed with item and reduction vetoes June 16, 2025 (Public Act 104-0003)', session: '104th General Assembly',
      effect: 'Made the state’s appropriations for the 2026 fiscal year.',
      from: 'Synopsis: “Makes appropriations and reappropriations for capital and operating expenditures and other purposes for State Fiscal Year 2026.”',
      source: bill('SB', 2510)
    },
    'HB 2755': {
      title: 'Revenue changes, 2025', status: 'law',
      act: 'Signed June 16, 2025 (Public Act 104-0006)', session: '104th General Assembly',
      effect: 'Changed state revenue laws, including tax amnesty and motor fuel and tobacco taxes, and created a digital advertisement tax.',
      from: 'Synopsis: “Makes changes to various Acts concerning the following revenue provisions: tax amnesty… motor fuel taxes… and tobacco and cigarette taxes… Creates the Digital Advertisement Tax Act.”',
      source: bill('HB', 2755)
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, the roll call's path under ROLL, { pid: 'Yea' | 'Nay' }]
  var ACTS = [
    ['HB 111', 'Senate passage', '2026-05-31', 'senate/10400HB0111_05312026_055000T.pdf',
      { hills_il: 'Nay', lewis_il: 'Nay', doris_turner_il: 'Nay', halpin_il: 'Yea', belt_il: 'Nay', harriss_il: 'Nay' }],
    ['HB 111', 'House concurrence in Senate amendments', '2026-05-31', 'house/10400HB0111sam003_05312026_071000C.pdf',
      { mclaughlin_il: 'Nay', briel_il: 'Yea', schweizer_il: 'Nay', schmidt_il: 'Nay', stuart_il: 'Yea', keicher_il: 'Nay', ugaste_il: 'Nay', syed_il: 'Yea' }],
    ['SB 25', 'Senate concurrence in House amendments', '2025-10-30', 'senate/10400SB0025ham004_10302025_024000C.pdf',
      { hills_il: 'Nay', lewis_il: 'Nay', doris_turner_il: 'Yea', halpin_il: 'Yea', belt_il: 'Yea', harriss_il: 'Nay' }],
    ['SB 2111', 'Senate concurrence in House amendments', '2025-10-30', 'senate/10400SB2111ham003_10302025_038000C.pdf',
      { hills_il: 'Nay', lewis_il: 'Yea', doris_turner_il: 'Nay', halpin_il: 'Yea', belt_il: 'Nay', harriss_il: 'Nay' }],
    ['SB 2111', 'House passage', '2025-10-30', 'house/10400SB2111_10302025_016000T.pdf',
      { schweizer_il: 'Nay', schmidt_il: 'Nay', stuart_il: 'Yea', keicher_il: 'Nay', ugaste_il: 'Nay' }],
    ['SB 25', 'House passage', '2025-10-29', 'house/10400SB0025_10292025_003000T.pdf',
      { mclaughlin_il: 'Nay', briel_il: 'Yea', schweizer_il: 'Nay', schmidt_il: 'Nay', stuart_il: 'Yea', keicher_il: 'Nay', ugaste_il: 'Nay', syed_il: 'Yea' }],
    ['SB 2510', 'Senate concurrence in House amendment', '2025-05-31', 'senate/10400SB2510ham003_05312025_066000C.pdf',
      { hills_il: 'Nay', lewis_il: 'Nay', doris_turner_il: 'Nay', halpin_il: 'Nay', belt_il: 'Nay', harriss_il: 'Nay' }],
    ['SB 2510', 'House passage', '2025-05-31', 'house/10400SB2510_05312025_053000T.pdf',
      { mclaughlin_il: 'Nay', briel_il: 'Yea', schweizer_il: 'Nay', schmidt_il: 'Nay', stuart_il: 'Yea', keicher_il: 'Nay', ugaste_il: 'Nay', syed_il: 'Yea' }],
    ['HB 2755', 'Senate passage', '2025-05-31', 'senate/10400HB2755_05312025_064000T.pdf',
      { hills_il: 'Nay', lewis_il: 'Nay', doris_turner_il: 'Nay', halpin_il: 'Nay', belt_il: 'Nay', harriss_il: 'Nay' }],
    ['HB 2755', 'House concurrence in Senate amendments', '2025-05-31', 'house/10400HB2755sam001_05312025_064000C.pdf',
      { mclaughlin_il: 'Nay', briel_il: 'Yea', schweizer_il: 'Nay', schmidt_il: 'Nay', stuart_il: 'Yea', keicher_il: 'Nay', ugaste_il: 'Nay', syed_il: 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Illinois reporting names these seats as competitive or as targets for
  // November, each with a sitting member on the ballot. `filed` is the State
  // Board of Elections' list of every candidate filed for the November 3
  // ballot.
  var CNI_OCT = 'https://capitolnewsillinois.com/news/illinois-democrats-eye-suburbs-in-push-to-expand-supermajorities/';
  var CNI_AUG = 'https://capitolnewsillinois.com/news/amid-democratic-scandals-illinois-republicans-hoping-to-flip-legislative-seats/';
  var WBEZ = 'https://www.wbez.org/government-politics/elections/2026/10/01/illinois-statehouse-elections-november-3-senate-house-general-assembly-what-to-know';
  var TCS = 'https://www.thecentersquare.com/illinois/article_95dbdcb6-47c5-45ed-bea3-07d83675167a.html';
  var SBE = 'https://www.elections.il.gov/ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d';
  var RACES = [
    { chamber: 'statesenate', district: 24, where: 'DuPage County, around Bartlett', source: CNI_OCT, filed: SBE, field: [
      { name: 'Seth Lewis', party: 'R', pid: 'lewis_il', incumbent: true },
      { name: 'Benjamin “Ben” McAdams', party: 'D' }] },
    { chamber: 'statesenate', district: 26, where: 'Northwest suburbs, around Barrington', source: WBEZ, filed: SBE, field: [
      { name: 'Darby A. Hills', party: 'R', pid: 'hills_il', incumbent: true, note: 'Appointed in 2025' },
      { name: 'Nabeela Syed', party: 'D', pid: 'syed_il', note: 'State Representative, House District 51' }] },
    { chamber: 'statesenate', district: 36, where: 'Quad Cities, Galesburg and Macomb', source: CNI_AUG, filed: SBE, field: [
      { name: 'Michael W. Halpin', party: 'D', pid: 'halpin_il', incumbent: true },
      { name: 'Brad Beekman', party: 'R' }] },
    { chamber: 'statesenate', district: 48, where: 'Springfield area', source: CNI_AUG, filed: SBE, field: [
      { name: 'Doris Turner', party: 'D', pid: 'doris_turner_il', incumbent: true },
      { name: 'Frank Lesko', party: 'R' }] },
    { chamber: 'statesenate', district: 56, where: 'Metro East, Madison County', source: TCS, filed: SBE, field: [
      { name: 'Erica Harriss', party: 'R', pid: 'harriss_il', incumbent: true },
      { name: 'Marsia Geldert-Murphey', party: 'D' }] },
    { chamber: 'statesenate', district: 57, where: 'Metro East, St. Clair County', source: CNI_AUG, filed: SBE, field: [
      { name: 'Christopher Belt', party: 'D', pid: 'belt_il', incumbent: true },
      { name: 'Daniel Rhyne', party: 'R' }] },
    { chamber: 'statehouse', district: 52, where: 'Northwest suburbs, around Barrington', source: WBEZ, filed: SBE, field: [
      { name: 'Martin McLaughlin', party: 'R', pid: 'mclaughlin_il', incumbent: true },
      { name: 'Maria Peterson', party: 'D' }] },
    { chamber: 'statehouse', district: 65, where: 'Kane County, around Geneva', source: CNI_OCT, filed: SBE, field: [
      { name: 'Daniel J. Ugaste', party: 'R', pid: 'ugaste_il', incumbent: true },
      { name: 'Ricky Rivard', party: 'D' }] },
    { chamber: 'statehouse', district: 70, where: 'DeKalb County, around Sycamore', source: CNI_OCT, filed: SBE, field: [
      { name: 'Jeff Keicher', party: 'R', pid: 'keicher_il', incumbent: true },
      { name: 'Veronica Garcia-Martinez', party: 'D' }] },
    { chamber: 'statehouse', district: 76, where: 'North-central Illinois, around Ottawa', source: TCS, filed: SBE, field: [
      { name: 'Amy Briel', party: 'D', pid: 'briel_il', incumbent: true },
      { name: 'Liz Bishop', party: 'R' }] },
    { chamber: 'statehouse', district: 97, where: 'Will County, around Plainfield', source: CNI_AUG, filed: SBE, field: [
      { name: 'Jessica Dixon Heitman', party: 'D', pid: 'heitman_il', incumbent: true, note: 'Appointed in July 2026' },
      { name: 'Gabby Shanahan', party: 'R' }] },
    { chamber: 'statehouse', district: 104, where: 'Danville area', source: TCS, filed: SBE, field: [
      { name: 'Brandun Schweizer', party: 'R', pid: 'schweizer_il', incumbent: true },
      { name: 'Mary Catherine Roberson', party: 'D' }] },
    { chamber: 'statehouse', district: 112, where: 'Madison County, around Edwardsville', source: CNI_AUG, filed: SBE, field: [
      { name: 'Katie Stuart', party: 'D', pid: 'stuart_il', incumbent: true },
      { name: 'Jimmy Ford', party: 'R' }] },
    { chamber: 'statehouse', district: 114, where: 'Metro East, St. Clair County', source: TCS, filed: SBE, field: [
      { name: 'Kevin Schmidt', party: 'R', pid: 'schmidt_il', incumbent: true },
      { name: 'George McClellan Jr.', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'il-' + chamber + '-' + num(district); }
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
        vote: '', source: ROLL + a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Illinois elects every House seat in 2026, and 39 of its 59 Senate seats —
  // the ones the State Board of Elections lists as up for election.
  var SENATE_2026 = {};
  [2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44, 45,
    47, 48, 50, 51, 53, 54, 56, 57, 59].forEach(function (d) { SENATE_2026[d] = 1; });
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
    return '<div class="pdxpa-seat" data-pdxil-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/il">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxil-cand="' + esc(c.pid || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxil-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxil-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this Illinois Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set an Illinois address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Illinois location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s roll call that records it.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-il-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxil-boot', 'painted');
  }

  root.PDXIlBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
