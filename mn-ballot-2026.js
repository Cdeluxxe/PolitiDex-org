/* ═══════════════════════════════════════════════════════════════════════════
   mn-ballot-2026.js — Minnesota's contested legislative seats, Nov. 3, 2026
   ────────────────────────────────────────────────────────────────────────────
   ONE STATE, ONE CYCLE, on the pattern the Pennsylvania, Georgia, North
   Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona, New York, Texas and
   Illinois files set. This file holds the State House and State Senate races
   Minnesota's own reporting names as competitive on the November 3, 2026
   general-election ballot, with a sitting member running, and the formal acts
   on file for the people in them. Every seat in both chambers is
   single-member and on the 2026 ballot. Each sitting member it names by pid
   has a thin shell in cmp-data.js, identity only.

   EVERY NAME ON THE BALLOT. Each race lists every candidate the Secretary of
   State lists for that seat on the November 3, 2026 general-election ballot,
   which `filed` links, spelled as the ballot spells them. Two challengers sit
   in the House today (Bernie Perryman, House District 14A, running for Senate
   14; Tom Dippel, House District 41B, running for Senate 41): their acts are
   listed and their files are linked. Every other challenger has no record in
   the Legislature: each is named, with party, and "No formal act on file",
   and gets no file.

   LEFT OUT, AND WHY. Open seats the same reporting watches (Senate 24, 37 and
   54; House 14A, 14B, 33A, 36A, 37A and 41B) have no sitting member running.

   LETTERED HOUSE SEATS. Minnesota's House is elected from lettered seats
   ("3B", "54A"). The seat resolver keeps each one under a plain key — its
   place in the lettered table, from 1, so 1A is 1, 1B is 2 and 3B is 6 — and
   prints the letter. RACES writes the letter; the key is worked out below, so
   the two can never disagree.

   WHAT A FORMAL ACT IS HERE. A recorded floor vote in the 94th Legislature,
   read from the chamber's own record: a House vote from the bill's roll call
   page on house.mn.gov, a Senate vote from the Journal of the Senate page on
   senate.mn that prints the roll call. Each act links to that page, and the
   measure links to its bill status page on revisor.mn.gov. A member absent
   from a roll call has no act on it. Nothing here is a score, a tally of a
   member's record, a ranking or a match.

   THE EFFECT LINE belongs to the MEASURE, not the member, and follows
   CONTENT_STYLE.md: one sentence, 140 characters or fewer, the act as its
   subject, "Would have…" for an act that failed, "Would…" for one that passed
   one chamber, done tense for a law. Each is written from the session law's
   own title on revisor.mn.gov, which `from` quotes.

   WHERE IT PAINTS — the same two mounts as the other eleven states', sharing
   their stylesheet (pa-ballot.css):
     · seatActHtml(pid, level) — one act under a sitting member's row on Who
       Represents Me; '' for any pid with no act here.
     · the ballot view at /ballot/mn — mounted into #pdx-mn-ballot.

   No fetch. No storage of its own.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;
  if (root.PDXMnBallot) return;

  var ELECTION = 'November 3, 2026';
  var STATE = 'Minnesota';
  function bill(f, ssn, y) { return 'https://www.revisor.mn.gov/bills/bill.php?b=House&f=' + f + '&ssn=' + ssn + '&y=' + y; }
  function houseVote(f, key) { return 'https://www.house.mn.gov/votes/Details?BillNumber=' + f + '&SessionKey=' + key; }
  var SJ = 'https://www.senate.mn/journals/gotopage?session=ls94&number=';

  // ── THE MEASURES ───────────────────────────────────────────────────────────
  // status: 'law' | 'passed' (one chamber, not law) | 'failed'
  var MEASURES = {
    'HF 2484': {
      title: 'Capital investment (bonding), 2026', status: 'law',
      act: 'Signed May 27, 2026 (Chapter 129)', session: '94th Legislature',
      effect: 'Authorized state spending to buy and improve public land and buildings for capital projects, and set up new capital programs.',
      from: 'Title: “An act relating to capital investment; authorizing spending to acquire and better land and buildings and for other improvements of a capital nature with certain conditions; establishing new programs and modifying existing programs…”',
      source: bill('HF2484', 0, 2026)
    },
    'HF 2438': {
      title: 'Taxes, 2026', status: 'law',
      act: 'Signed May 27, 2026 (Chapter 128)', session: '94th Legislature',
      effect: 'Changed state income, property and sales taxes and local government aids, and set up a direct free filing system for state income tax.',
      from: 'Title: “An act relating to financing and operation of state and local government; modifying individual income taxes, corporate franchise taxes, property taxes and credits, local government aids, sales and use taxes… providing for a direct free filing system for individual income taxes…”',
      source: bill('HF2438', 0, 2026)
    },
    'HF 3629': {
      title: 'Program payments withheld for fraud', status: 'law',
      act: 'Signed May 26, 2026 (Chapter 122)', session: '94th Legislature',
      effect: 'Let the state withhold program payments on a credible allegation of fraud, changed grant management and required integrity reports.',
      from: 'Title: “An act relating to state government; providing program payment withholding for credible allegation of fraud; changing grants management provisions; requiring program integrity reports…”',
      source: bill('HF3629', 0, 2026)
    },
    'HF 2': {
      title: 'Health and children and families budget, 2025 First Special Session', status: 'law',
      act: 'Signed June 14, 2025 (2025 First Special Session, Chapter 3)', session: '94th Legislature',
      effect: 'Changed state health, human services, child protection and early learning programs, and made their appropriations.',
      from: 'Title: “An act relating to state government; amending provisions on the Department of Health finance and policy… economic supports, child protection and welfare, early care and learning… appropriating money…”',
      source: bill('HF0002', 1, 2025)
    }
  };

  // ── THE FLOOR VOTES ───────────────────────────────────────────────────────
  // [measure, what, date, the page that records the vote, { pid: vote }] — a
  // vote reads 'Yea' or 'Nay', as the House roll call page and the Senate
  // Journal print it.
  var ACTS = [
    ['HF 2484', 'Senate passage', '2026-05-17', SJ + '11747',
      { hauschild_mn: 'Yea', kupec_mn: 'Yea', putnam_mn: 'Yea', kreun_mn: 'Nay', housley_mn: 'Yea', abeler_mn: 'Yea', seeberger_mn: 'Yea', julia_coleman_mn: 'Yea' }],
    ['HF 2484', 'House passage', '2026-05-17', houseVote('HF2484', 302),
      { zeleznikar_mn: 'Yea', perryman_mn: 'Nay', erica_schwartz_mn: 'Yea', nolan_west_mn: 'Nay', norris_mn: 'Yea', nadeau_mn: 'Yea', stephenson_mn: 'Yea',
        rehrauer_mn: 'Yea', wayne_johnson_mn: 'Yea', dippel_mn: 'Nay', andrew_myers_mn: 'Nay', rehm_mn: 'Yea', tabke_mn: 'Yea' }],
    ['HF 2438', 'Senate repassage, conference report', '2026-05-17', SJ + '11746',
      { hauschild_mn: 'Yea', kupec_mn: 'Yea', putnam_mn: 'Yea', kreun_mn: 'Yea', housley_mn: 'Yea', abeler_mn: 'Yea', seeberger_mn: 'Yea', julia_coleman_mn: 'Yea' }],
    ['HF 2438', 'House repassage, conference report', '2026-05-17', houseVote('HF2438', 302),
      { zeleznikar_mn: 'Yea', perryman_mn: 'Yea', erica_schwartz_mn: 'Yea', nolan_west_mn: 'Yea', norris_mn: 'Yea', nadeau_mn: 'Yea', stephenson_mn: 'Yea',
        rehrauer_mn: 'Yea', wayne_johnson_mn: 'Yea', dippel_mn: 'Yea', andrew_myers_mn: 'Yea', rehm_mn: 'Yea', tabke_mn: 'Yea' }],
    ['HF 3629', 'Senate passage, as amended', '2026-05-17', SJ + '10933',
      { hauschild_mn: 'Yea', kupec_mn: 'Yea', putnam_mn: 'Yea', kreun_mn: 'Yea', housley_mn: 'Yea', abeler_mn: 'Yea', seeberger_mn: 'Yea', julia_coleman_mn: 'Yea' }],
    ['HF 3629', 'House repassage, as amended by the Senate', '2026-05-17', houseVote('HF3629', 302),
      { zeleznikar_mn: 'Yea', perryman_mn: 'Yea', erica_schwartz_mn: 'Yea', nolan_west_mn: 'Yea', norris_mn: 'Yea', nadeau_mn: 'Yea', stephenson_mn: 'Yea',
        rehrauer_mn: 'Yea', wayne_johnson_mn: 'Yea', dippel_mn: 'Yea', andrew_myers_mn: 'Yea', rehm_mn: 'Yea', tabke_mn: 'Yea' }],
    ['HF 2', 'Senate passage', '2025-06-09', SJ + '43&session_year=2025&session_number=1',
      { hauschild_mn: 'Yea', kupec_mn: 'Yea', putnam_mn: 'Yea', kreun_mn: 'Nay', housley_mn: 'Nay', abeler_mn: 'Nay', seeberger_mn: 'Yea', julia_coleman_mn: 'Nay' }],
    ['HF 2', 'House passage', '2025-06-09', houseVote('HF0002', 304),
      { zeleznikar_mn: 'Yea', perryman_mn: 'Nay', erica_schwartz_mn: 'Yea', nolan_west_mn: 'Yea', norris_mn: 'Yea', nadeau_mn: 'Yea', stephenson_mn: 'Yea',
        rehrauer_mn: 'Yea', wayne_johnson_mn: 'Nay', dippel_mn: 'Nay', andrew_myers_mn: 'Yea', rehm_mn: 'Yea', tabke_mn: 'Yea' }]
  ];

  // ── THE RACES ──────────────────────────────────────────────────────────────
  // MPR News's list of the most competitive districts for November, each with
  // a sitting member on the ballot. `filed` is the Secretary of State's
  // candidate finder for the November 3 ballot, which lists every name in
  // each of these seats.
  var MPR = 'https://www.mprnews.org/story/2026/09/29/minnesota-legislative-races-to-watch-in-the-state-house-senate';
  var SOS = 'https://candidates.sos.mn.gov/';
  var RACES = [
    { chamber: 'statesenate', district: 3, where: 'Northeastern Minnesota, around Hermantown', source: MPR, filed: SOS, field: [
      { name: 'Grant Hauschild', party: 'DFL', pid: 'hauschild_mn', incumbent: true },
      { name: 'Andrea Zupancich', party: 'R', note: 'Mayor of Babbitt' }] },
    { chamber: 'statesenate', district: 4, where: 'Moorhead area, Clay and Becker counties', source: MPR, filed: SOS, field: [
      { name: 'Rob Kupec', party: 'DFL', pid: 'kupec_mn', incumbent: true },
      { name: 'Austin Peterson', party: 'R' }] },
    { chamber: 'statesenate', district: 14, where: 'St. Cloud area', source: MPR, filed: SOS, field: [
      { name: 'Aric Putnam', party: 'DFL', pid: 'putnam_mn', incumbent: true },
      { name: 'Bernie Perryman', party: 'R', pid: 'perryman_mn', note: 'State Representative, House District 14A' }] },
    { chamber: 'statesenate', district: 32, where: 'Anoka County: Blaine, Columbus, Ham Lake and Lexington', source: MPR, filed: SOS, field: [
      { name: 'Michael Kreun', party: 'R', pid: 'kreun_mn', incumbent: true },
      { name: 'Chris Ford', party: 'DFL', note: 'Blaine City Council member' }] },
    { chamber: 'statesenate', district: 33, where: 'Stillwater area', source: MPR, filed: SOS, field: [
      { name: 'Karin Housley', party: 'R', pid: 'housley_mn', incumbent: true },
      { name: 'Nat Smith', party: 'DFL' }] },
    { chamber: 'statesenate', district: 35, where: 'Anoka, Andover and Coon Rapids', source: MPR, filed: SOS, field: [
      { name: 'Jim Abeler', party: 'R', pid: 'abeler_mn', incumbent: true },
      { name: 'Angela Nelson', party: 'DFL' }] },
    { chamber: 'statesenate', district: 41, where: 'Cottage Grove, Hastings and Lake Elmo', source: MPR, filed: SOS, field: [
      { name: 'Judy Seeberger', party: 'DFL', pid: 'seeberger_mn', incumbent: true },
      { name: 'Tom Dippel', party: 'R', pid: 'dippel_mn', note: 'State Representative, House District 41B' }] },
    { chamber: 'statesenate', district: 48, where: 'Chaska, Chanhassen, Waconia and Carver County', source: MPR, filed: SOS, field: [
      { name: 'Julia Coleman', party: 'R', pid: 'julia_coleman_mn', incumbent: true },
      { name: 'Dan Kessler', party: 'DFL' }] },
    { chamber: 'statehouse', district: '3B', where: 'Around Duluth and into St. Louis County', source: MPR, filed: SOS, field: [
      { name: 'Natalie Zeleznikar', party: 'R', pid: 'zeleznikar_mn', incumbent: true },
      { name: 'Aaron Schweiger', party: 'DFL' }] },
    { chamber: 'statehouse', district: '18A', where: 'Mankato area', source: MPR, filed: SOS, field: [
      { name: 'Erica Schwartz', party: 'R', pid: 'erica_schwartz_mn', incumbent: true },
      { name: 'Leah Hanson', party: 'DFL' }] },
    { chamber: 'statehouse', district: '32A', where: 'Anoka County, within Senate District 32', source: MPR, filed: SOS, field: [
      { name: 'Nolan West', party: 'R', pid: 'nolan_west_mn', incumbent: true },
      { name: 'Amanda Matchett', party: 'DFL' }] },
    { chamber: 'statehouse', district: '32B', where: 'Anoka County, within Senate District 32', source: MPR, filed: SOS, field: [
      { name: 'Matt Norris', party: 'DFL', pid: 'norris_mn', incumbent: true },
      { name: 'Leslie Larson', party: 'R', note: 'Blaine City Council member' }] },
    { chamber: 'statehouse', district: '34A', where: 'Parts of Rogers, Dayton and Champlin', source: MPR, filed: SOS, field: [
      { name: 'Danny Nadeau', party: 'R', pid: 'nadeau_mn', incumbent: true },
      { name: 'Jason Heaser', party: 'DFL' }] },
    { chamber: 'statehouse', district: '35A', where: 'Anoka and Coon Rapids', source: MPR, filed: SOS, field: [
      { name: 'Zack Stephenson', party: 'DFL', pid: 'stephenson_mn', incumbent: true },
      { name: 'Josh Jungling', party: 'R' }] },
    { chamber: 'statehouse', district: '35B', where: 'Coon Rapids and Andover', source: MPR, filed: SOS, field: [
      { name: 'Kari Rehrauer', party: 'DFL', pid: 'rehrauer_mn', incumbent: true },
      { name: 'Steve Pape', party: 'R' }] },
    { chamber: 'statehouse', district: '41A', where: 'Washington County, within Senate District 41', source: MPR, filed: SOS, field: [
      { name: 'Wayne A Johnson', party: 'R', pid: 'wayne_johnson_mn', incumbent: true },
      { name: 'Cole Birkeland', party: 'DFL' }] },
    { chamber: 'statehouse', district: '45A', where: 'Communities near Lake Minnetonka', source: MPR, filed: SOS, field: [
      { name: 'Andrew Myers', party: 'R', pid: 'andrew_myers_mn', incumbent: true },
      { name: 'Tracey Breazeale', party: 'DFL' }] },
    { chamber: 'statehouse', district: '48B', where: 'Carver County, within Senate District 48', source: MPR, filed: SOS, field: [
      { name: 'Lucille “Lucy” Rehm', party: 'DFL', pid: 'rehm_mn', incumbent: true },
      { name: 'Caleb Steffenhagen', party: 'R' }] },
    { chamber: 'statehouse', district: '54A', where: 'Shakopee area, Scott County', source: MPR, filed: SOS, field: [
      { name: 'Brad Tabke', party: 'DFL', pid: 'tabke_mn', incumbent: true },
      { name: 'Aaron Paul', party: 'R' }] }
  ];

  // ── LOOKUPS ────────────────────────────────────────────────────────────────
  function num(n) { var m = /([1-9][0-9]*)/.exec(String(n == null ? '' : n)); return m ? parseInt(m[1], 10) : 0; }
  // A lettered House seat's key: 1A is 1, 1B is 2, … 67B is 134.
  function houseKey(label) {
    var m = /^([1-9][0-9]?)([AB])$/.exec(String(label));
    return m ? 2 * parseInt(m[1], 10) - (m[2] === 'A' ? 1 : 0) : 0;
  }
  // And back: the key the resolver stores, as the seat is printed.
  function houseLabel(key) {
    var k = num(key);
    return k ? Math.ceil(k / 2) + (k % 2 ? 'A' : 'B') : '';
  }
  function seatKey(chamber, district) { return 'mn-' + chamber + '-' + num(district); }
  var BY_SEAT = {};
  RACES.forEach(function (r) {
    if (r.chamber === 'statehouse') { r.label = String(r.district); r.district = houseKey(r.label); }
    else r.label = String(r.district);
    r.seat = seatKey(r.chamber, r.district);
    BY_SEAT[r.seat] = r;
  });

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
  // The seat as a reader reads it: "District 3", or "District 3B" for the House.
  function districtText(chamber, district) {
    return 'District ' + (chamber === 'statehouse' ? houseLabel(district) : String(num(district)));
  }
  function seatLabel(chamber, district) {
    return (chamber === 'statesenate' ? 'State Senate' : 'State House') + ' ' + districtText(chamber, district);
  }
  // Minnesota elects every seat in both chambers in 2026.
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
    return '<div class="pdxpa-seat" data-pdxmn-pid="' + esc(pid) + '">' +
      '<p class="pdxpa-seat-hd">Formal record on file</p>' +
      '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' +
      (r ? '<p class="pdxpa-seat-go"><a href="/ballot/mn">This seat is on your ' + esc(ELECTION) +
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
    return '<li class="pdxpa-cand" data-pdxmn-cand="' + esc(c.pid || c.name) + '">' +
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
    return '<section class="pdxpa-race" data-pdxmn-seat="' + esc(r.seat) + '">' +
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
    return '<section class="pdxpa-race pdxpa-race--quiet" data-pdxmn-seat="' + esc(seatKey(lv.key, lv.district)) + '">' +
      '<h2 class="pdxpa-race-hd">' + esc(seatLabel(lv.key, lv.district)) + '</h2>' +
      (who
        ? '<p class="pdxpa-cand-hd">Sitting member: <a class="pdxpa-name" ' + personAttrs(lv.pid) + '>' + esc(who) + '</a></p>' +
          (acts.length ? '<ul class="pdxpa-acts">' + actHtml(acts[0]) + '</ul>' : '')
        : '<p class="pdxpa-cand-hd">' + esc(districtText(lv.key, lv.district)) + ' — no member on file yet</p>') +
      '<p class="pdxpa-race-foot">' + (onBallot2026(lv.key, lv.district)
        ? 'Not one of the contested races on file for this ballot.'
        : 'Not on the ' + esc(ELECTION) + ' ballot.') + '</p>' +
    '</section>';
  }
  function pageHtml(reps) {
    if (!reps || !reps.located || String(reps.state || '') !== STATE) {
      return '<p class="pdxpa-lede">Set a Minnesota address in the ' +
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
      return '<p class="pdxpa-lede">Your saved Minnesota location has no State House or State Senate district yet. ' +
        '<a href="/find">Search your address in the district finder</a> to place both seats.</p>';
    }
    var body = levels.map(function (lv) {
      var r = race(lv.key, lv.district);
      return r ? raceHtml(r) : quietSeatHtml(lv);
    }).join('');
    return '<p class="pdxpa-lede">Your State Senate and State House seats, as your saved address places them. ' +
      'Each formal act links to the Legislature’s own record of the vote.</p>' + body +
      '<p class="pdxpa-foot">U.S. House, U.S. Senate and Governor contests are on <a href="/ballot">Your Ballot</a>.</p>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var host = document.getElementById('pdx-mn-ballot');
    if (!host) return;
    var reps = null;
    try {
      if (!root._hasUserLocation && typeof root.loadVoterLocation === 'function') root.loadVoterLocation();
      reps = typeof root.pdxRepsForMe === 'function' ? root.pdxRepsForMe() : null;
    } catch (e) { reps = null; }
    host.innerHTML = pageHtml(reps);
    host.setAttribute('data-pdxmn-boot', 'painted');
  }

  root.PDXMnBallot = {
    ELECTION: ELECTION, MEASURES: MEASURES, ACTS: ACTS, RACES: RACES,
    race: race, raceForPid: raceForPid, actsFor: actsFor, seatKey: seatKey, onBallot2026: onBallot2026,
    houseKey: houseKey, houseLabel: houseLabel, seatLabel: seatLabel,
    seatActHtml: seatActHtml, raceHtml: raceHtml, pageHtml: pageHtml, mount: mount
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
