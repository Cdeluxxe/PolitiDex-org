/* ═══════════════════════════════════════════════════════════════════════════
   tx-ballot-2026.js — Texas's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona and New York files
   set. This file holds the State House and State Senate races Texas's own
   reporting names as competitive or targeted on the November 3, 2026
   general-election ballot, with a sitting member running, and the formal acts
   on file for the people in them. Every House seat and 16 of the 31 Senate
   seats are on the 2026 ballot. Every incumbent it names by pid already has a
   thin shell in cmp-data.js, and those shells are not touched.

   EVERY NAME ON THE BALLOT. Each race lists every candidate the Secretary of
   State's 2026 Ballot Certification Report certifies for that seat, which
   `filed` links; there is no certified write-in in any of them. No challenger
   here has a record in the Legislature: each is named, with party, and "No
   formal act on file", and gets no file. Taylor Rehmet (Senate 9) was seated
   after a 2026 special election and the Legislature has not met since, so he
   too has no act on file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (House 41, 94 and
   118) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded vote in the 89th Legislature, read
   from the House Journal (journals.house.texas.gov) or the Senate Journal
   (journals.senate.texas.gov) for that day, which each act links to; the
   measure links to its bill history on capitol.texas.gov. A member listed as
   absent or present, not voting has no act on that vote. A Senate vote the
   journal prints as unanimous ("Yeas 31, Nays 0") is a yea for every member
   present. Nothing here is a score, a tally of a member's record, a ranking
   or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   caption on capitol.texas.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other nine states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/tx — mounted into #pdx-tx-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXTxBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Texas';
  var TLO = 'https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=';
  var HJ = 'https://journals.house.texas.gov/hjrnl/89r/html/';
  var SJ = 'https://journals.senate.texas.gov/sjrnl/89r/html/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'SB 2': {
      title: 'Education savings account program', status: 'law',
      act: 'Signed May 3, 2025', session: '89th Legislature, Regular Session',
      effect: 'Created an education savings account program that pays for private schooling and other approved education costs.',
      from: 'Caption: “Relating to the establishment of an education savings account program.”',
      source: TLO + 'SB2'
    },
    'HB 2': {
      title: 'Public education and public school finance', status: 'law',
      act: 'Signed June 20, 2025', session: '89th Legislature, Regular Session',
      effect: 'Changed the state’s public education and public school finance laws.',
      from: 'Caption: “Relating to public education and public school finance.”',
      source: TLO + 'HB2'
    },
    'SB 1': {
      title: 'General Appropriations Act, 2026–27', status: 'law',
      act: 'Signed with line-item vetoes June 22, 2025', session: '89th Legislature, Regular Session',
      effect: 'Made the state’s general appropriations for the 2026–27 biennium.',
      from: 'Caption: “General Appropriations Bill.”',
      source: TLO + 'SB1'
    }
  };

  // ── THE RECORDED VOTES ────────────────────────────────────────────────────
  // [measure, what, date, the journal page that records the vote,
  //  { pid: 'Yea' | 'Nay' }]
  var ACTS = [
    ['SB 1', 'House adoption of the conference report', '2025-05-31', HJ + '89RDAY79FINAL.HTM',
      { villalobos_tx: 'Yea', janie_lopez_tx: 'Yea', harris_davila_tx: 'Yea', richardson_tx: 'Nay', leach_tx: 'Yea', plesa_tx: 'Yea', eddie_morales_tx: 'Yea', meyer_tx: 'Yea', button_tx: 'Yea', lahood_tx: 'Yea', hull_tx: 'Yea' }],
    ['SB 1', 'Senate adoption of the conference report', '2025-05-31', SJ + '89RSJ05-31-F.HTM',
      { gutierrez_tx: 'Yea', zaffirini_tx: 'Yea' }],
    ['HB 2', 'House concurrence in Senate amendments', '2025-05-29', HJ + '89RDAY77FINAL.HTM',
      { villalobos_tx: 'Yea', janie_lopez_tx: 'Yea', harris_davila_tx: 'Yea', richardson_tx: 'Yea', plesa_tx: 'Yea', eddie_morales_tx: 'Yea', meyer_tx: 'Yea', button_tx: 'Yea', lahood_tx: 'Yea', hull_tx: 'Yea' }],
    ['HB 2', 'Senate passage', '2025-05-23', SJ + '89RSJ05-23-F.HTM',
      { gutierrez_tx: 'Yea', zaffirini_tx: 'Yea' }],
    ['SB 2', 'Senate concurrence in House amendments', '2025-04-24', SJ + '89RSJ04-24-F.HTM',
      { gutierrez_tx: 'Nay', zaffirini_tx: 'Nay' }],
    ['SB 2', 'House passage', '2025-04-17', HJ + '89RDAY46FINAL.HTM',
      { villalobos_tx: 'Yea', janie_lopez_tx: 'Yea', harris_davila_tx: 'Yea', richardson_tx: 'Yea', leach_tx: 'Yea', plesa_tx: 'Nay', eddie_morales_tx: 'Nay', meyer_tx: 'Yea', button_tx: 'Yea', lahood_tx: 'Yea', hull_tx: 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Texas reporting names these seats as competitive or as targets for
  // November, each with a sitting member on the ballot. `filed` is the
  // Secretary of State's certification of every name on the ballot.
  var TRIB_OCT = 'https://www.texastribune.org/2026/10/06/texas-2026-elections-competitive-races-us-congress-state-legislature/';
  var TRIB_JUN = 'https://www.texastribune.org/2026/06/03/texas-house-national-democrats-target-list-gop-districts-2026-midterms-legislature/';
  var SAR = 'https://sanantonioreport.org/top-races-to-watch-this-november-2026-election/';
  var CERT = 'https://www.sos.texas.gov/elections/forms/2026-ballot-cert.pdf';
  var RACES = [
    { chamber: 'statesenate', district: 9, where: 'Northern Fort Worth area', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Taylor Rehmet', party: 'D', pid: 'rehmet_tx', incumbent: true, note: 'Seated after the 2026 special election' },
      { name: 'Leigh Wambsganss', party: 'R' }] },
    { chamber: 'statesenate', district: 19, where: 'San Antonio to the border and West Texas', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Roland Gutiérrez', party: 'D', pid: 'gutierrez_tx', incumbent: true },
      { name: 'Marcus Cardenas', party: 'R' }] },
    { chamber: 'statesenate', district: 21, where: 'Laredo and South Texas', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Judith Zaffirini', party: 'D', pid: 'zaffirini_tx', incumbent: true },
      { name: 'Julie Dahlberg', party: 'R' }] },
    { chamber: 'statehouse', district: 34, where: 'Corpus Christi', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Denise Villalobos', party: 'R', pid: 'villalobos_tx', incumbent: true },
      { name: 'Stephanie Guerrero Sáenz', party: 'D' }] },
    { chamber: 'statehouse', district: 37, where: 'San Benito and the Rio Grande Valley', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Janie Lopez', party: 'R', pid: 'janie_lopez_tx', incumbent: true },
      { name: 'Oziel “Ozzie” Ochoa Jr.', party: 'D' }] },
    { chamber: 'statehouse', district: 52, where: 'Round Rock', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Caroline Harris Davila', party: 'R', pid: 'harris_davila_tx', incumbent: true },
      { name: 'Chris Jimenez', party: 'D' }] },
    { chamber: 'statehouse', district: 61, where: 'Collin County', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Keresa Richardson', party: 'R', pid: 'richardson_tx', incumbent: true },
      { name: 'Brittany Black', party: 'D' },
      { name: 'Anissa Chilmeran', party: 'G' }] },
    { chamber: 'statehouse', district: 67, where: 'Collin County', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Jeff Leach', party: 'R', pid: 'leach_tx', incumbent: true },
      { name: 'Jordan Wheatley', party: 'D' }] },
    { chamber: 'statehouse', district: 70, where: 'Collin County', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Mihaela Plesa', party: 'D', pid: 'plesa_tx', incumbent: true },
      { name: 'George Flint', party: 'R' }] },
    { chamber: 'statehouse', district: 74, where: 'Eagle Pass and the border', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Eddie Morales', party: 'D', pid: 'eddie_morales_tx', incumbent: true },
      { name: 'Robert Garza', party: 'R' }] },
    { chamber: 'statehouse', district: 108, where: 'Dallas County, around University Park', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Morgan Meyer', party: 'R', pid: 'meyer_tx', incumbent: true },
      { name: 'Allison Mitchell', party: 'D' }] },
    { chamber: 'statehouse', district: 112, where: 'Dallas County, around Garland', source: TRIB_OCT, filed: CERT, field: [
      { name: 'Angie Chen Button', party: 'R', pid: 'button_tx', incumbent: true },
      { name: 'Zach Herbert', party: 'D' }] },
    { chamber: 'statehouse', district: 121, where: 'North San Antonio', source: SAR, filed: CERT, field: [
      { name: 'Marc LaHood', party: 'R', pid: 'lahood_tx', incumbent: true },
      { name: 'Zack Dunn', party: 'D' }] },
    { chamber: 'statehouse', district: 138, where: 'Northwest Houston', source: TRIB_JUN, filed: CERT, field: [
      { name: 'Lacey Hull', party: 'R', pid: 'hull_tx', incumbent: true },
      { name: 'Tyler Smith', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'tx-' + chamber + '-' + num(district); }
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
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Texas elects every House seat in 2026, and 16 of its 31 Senate seats —
  // the ones the Secretary of State's ballot certification lists.
  var SENATE_2026 = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 9: 1, 11: 1, 13: 1, 18: 1, 19: 1, 21: 1, 22: 1, 24: 1, 26: 1, 28: 1, 31: 1 };
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
    return '<div class="pdxpa-seat" data-pdxtx-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/tx">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxtx-cand="' + esc(c.pid || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxtx-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxtx-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this Texas Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Texas address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Texas location has no State House or State Senate district yet. ' +
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
    var host = document.getElementById('pdx-tx-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxtx-boot', 'painted');
  }

  root.PDXTxBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
