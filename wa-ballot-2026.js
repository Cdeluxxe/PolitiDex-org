/* ═══════════════════════════════════════════════════════════════════════════
   wa-ballot-2026.js — Washington's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York, Texas,
   Illinois, Minnesota, Colorado, Nevada and California files set. This file
   holds the State House and State Senate races in the legislative districts
   Washington reporting names as the swing districts of the November 3, 2026
   general election (the 10th, 17th, 18th and 26th for the House; the 26th and
   35th for the Senate), every seat there with a sitting member running, and
   the formal acts on file for the people in them. Every House seat and 24 of
   the 49 Senate seats are on the 2026 ballot.

   A HOUSE SEAT IS A POSITION. Each district elects two Representatives, each to
   its own seat (Position 1 and Position 2), so a House race is keyed by
   district AND position — wa-statehouse-<n>-p<k> — and has its own board. A
   Senate race is keyed by district alone, as every other state's is.

   EVERY NAME ON THE BALLOT. Washington's primary is top-two, so each race has
   exactly the two names the Secretary of State's official results for the
   August 4, 2026 primary advance for that seat, which `filed` links, spelled
   as the results spell them. No challenger has a record in the Legislature:
   each is named, with party preference, and "No formal act on file", and gets
   no file. The sitting members are read off the Legislature's own member list
   (wslwebservices.leg.wa.gov), and each has a roster row in cmp-data.js.

   LEFT OUT, AND WHY. In the same districts, House 26 Position 2 and the
   42nd's Senate seat are open: no sitting member is running.

   WHAT A FORMAL ACT IS HERE. A final-passage floor vote — third reading, or the
   vote on the conference committee's report — read from the bill's roll calls
   in the Legislature's own legislative web service, which each act links to;
   the measure links to the bill's summary page on leg.wa.gov. A member recorded as absent or excused has no
   act on that vote. Nothing here is a score, a tally of a member's record, a
   ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, done tense for a law. Each is written from the bill's own
   description in the Legislature's record, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other fifteen states',
   sharing their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/wa — mounted into #pdx-wa-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXWaBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Washington';
  // The bill's summary page, and the Legislature's own record of every roll
  // call on it (its legislative web service, 2025–26 biennium).
  function bill(n) { return 'https://app.leg.wa.gov/billsummary/?BillNumber=' + n + '&Year=2025&Initiative=false'; }
  function votes(n) { return 'https://wslwebservices.leg.wa.gov/LegislationService.asmx/GetRollCalls?biennium=2025-26&billNumber=' + n; }

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' (chaptered) — each act line names its chapter.
  var MEASURES = {
    'ESSB 5167 (2025)': {
      title: 'Operating budget, 2025–27', status: 'law',
      act: 'Signed May 20, 2025, with partial veto (Chapter 424)', session: '2025 Regular Session',
      effect: 'Made the state’s operating appropriations for the 2025–27 biennium and supplemental ones for 2023–25.',
      from: 'Description: “Making 2025-2027 fiscal biennium operating appropriations and 2023-2025 fiscal biennium second supplemental operating appropriations.”',
      source: bill(5167), votes: votes(5167)
    },
    'ESHB 2081 (2025)': {
      title: 'Business and occupation tax', status: 'law',
      act: 'Signed May 20, 2025 (Chapter 420)', session: '2025 Regular Session',
      effect: 'Raised business and occupation tax rates and surcharges, and added a temporary surcharge on large companies.',
      from: 'Description: “Modifying business and occupation tax surcharges, rates, and the advanced computing surcharge cap… and creating a temporary business and occupation tax surcharge on large companies.”',
      source: bill(2081), votes: votes(2081)
    },
    'ESSB 5161 (2025)': {
      title: 'Transportation budget, 2025–27', status: 'law',
      act: 'Signed May 20, 2025, with partial veto (Chapter 416)', session: '2025 Regular Session',
      effect: 'Made the state’s transportation appropriations for the 2025–27 biennium.',
      from: 'Description: “Addressing transportation fiscal matters.” Title: “AN ACT Relating to transportation fiscal matters.”',
      source: bill(5161), votes: votes(5161)
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, { pid: vote }] — the final floor vote in each
  // chamber, 'Yea' or 'Nay' as the bill's roll call records it. Each act links
  // to that page. A member recorded as absent or excused is left out.
  var ACTS = [
    ['ESSB 5167 (2025)', 'Senate final passage', '2025-04-27',
      { krishnadasan_wa: 'Nay', macewen_wa: 'Nay' }],
    ['ESSB 5167 (2025)', 'House final passage', '2025-04-27',
      { shavers_wa: 'Nay', dave_paul_wa: 'Yea', kevin_waters_wa: 'Nay', stuebe_wa: 'Nay',
        mcclintock_wa: 'Nay', ley_wa: 'Nay', adison_richards_wa: 'Nay' }],
    ['ESSB 5161 (2025)', 'Senate final passage', '2025-04-27',
      { krishnadasan_wa: 'Nay', macewen_wa: 'Nay' }],
    ['ESSB 5161 (2025)', 'House final passage', '2025-04-27',
      { shavers_wa: 'Nay', dave_paul_wa: 'Yea', kevin_waters_wa: 'Nay', stuebe_wa: 'Yea',
        mcclintock_wa: 'Yea', ley_wa: 'Nay', adison_richards_wa: 'Yea' }],
    ['ESHB 2081 (2025)', 'Senate final passage', '2025-04-26',
      { krishnadasan_wa: 'Nay', macewen_wa: 'Nay' }],
    ['ESHB 2081 (2025)', 'House final passage', '2025-04-22',
      { shavers_wa: 'Nay', dave_paul_wa: 'Nay', kevin_waters_wa: 'Nay', stuebe_wa: 'Nay',
        mcclintock_wa: 'Nay', ley_wa: 'Nay', adison_richards_wa: 'Nay' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // The swing districts the Washington press names for 2026 (McClatchy's
  // Washington papers for the House; the Washington State Standard for the
  // Senate), every seat there with a sitting member on the ballot. `filed` is
  // the Secretary of State's official results for the August 4 primary, which
  // name the two who advance.
  var SWING = 'https://www.yakimaherald.com/news/northwest/which-washington-races-are-most-competitive-in-2026-here-are-the-swing-districts/article_2d6d8231-3247-41f1-a84b-6013a1d2cef1.html';
  var WSS = 'https://washingtonstatestandard.com/2026/05/08/a-dozen-legislative-races-to-watch-as-washingtons-election-season-revs-up/';
  var SOS = 'https://app.enhancedvoting.com/results/public/washington/elections/20260804';
  var RACES = [
    { chamber: 'statesenate', district: 26, where: 'Gig Harbor, Port Orchard and the Key Peninsula', source: SWING, filed: SOS, field: [
      { name: 'Deborah Krishnadasan', party: 'D', pid: 'krishnadasan_wa', incumbent: true },
      { name: 'Gary Parker', party: 'R' }] },
    { chamber: 'statesenate', district: 35, where: 'Mason County and parts of Kitsap and Thurston counties', source: WSS, filed: SOS, field: [
      { name: 'Drew C MacEwen', party: 'R', pid: 'macewen_wa', incumbent: true },
      { name: 'Carolina Mejia', party: 'D' }] },
    { chamber: 'statehouse', district: 10, position: 1, where: 'Island County and parts of Skagit and Snohomish counties', source: SWING, filed: SOS, field: [
      { name: 'Clyde Shavers', party: 'D', pid: 'shavers_wa', incumbent: true },
      { name: 'Robert (Chili) Hicks', party: 'R' }] },
    { chamber: 'statehouse', district: 10, position: 2, where: 'Island County and parts of Skagit and Snohomish counties', source: SWING, filed: SOS, field: [
      { name: 'Dave Paul', party: 'D', pid: 'dave_paul_wa', incumbent: true },
      { name: 'Tim Hazelo', party: 'R' }] },
    { chamber: 'statehouse', district: 17, position: 1, where: 'East Vancouver and Clark County', source: SWING, filed: SOS, field: [
      { name: 'Kevin Waters', party: 'R', pid: 'kevin_waters_wa', incumbent: true },
      { name: 'Ben Christly', party: 'D' }] },
    { chamber: 'statehouse', district: 17, position: 2, where: 'East Vancouver and Clark County', source: SWING, filed: SOS, field: [
      { name: 'David Stuebe', party: 'R', pid: 'stuebe_wa', incumbent: true },
      { name: 'Diana H. Perez', party: 'D' }] },
    { chamber: 'statehouse', district: 18, position: 1, where: 'Part of Clark County', source: SWING, filed: SOS, field: [
      { name: 'Stephanie McClintock', party: 'R', pid: 'mcclintock_wa', incumbent: true },
      { name: 'Randi L. Knott', party: 'D' }] },
    { chamber: 'statehouse', district: 18, position: 2, where: 'Part of Clark County', source: SWING, filed: SOS, field: [
      { name: 'John Ley', party: 'R', pid: 'ley_wa', incumbent: true },
      { name: 'Deken Letinich', party: 'D' }] },
    { chamber: 'statehouse', district: 26, position: 1, where: 'Gig Harbor, Port Orchard and the Key Peninsula', source: SWING, filed: SOS, field: [
      { name: 'Adison Richards', party: 'D', pid: 'adison_richards_wa', incumbent: true },
      { name: 'David Olson', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  // A House seat is a district AND a position; a Senate seat is a district.
  function seatKey(chamber, district, position) {
    var p = chamber === 'statehouse' ? num(position) : 0;
    return 'wa-' + chamber + '-' + num(district) + (p ? '-p' + p : '');
  }
  var BY_SEAT = {};
  RACES.forEach(function (r) { r.seat = seatKey(r.chamber, r.district, r.position); BY_SEAT[r.seat] = r; });

  function race(chamber, district, position) { return BY_SEAT[seatKey(chamber, district, position)] || null; }
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
      var how = a[3][who];
      if (!how) return;
      var m = MEASURES[a[0]];
      out.push({ measure: a[0], title: m.title, status: m.status, law: m.act || '', what: a[1], date: a[2],
        vote: '', source: m.votes, how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function districtText(chamber, district, position) {
    var p = chamber === 'statehouse' ? num(position) : 0;
    return 'District ' + num(district) + (p ? ', Position ' + p : '');
  }
  function seatLabel(chamber, district, position) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' ' + districtText(chamber, district, position);
  }
  // Washington elects both positions of every House district in 2026, and 24
  // of its 49 Senate seats (the Secretary of State's 2026 primary results).
  var SENATE_2026 = {};
  [6, 7, 8, 13, 15, 21, 26, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 42, 43, 44, 45, 46, 47, 48]
    .forEach(function (d) { SENATE_2026[d] = 1; });
  function onBallot2026(chamber, district) {
    var n = num(district);
    return n > 0 && n <= 49 && (chamber === 'statehouse' || (chamber === 'statesenate' && !!SENATE_2026[n]));
  }
  // The seats one level stands for: a Senate level is one seat; a House level
  // is its two positions, each with the member the resolver placed on it.
  function seatsOf(lv) {
    if (lv.key !== 'statehouse') return [lv];
    var held = {};
    (lv.positions || []).forEach(function (p) { held[p.position] = p.pid || null; });
    return [1, 2].map(function (p) {
      return { key: lv.key, seat: lv.seat, district: lv.district, position: p, pid: held[p] || null };
    });
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
    var r = level ? race(level.key || level.seat, level.district, level.position) : null;
    if (!r && level && (level.key || level.seat) === 'statehouse') {
      r = raceForPid(pid);
      if (r && (r.chamber !== 'statehouse' || num(r.district) !== num(level.district))) r = null;
    }
    if (r && !r.field.some(function (c) { return c.pid === pid; })) r = null;
    return '<div class="pdxpa-seat" data-pdxwa-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/wa">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxwa-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxwa-seat="' + esc(r.seat) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(r.chamber, r.district, r.position)) +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxwa-seat="' + esc(seatKey(lv.key, lv.district, lv.position)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district, lv.position)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">' + esc(districtText(lv.key, lv.district, lv.position)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this Washington Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Washington address in the ' +
        '<a href="/find">district finder</a> and this page lists the State House and State Senate races on your ' +
        esc(ELECTION) + ' ballot, with each candidate’s formal record.</p>' +
        '<h2 class="pdxpa-all-hd">Contested seats on file</h2>' +
        '<ul class="pdxpa-all">' + RACES.map(function (r) {
          return '<li>' + esc(seatLabel(r.chamber, r.district, r.position)) + ' · ' + esc(r.where) + ' · ' +
            esc(r.field.map(function (c) { return c.name; }).join(' vs. ')) + '</li>';
        }).join('') + '</ul>';
    }
    var levels = (reps.levels || []).filter(function (l) {
      return (l.key === 'statesenate' || l.key === 'statehouse') && num(l.district);
    });
    if (!levels.length) {
      return '<p class="pdxpa-lede">Your saved Washington location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = [];
    levels.forEach(function (lv) {
      seatsOf(lv).forEach(function (s) {
        var r = race(s.key, s.district, s.position);
        body.push(r ? raceHtml(r) : quietSeatHtml(s));
      });
    });
    body = body.join('');
    return '<p class="pdxpa-lede">Your State Senate seat and both of your State House positions, as your saved address places them. ' +
      'Each formal act links to the Legislature’s own record of the vote.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-wa-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxwa-boot', 'painted');
  }

  root.PDXWaBallot = {
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
