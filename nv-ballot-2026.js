/* ═══════════════════════════════════════════════════════════════════════════
   nv-ballot-2026.js — Nevada's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York, Texas,
   Illinois, Minnesota and Colorado files set. This file holds the State
   Assembly and State Senate races Nevada's own reporting names as swing or
   lean seats on the November 3, 2026 general-election ballot, with a sitting
   member running, and the formal acts on file for the people in them. Every
   Assembly seat and 11 of the 21 Senate seats are on the 2026 ballot. Each
   sitting member it names by pid has a roster row in cmp-data.js: Marilyn
   Dondero Loop's existing one, and identity-only shells for the rest.

   EVERY NAME ON THE BALLOT. Each race lists every candidate the county
   election office lists for that seat on the November 3, 2026 ballot (Clark
   County's official contest list; Washoe County's sample ballot), which
   `filed` links, spelled as the ballot spells them. The Secretary of State's
   own candidate pages refuse automated requests, so the counties that print
   the ballot are the record here. No challenger has a record in the
   Legislature: each is named, with party, and "No formal act on file", and
   gets no file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Assembly 2 and 9)
   have no sitting member running.

   WHAT A FORMAL ACT IS HERE. A final-passage floor vote, read from the bill's
   Votes page on NELIS, the Legislature's own site, which each act links to;
   the measure links to the bill's Overview page there. A member listed as
   excused or not voting has no act on that vote. Nothing here is a score, a
   tally of a member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the bill's own
   title on NELIS, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other thirteen states',
   sharing their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/nv — mounted into #pdx-nv-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXNvBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Nevada';
  var NELIS = 'https://www.leg.state.nv.us/App/NELIS/REL/';
  function bill(session, key) { return NELIS + session + '/Bill/' + key + '/Overview'; }
  function votes(session, key) { return NELIS + session + '/Bill/' + key + '/Votes'; }
  var SS = '36th2025Special', REG = '83rd2025';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'AB 4 (2025 Special)': {
      title: 'Public safety', status: 'law',
      act: 'Approved Dec. 1, 2025 (Chapter 9)', session: '36th (2025) Special Session',
      effect: 'Changed the law on assault, battery, stalking, domestic violence and impaired driving, and made changes to juvenile justice.',
      from: 'Title: “AN ACT relating to public safety; revising provisions relating to assault, battery, stalking, child sexual abuse material, domestic violence and driving under the influence… making various changes relating to juvenile justice…”',
      source: bill(SS, 12994), votes: votes(SS, 12994)
    },
    'SB 3 (2025 Special)': {
      title: 'Silver State General Assistance Program', status: 'law',
      act: 'Approved Nov. 20, 2025 (Chapter 1)', session: '36th (2025) Special Session',
      effect: 'Created the Silver State General Assistance Program to give temporary aid to people facing an extraordinary circumstance.',
      from: 'Title: “AN ACT relating to public assistance; establishing the Silver State General Assistance Program within the Division of Social Services of the Department of Human Services…”',
      source: bill(SS, 12999), votes: votes(SS, 12999)
    },
    'SB 501 (2025)': {
      title: 'Authorized Expenditures Act, 2025–27', status: 'law',
      act: 'Approved May 28, 2025 (Chapter 56)', session: '83rd (2025) Session',
      effect: 'Authorized spending by state agencies for the 2025–27 biennium and let the State Public Defender collect certain amounts from counties.',
      from: 'Title: “AN ACT relating to state financial administration; authorizing expenditures by various officers, departments, boards, agencies, commissions and institutions of the State Government for the 2025-2027 biennium; authorizing the collection of certain amounts from the counties… for the use of the services of the State Public Defender…”',
      source: bill(REG, 12952), votes: votes(REG, 12952)
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, { pid: vote }] — final passage, 'Yea' or 'Nay' as
  // the bill's Votes page on NELIS prints it. Each act links to that page.
  var ACTS = [
    ['AB 4 (2025 Special)', 'Senate final passage', '2025-11-19',
      { marilyn_dondero_loop: 'Yea', scheible_nv: 'Yea', pazina_nv: 'Yea' }],
    ['AB 4 (2025 Special)', 'Assembly final passage', '2025-11-16',
      { lisa_cole_nv: 'Yea', marzola_nv: 'Yea', la_rue_hatch_nv: 'Nay', edgeworth_nv: 'Yea', backus_nv: 'Yea' }],
    ['SB 3 (2025 Special)', 'Assembly final passage', '2025-11-15',
      { lisa_cole_nv: 'Yea', marzola_nv: 'Yea', la_rue_hatch_nv: 'Yea', edgeworth_nv: 'Yea', backus_nv: 'Yea' }],
    ['SB 3 (2025 Special)', 'Senate final passage', '2025-11-13',
      { marilyn_dondero_loop: 'Yea', scheible_nv: 'Yea', pazina_nv: 'Yea' }],
    ['SB 501 (2025)', 'Assembly final passage', '2025-05-23',
      { lisa_cole_nv: 'Yea', marzola_nv: 'Yea', la_rue_hatch_nv: 'Yea', edgeworth_nv: 'Yea' }],
    ['SB 501 (2025)', 'Senate final passage', '2025-05-21',
      { marilyn_dondero_loop: 'Yea', scheible_nv: 'Yea', pazina_nv: 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // The Nevada Independent's rundown of the races that will decide control in
  // Carson City, each with a sitting member on the ballot. `filed` is the
  // county election office's official list of every candidate on the
  // November 3 ballot (Clark County's contest list; Washoe County's sample
  // ballot for Assembly 25).
  var INDY = 'https://thenevadaindependent.com/article/these-nevada-legislative-races-will-help-determine-which-party-controls-carson-city-in-2027';
  var CLARK = 'https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:1db09a57-4c1b-47e1-94d9-e7782c442571/original/as/officesup-26g.pdf';
  var WASHOE = 'https://www.washoecounty.gov/voters/files/Washoe%20General%20Sample%20Ballot%20Booklet%20English.pdf';
  var RACES = [
    { chamber: 'statesenate', district: 8, where: 'Southwest Las Vegas Valley', source: INDY, filed: CLARK, field: [
      { name: 'Marilyn Dondero Loop', party: 'D', pid: 'marilyn_dondero_loop', incumbent: true },
      { name: 'George E. Harris', party: 'R' }] },
    { chamber: 'statesenate', district: 9, where: 'Southwest Las Vegas Valley', source: INDY, filed: CLARK, field: [
      { name: 'Melanie Scheible', party: 'D', pid: 'scheible_nv', incumbent: true },
      { name: 'Maria Thompson', party: 'R' }] },
    { chamber: 'statesenate', district: 12, where: 'Henderson and Las Vegas', source: INDY, filed: CLARK, field: [
      { name: 'Julie Ann Pazina', party: 'D', pid: 'pazina_nv', incumbent: true },
      { name: 'Rafael Arroyo', party: 'R' }] },
    { chamber: 'statehouse', district: 4, where: 'Northwest Las Vegas Valley', source: INDY, filed: CLARK, field: [
      { name: 'Lisa Cole', party: 'R', pid: 'lisa_cole_nv', incumbent: true },
      { name: 'Eileen Eady', party: 'D' }] },
    { chamber: 'statehouse', district: 21, where: 'Henderson and Las Vegas', source: INDY, filed: CLARK, field: [
      { name: 'Elaine Marzola', party: 'D', pid: 'marzola_nv', incumbent: true },
      { name: 'Patsy A. Carvalho', party: 'R' },
      { name: 'Tighe Galvin', party: 'Libertarian' }] },
    { chamber: 'statehouse', district: 25, where: 'Southwest Reno, Washoe County', source: INDY, filed: WASHOE, field: [
      { name: 'Selena La Rue Hatch', party: 'D', pid: 'la_rue_hatch_nv', incumbent: true },
      { name: 'Michael A. Ginsburg', party: 'R' }] },
    { chamber: 'statehouse', district: 35, where: 'Southwest Las Vegas Valley', source: INDY, filed: CLARK, field: [
      { name: 'Rebecca Edgeworth', party: 'R', pid: 'edgeworth_nv', incumbent: true },
      { name: 'Joe Spica', party: 'D' }] },
    { chamber: 'statehouse', district: 37, where: 'Northwest Las Vegas Valley', source: INDY, filed: CLARK, field: [
      { name: 'Shea M. Backus', party: 'D', pid: 'backus_nv', incumbent: true },
      { name: 'Jill M. Douglass', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  function seatKey(chamber, district) { return 'nv-' + chamber + '-' + num(district); }
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
  // Nevada elects every Assembly seat in 2026, and 11 of its 21 Senate seats.
  var SENATE_2026 = {};
  [2, 8, 9, 10, 12, 13, 14, 16, 17, 20, 21].forEach(function (d) { SENATE_2026[d] = 1; });
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
    return '<div class="pdxpa-seat" data-pdxnv-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/nv">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxnv-cand="' + esc(c.pid || c.key || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxnv-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxnv-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">' + esc(districtText(lv.key, lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot: this Nevada Senate seat is elected in 2028.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Nevada address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Nevada location has no State Assembly or State Senate district yet. ' +
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
    var host = document.getElementById('pdx-nv-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxnv-boot', 'painted');
  }

  root.PDXNvBallot = {
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
