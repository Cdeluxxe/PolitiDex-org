/* ═══════════════════════════════════════════════════════════════════════════
   fl-ballot-2026.js — Florida's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio and Wisconsin files set. This file holds the
   Florida House and Florida Senate races Florida's own reporting names as
   real contests on the November 3, 2026 general-election ballot, with a
   sitting member running, and the formal acts on file for the people in
   them. It is not a roster: every incumbent it names by pid already has a
   thin shell in cmp-data.js, and those shells are not touched.

   WHY SO FEW OF 140. Florida Democrats filed a challenger in nearly every
   seat (Division of Elections candidate list), so a name on the ballot is not
   a race. These are the seats Florida reporting covers as competitive: the
   two crossover seats, the special-election rematches, the party switcher,
   and the swing seats Florida Politics previews as close.

   A CHALLENGER WITH A LEGISLATIVE RECORD AND NO ROSTER ROW (Josie Tomkow,
   House District 39 and then 51, 2018–2026) is keyed here by name, not pid:
   the acts are listed under the name and no file is linked, because a file
   would be a new roster row. A challenger with no legislative record is
   named, with party, and "No formal act on file".

   LEFT OUT, AND WHY. Open seats (among them Senate 8, 22, 26, 28 and 30) have
   no sitting member running.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote, read from the vote record
   the Florida Legislature publishes on flsenate.gov for each bill, which each
   act links to; the measure links to its bill page. A member listed as not
   voting or excused has no act on that vote. Nothing here is a score, a tally
   of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the enrolled bill's
   own title on flsenate.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other six states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/fl — mounted into #pdx-fl-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXFlBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Florida';
  var LEG = 'https://www.flsenate.gov/Session/Bill/';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'CS/SB 4-F (2026F)': {
      title: 'Property tax administration', status: 'law',
      act: 'Approved by the Governor June 24, 2026 (Chapter 2026-240)', session: '2026F Special Session',
      effect: 'Revised the limits on the maximum property tax millage rates local governments may levy.',
      from: 'Enrolled title: “An act relating to property tax administration; … revising limitations on the maximum millage rate that may be levied by certain units of government…”',
      source: LEG + '2026F/4'
    },
    'HB 5001-E (2026E)': {
      title: 'General Appropriations Act, 2026–27', status: 'law',
      act: 'Approved by the Governor with line-item vetoes June 29, 2026 (Chapter 2026-232)', session: '2026E Special Session',
      effect: 'Set the state budget for the 2026–27 fiscal year.',
      from: 'Bill title: “General Appropriations Act”, with its companion “Implementing the 2026-2027 General Appropriations Act”',
      source: LEG + '2026E/5001'
    },
    'HB 1-D (2026D)': {
      title: 'Congressional districts of the state', status: 'law',
      act: 'Approved by the Governor May 4, 2026 (Chapter 2026-229)', session: '2026D Special Session',
      effect: 'Redrew the boundaries of Florida’s congressional districts.',
      from: 'Enrolled title: “An act establishing the congressional districts of the state; … redistricting the state’s congressional districts…”',
      source: LEG + '2026D/1'
    },
    'SB 2-C (2025C)': {
      title: 'Immigration', status: 'law',
      act: 'Approved by the Governor Feb. 13, 2025 (Chapter 2025-1)', session: '2025C Special Session',
      effect: 'Created a State Board of Immigration Enforcement and barred driver licenses for unauthorized immigrants.',
      from: 'Enrolled title: “An act relating to immigration; … prohibiting the Department of Highway Safety and Motor Vehicles from issuing a driver license or identification card to unauthorized aliens… creating the State Board of Immigration Enforcement…”',
      source: LEG + '2025C/2'
    }
  };

  // ── THE ROLL CALLS ────────────────────────────────────────────────────────
  // [measure, what, date, the vote record (session/bill/Vote/file),
  //  { pid or @name-key: 'Yea' | 'Nay' }]
  var ACTS = [
    ['CS/SB 4-F (2026F)', 'House passage', '2026-06-02', '2026F/4F/Vote/HouseVote_s00004Fc1902.PDF',
      { booth_fl: 'Yea', gonzalez_pittman_fl: 'Yea', gregory_fl: 'Nay', tendrich_fl: 'Nay', gerwig_fl: 'Yea',
        cassel_fl: 'Yea', basabe_fl: 'Yea' }],
    ['CS/SB 4-F (2026F)', 'Senate passage', '2026-06-02', '2026F/4F/Vote/SenateVote_s00004Fc1007.PDF',
      { brodeur_fl: 'Yea', nathan_fl: 'Nay', calatayud_fl: 'Yea' }],
    ['HB 5001-E (2026E)', 'Senate conference report', '2026-05-29', '2026E/5001E/Vote/SenateVote_h05001E__006.PDF',
      { brodeur_fl: 'Yea', nathan_fl: 'Yea', calatayud_fl: 'Yea' }],
    // Basabe is not recorded on this vote.
    ['HB 5001-E (2026E)', 'House conference report', '2026-05-29', '2026E/5001E/Vote/HouseVote_h05001E__884.PDF',
      { booth_fl: 'Yea', gonzalez_pittman_fl: 'Yea', gregory_fl: 'Yea', tendrich_fl: 'Yea', gerwig_fl: 'Yea',
        cassel_fl: 'Yea' }],
    ['HB 1-D (2026D)', 'Senate passage', '2026-04-29', '2026D/1D/Vote/SenateVote_h00001D__004.PDF',
      { brodeur_fl: 'Yea', nathan_fl: 'Nay', calatayud_fl: 'Nay' }],
    ['HB 1-D (2026D)', 'House passage', '2026-04-29', '2026D/1D/Vote/HouseVote_h00001D__863.PDF',
      { booth_fl: 'Yea', gonzalez_pittman_fl: 'Yea', gregory_fl: 'Nay', tendrich_fl: 'Nay', gerwig_fl: 'Yea',
        cassel_fl: 'Nay', basabe_fl: 'Yea' }],
    // 2025C: Gregory and Nathan took their seats in March 2026; Tomkow held House District 51.
    ['SB 2-C (2025C)', 'House passage', '2025-02-13', '2025C/2C/Vote/HouseVote_s00002C__013.PDF',
      { booth_fl: 'Yea', gonzalez_pittman_fl: 'Yea', tendrich_fl: 'Nay', gerwig_fl: 'Yea', cassel_fl: 'Yea',
        basabe_fl: 'Yea', '@tomkow': 'Yea' }],
    ['SB 2-C (2025C)', 'Senate passage', '2025-02-13', '2025C/2C/Vote/SenateVote_s00002C__004.PDF',
      { brodeur_fl: 'Yea', calatayud_fl: 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // Every House seat and the even-numbered Senate seats are on the 2026
  // ballot; these are the seats Florida reporting covers as real contests,
  // with a sitting member running and the opponent named.
  var FP = 'https://floridapolitics.com/archives/';
  var RACES = [
    { chamber: 'statesenate', district: 10, where: 'Seminole County and northern Orange County', source: FP + '815694-john-lowndes-wins-democratic-primary-in-sd-10-turns-attention-to-jason-brodeur/', field: [
      { name: 'Jason Brodeur', party: 'R', pid: 'brodeur_fl', incumbent: true },
      { name: 'John Lowndes', party: 'D', note: 'Mayor of Maitland' }] },
    { chamber: 'statesenate', district: 14, where: 'Hillsborough County', source: 'https://floridaphoenix.com/2026/03/24/florida-democrats-flip-two-seats-in-special-legislative-elections/', field: [
      { name: 'Brian Nathan', party: 'D', pid: 'nathan_fl', incumbent: true, note: 'Won the March 2026 special election' },
      { name: 'Josie Tomkow', party: 'R', key: '@tomkow', note: 'Former State Representative, House Districts 39 and 51 (2018–2026)' }] },
    { chamber: 'statesenate', district: 38, where: 'Coral Gables to Key Biscayne, Miami-Dade County', source: 'https://floridaphoenix.com/voter-guides/contests/2026-general-florida-senate-sd-38/', field: [
      { name: 'Alexis Calatayud', party: 'R', pid: 'calatayud_fl', incumbent: true },
      { name: 'Richard Lamondin Jr.', party: 'D' },
      { name: 'Jeffrey “Doc” Solomon', party: 'NPA' }] },
    { chamber: 'statehouse', district: 35, where: 'Orange and Osceola counties', source: FP + '826137-erika-booth-defends-her-seat-against-spirited-challenger-eric-gray-in-hd-35/', field: [
      { name: 'Erika Booth', party: 'R', pid: 'booth_fl', incumbent: true },
      { name: 'Eric Gray', party: 'D' }] },
    { chamber: 'statehouse', district: 65, where: 'Hillsborough County', source: FP + '826391-karen-gonzalez-pittman-seeks-third-term-in-hd-65-race-against-ben-braver', field: [
      { name: 'Karen Gonzalez Pittman', party: 'R', pid: 'gonzalez_pittman_fl', incumbent: true },
      { name: 'Ben Braver', party: 'D' }] },
    { chamber: 'statehouse', district: 87, where: 'Palm Beach Gardens, Jupiter and Juno Beach', source: FP + '814666-jon-maples-comfortably-wins-nomination-another-shot-at-emily-gregory-in-hd-87/', field: [
      { name: 'Emily Gregory', party: 'D', pid: 'gregory_fl', incumbent: true, note: 'Won the March 2026 special election' },
      { name: 'Jon Maples', party: 'R' }] },
    { chamber: 'statehouse', district: 89, where: 'Greenacres, Lake Worth Beach and Palm Springs', source: FP + '815720-cathy-higgins-wins-gop-primary-for-hd-89-in-palm-beach-county/', field: [
      { name: 'Debra Tendrich', party: 'D', pid: 'tendrich_fl', incumbent: true },
      { name: 'Cathy Higgins', party: 'R', note: 'Former Mayor of Atlantis' }] },
    { chamber: 'statehouse', district: 93, where: 'Wellington and suburban Lake Worth', source: FP + '788050-august-has-what-it-takes-lois-frankel-emily-gregory-back-august-mangeney-for-hd-93/', field: [
      { name: 'Anne Gerwig', party: 'R', pid: 'gerwig_fl', incumbent: true },
      { name: 'August Mangeney', party: 'D' }] },
    { chamber: 'statehouse', district: 101, where: 'Hollywood, Hallandale Beach, Dania Beach and Davie', source: FP + '826243-up-against-todd-delmay-in-hd-101-hillary-cassel-is-set-to-face-voters-for-first-time-since-switching-parties/', field: [
      { name: 'Hillary Cassel', party: 'R', pid: 'cassel_fl', incumbent: true },
      { name: 'Todd Delmay', party: 'D' }] },
    { chamber: 'statehouse', district: 106, where: 'Miami Beach to Aventura', source: FP + '814202-lucia-baez-geller-to-challenge-embattled-fabian-basabe-after-primary-win-in-hd-106/', field: [
      { name: 'Fabián Basabe', party: 'R', pid: 'basabe_fl', incumbent: true },
      { name: 'Lucia Báez-Geller', party: 'D', note: 'Former Miami-Dade School Board member' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'fl-' + chamber + '-' + num(district); }
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
        vote: '', source: LEG + a[3], how: how, effect: m.effect, billSource: m.source });
    });
    return out.map(function (a, i) { return [a, i]; })
      .sort(function (x, y) { return x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]; })
      .map(function (x) { return x[0]; });
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' District ' + num(district);
  }
  // Florida elects every House seat, and its even-numbered Senate seats, in 2026.
  function onBallot2026(chamber, district) {
    return num(district) > 0 && (chamber === 'statehouse' || (chamber === 'statesenate' && num(district) % 2 === 0));
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
    return '<div class="pdxpa-seat" data-pdxfl-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/fl">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxfl-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxfl-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxfl-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">District ' + esc(num(lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: Florida elects this Senate seat in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Florida address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Florida location has no State House or State Senate district yet. ' +
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
    var host = document.getElementById('pdx-fl-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxfl-boot', 'painted');
  }

  root.PDXFlBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
