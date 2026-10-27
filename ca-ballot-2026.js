/* ═══════════════════════════════════════════════════════════════════════════
   ca-ballot-2026.js — California's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York, Texas,
   Illinois, Minnesota, Colorado and Nevada files set. This file holds the
   State Assembly and State Senate races CalMatters names as races to watch on
   the November 3, 2026 general-election ballot, with a sitting member
   running, and the formal acts on file for the people in them. Every
   Assembly seat and the 20 even-numbered Senate seats are on the 2026 ballot.
   Each sitting member it names by pid already has a roster row in cmp-data.js,
   so the roster is not touched.

   EVERY NAME ON THE BALLOT. California's primary is top-two, so each race
   has exactly the two names the Secretary of State's Official Certified List
   of Candidates (Aug. 27, 2026) prints for that seat, which `filed` links,
   spelled as the list spells them. No challenger has a record in the
   Legislature: each is named, with party, and "No formal act on file", and
   gets no file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Assembly 12 and
   27; Senate 14, 24, 26 and 40) have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A final floor vote — third reading, or the
   house of origin's concurrence in the other house's amendments — read from
   the Legislature's own vote record for the bill (leginfo.legislature.ca.gov,
   the bill's Votes page), which each act links to; the measure links to the
   bill's text page there. A member recorded as not voting has no act on that
   vote. Nothing here is a score, a tally of a member's record, a ranking or a
   match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, done tense for a law. Each is written from the chaptered text's
   own title or digest, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other fourteen states',
   sharing their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/ca — mounted into #pdx-ca-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXCaBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'California';
  var LEGINFO = 'https://leginfo.legislature.ca.gov/faces/';
  function bill(id) { return LEGINFO + 'billNavClient.xhtml?bill_id=' + id; }
  function votes(id) { return LEGINFO + 'billVotesClient.xhtml?bill_id=' + id; }

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' (chaptered) — each act line names its chapter.
  var MEASURES = {
    'SB 101 (2025)': {
      title: 'Budget Act of 2025', status: 'law',
      act: 'Approved June 27, 2025 (Chapter 4)', session: '2025–26 Regular Session',
      effect: 'Made the state’s appropriations for the 2025–26 fiscal year as the Budget Act of 2025.',
      from: 'Title: “An act making appropriations for the support of the government of the State of California and for several public purposes… relating to the state budget, to take effect immediately, budget bill.”',
      source: bill('202520260SB101'), votes: votes('202520260SB101')
    },
    'SB 131 (2025)': {
      title: 'Public resources: environmental review exemptions', status: 'law',
      act: 'Approved June 30, 2025 (Chapter 24)', session: '2025–26 Regular Session',
      effect: 'Exempted housing-element rezonings, farmworker housing, wildfire fuel work and other projects from state environmental review.',
      from: 'Digest: “This bill would exempt from CEQA, except as provided, a rezoning that implements the schedule of actions contained in an approved housing element… specified new agricultural employee housing projects… wildfire risk reduction projects…”',
      source: bill('202520260SB131'), votes: votes('202520260SB131')
    },
    'ACA 8 (2025)': {
      title: 'Election Rigging Response Act (redistricting)', status: 'law',
      act: 'Filed Aug. 21, 2025 (Res. Chapter 156)', session: '2025–26 Regular Session',
      effect: 'Sent voters a constitutional amendment to use Legislature-drawn congressional maps through 2030, approved as Proposition 50.',
      from: 'Title: “A resolution to propose to the people of the State of California an amendment to the Constitution of the State, by adding Section 4 to Article XXI thereof, relating to redistricting.”',
      source: bill('202520260ACA8'), votes: votes('202520260ACA8')
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, { pid: vote }] — the final floor vote in each house,
  // 'Aye' or 'No' as the bill's Votes page records it. Each act links to that
  // page. A member recorded as not voting is left out.
  var ACTS = [
    ['ACA 8 (2025)', 'Senate final passage', '2025-08-21',
      { hurtado_ca: 'Aye', blakespear_ca: 'Aye' }],
    ['ACA 8 (2025)', 'Assembly final passage', '2025-08-21',
      { hoover_ca: 'No', jeff_gonzalez_ca: 'No', wallis_ca: 'No', castillo_ca: 'No', davies_ca: 'No' }],
    ['SB 131 (2025)', 'Senate concurrence, final passage', '2025-06-30',
      { hurtado_ca: 'Aye' }],
    ['SB 131 (2025)', 'Assembly final passage', '2025-06-30',
      { hoover_ca: 'Aye', wallis_ca: 'Aye', davies_ca: 'Aye' }],
    ['SB 101 (2025)', 'Senate concurrence, final passage', '2025-06-13',
      { hurtado_ca: 'Aye', blakespear_ca: 'Aye' }],
    ['SB 101 (2025)', 'Assembly final passage', '2025-06-13',
      { hoover_ca: 'No', jeff_gonzalez_ca: 'No', castillo_ca: 'No', davies_ca: 'No' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // CalMatters' 2026 voter guide races to watch, each with a sitting member on
  // the ballot. `filed` is the Secretary of State's Official Certified List of
  // Candidates for the November 3 ballot.
  var CM_AD = 'https://calmatters.org/california-voter-guide-2026/state-assembly/';
  var CM_SD = 'https://calmatters.org/california-voter-guide-2026/state-senate/';
  var SOS = 'https://elections.cdn.sos.ca.gov/statewide-elections/2026-general/cert-list-candidates.pdf';
  var RACES = [
    { chamber: 'statesenate', district: 16, where: 'Fresno, Kings, Tulare and Kern counties', source: CM_SD, filed: SOS, field: [
      { name: 'Melissa Hurtado', party: 'D', pid: 'hurtado_ca', incumbent: true },
      { name: 'Guillermo Asuncion Gonzalez', party: 'R' }] },
    { chamber: 'statesenate', district: 38, where: 'Coastal north San Diego County and south Orange County', source: CM_SD, filed: SOS, field: [
      { name: 'Catherine S. Blakespear', party: 'D', pid: 'blakespear_ca', incumbent: true },
      { name: 'Laura Bassett', party: 'R' }] },
    { chamber: 'statehouse', district: 7, where: 'Northeast Sacramento County: Citrus Heights, Folsom, Rancho Cordova', source: CM_AD, filed: SOS, field: [
      { name: 'Josh Hoover', party: 'R', pid: 'hoover_ca', incumbent: true },
      { name: 'Amy L. Slavensky', party: 'D' }] },
    { chamber: 'statehouse', district: 36, where: 'Imperial County and eastern Riverside County', source: CM_AD, filed: SOS, field: [
      { name: 'Jeff Gonzalez', party: 'R', pid: 'jeff_gonzalez_ca', incumbent: true },
      { name: 'Ida S. Obeso-Martinez', party: 'D' }] },
    { chamber: 'statehouse', district: 47, where: 'Riverside and San Bernardino counties, Redlands to Palm Springs', source: CM_AD, filed: SOS, field: [
      { name: 'Greg Wallis', party: 'R', pid: 'wallis_ca', incumbent: true },
      { name: 'Leila Namvar', party: 'D' }] },
    { chamber: 'statehouse', district: 58, where: 'San Bernardino and Riverside counties', source: CM_AD, filed: SOS, field: [
      { name: 'Leticia Castillo', party: 'R', pid: 'castillo_ca', incumbent: true },
      { name: 'Clarissa Cervantes', party: 'D' }] },
    { chamber: 'statehouse', district: 74, where: 'South Orange County and north San Diego County', source: CM_AD, filed: SOS, field: [
      { name: 'Laurie Davies', party: 'R', pid: 'davies_ca', incumbent: true },
      { name: 'Sergio Farias', party: 'D' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'ca-' + chamber + '-' + num(district); }
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
  function districtText(chamber, district) { return 'District ' + num(district); }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State Assembly') + ' ' + districtText(chamber, district);
  }
  // California elects every Assembly seat in 2026, and its 20 even-numbered
  // Senate seats.
  function onBallot2026(chamber, district) {
    var n = num(district);
    return n > 0 && (chamber === 'statehouse' || (chamber === 'statesenate' && n % 2 === 0 && n <= 40));
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
    return '<div class="pdxpa-seat" data-pdxca-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/ca">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxca-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxca-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxca-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">' + esc(districtText(lv.key, lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this California Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a California address in the ' +
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
      return '<p class="pdxpa-lede">Your saved California location has no State Assembly or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State Assembly seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s own record of the vote.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-ca-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxca-boot', 'painted');
  }

  root.PDXCaBallot = {
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
