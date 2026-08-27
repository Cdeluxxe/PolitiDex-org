/* ══════════════════════════════════════════════════════════════════════════
   archive-browse.js — the national archive, browsable by chamber and state
   ──────────────────────────────────────────────────────────────────────────
   PolitiDex ships two products that share one roster, and the whole point of
   this file is that they never get confused with each other:

     BALLOT (Door 2)   "these people hold power over YOU."
                       Resolved only by window.pdxRepsForMe(). Statewide seats
                       (U.S. Senate, Governor) resolve from a state anywhere in
                       the country; district seats (U.S. House, State Senate,
                       State House) need district geometry, which exists for
                       Utah only — so outside Utah those rows stay BLANK.

     ARCHIVE (Door 1)  "here is the record of the people we track."
                       Everyone, everywhere. No seat claim of any kind.

   Before this file, a visitor outside Utah who wanted to read, say, both Ohio
   senators had exactly one honest route: know a name and search for it. The
   ballot could not help them (correctly — it does not know their district) and
   Door 1's browse tree was reachable but reads as a national leaderboard, not
   as "the chamber I care about, in my state." So the product looked thinner
   than the archive actually is, purely because there was no chamber+state door
   into it.

   This module is that door. It is deliberately NOT a ballot:

     · It lists a CHAMBER in a STATE — "U.S. Senate · Ohio" — never "your
       U.S. Senate seat". A chamber+state list is a roster slice, which is a
       true statement about the archive; a seat is a claim about the reader,
       and only the resolver is allowed to make one.
     · It never derives a district seat. There is no code path here that takes
       a state's House delegation and picks one for the reader. Districts are
       not even a dimension of this UI.
     · It never invents a member. Every row comes from a pid that is already in
       the bundled roster; an empty slice renders as empty.

   ── One classifier, not two ──────────────────────────────────────────────
   Door 1's grouped browse already answers "what chamber is this person in?"
   (_classifyBrowseType) and "what state bucket do they sit in?"
   (_getPoliticianState). Re-deriving either here would create a second
   doctrine that silently drifts from the first, so compare-hub.js now exposes
   both as window._pdxBrowseType / window._pdxBrowseStateOf and this file uses
   them. Consequence, on purpose: this panel and Door 1's tree list the SAME
   people under the same chamber. If they ever disagree, that is a bug in one
   shared function rather than a discrepancy between two surfaces.

   And if those globals are absent (compare-hub failed to parse, a stripped
   page), this module renders NOTHING rather than guessing at chambers. Same
   rule the rest of the app follows: no source of truth, no reader-facing
   claim.

   ── Federal-first, stated as a direction and not a promise ───────────────
   The archive has federal depth first and state chambers behind it. The copy
   says that plainly, with no dates and no completeness claim, because the
   alternative is a reader assuming a thin state chamber means the seat is
   vacant.

   States. Does not gate. This module appends; it never blocks a click, never
   rewrites another module's DOM, and is safe to no-op.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Chambers, federal first ────────────────────────────────────────────
  // The five seat families a ballot has, in the order the archive has depth.
  // `d1` is Door 1's own office-filter value, so the chip row wired into the
  // browse toolbar speaks Door 1's vocabulary instead of inventing a second
  // set of labels for the same buckets. Note `governor`: Door 1 files Governor
  // together with Lt. Governor, Attorney General, Treasurer and Auditor under
  // one statewide-executive bucket, so the label here says "Statewide exec" —
  // calling that chip "Governor" would misdescribe what it lists.
  var CHAMBERS = [
    { key: 'senator',       label: 'U.S. Senate',    d1: 'senator',        tier: 'federal' },
    { key: 'representative',label: 'U.S. House',     d1: 'representative', tier: 'federal' },
    { key: 'governor',      label: 'Statewide exec', d1: 'governor',       tier: 'state' },
    { key: 'state_senator', label: 'State Senate',   d1: 'state',          tier: 'state' },
    { key: 'state_rep',     label: 'State House',    d1: 'state',          tier: 'state' }
  ];

  var ALL = '';                 // the "every rostered state" state value
  var ALL_LABEL = 'all states';

  // Reader-facing copy. Every line here has to survive the test that scans
  // this file for ballot language: no "your seat", no "your representative",
  // no "on your ballot".
  var KICKER  = 'Archive · not a ballot';
  var LEAD    = 'Browse the record by chamber and state.';
  var SUB     = 'These are roster listings from the national archive, not seat ' +
                'assignments. Nobody here is claimed to represent you — only the ' +
                'seat finder above makes that claim, and only where it can.';
  var GROWTH  = 'The archive is building federal depth first, then state chambers. ' +
                'A short list here means we track few people in that chamber yet — ' +
                'not that the chamber is empty.';
  var ROWNOTE = 'Roster listing · archive record';

  // ── Roster reads ───────────────────────────────────────────────────────
  // window.CMP_DATA is the bundled index — the same roster Door 1's browse
  // grid draws from, and the same one person-file.js resolves /p/<pid>
  // against. Deliberately NOT the live PROFILES overlay: this panel promises
  // "in the roster", and the bundled index is the roster that exists at load
  // with no fetch in flight.
  function data() {
    return (window.CMP_DATA && typeof window.CMP_DATA === 'object') ? window.CMP_DATA : null;
  }
  function ready() {
    return !!data() &&
           typeof window._pdxBrowseType === 'function' &&
           typeof window._pdxBrowseStateOf === 'function';
  }
  function chamberOf(pid) {
    if (typeof window._pdxBrowseType !== 'function') return '';
    try { return window._pdxBrowseType(pid) || ''; } catch (e) { return ''; }
  }
  function stateOf(pid) {
    if (typeof window._pdxBrowseStateOf !== 'function') return '';
    try { return window._pdxBrowseStateOf(pid) || ''; } catch (e) { return ''; }
  }
  function statusOf(rec) {
    if (typeof window._pdxOfficeStatus !== 'function') return 'office';
    try { return window._pdxOfficeStatus(rec) || 'office'; } catch (e) { return 'office'; }
  }
  var STATUS_LABEL = { office: 'In office', candidate: 'Candidate', former: 'Former' };

  // Everyone in one chamber, optionally narrowed to one state.
  // Sort: officeholders, then candidates, then former — and alphabetical by
  // name inside each. NOT by party: this is a record archive, and grouping the
  // first thing a reader sees by team is the framing the whole product avoids.
  function roster(chamber, state) {
    var D = data();
    if (!D || !chamber) return [];
    var want = String(state || '').trim().toLowerCase();
    var out = [];
    for (var pid in D) {
      if (!Object.prototype.hasOwnProperty.call(D, pid)) continue;
      if (chamberOf(pid) !== chamber) continue;
      var st = stateOf(pid);
      if (want && String(st).toLowerCase() !== want) continue;
      var rec = D[pid] || {};
      out.push({
        pid: pid,
        name: String(rec.name || pid),
        office: String(rec.office || ''),
        state: st,
        status: statusOf(rec)
      });
    }
    var rank = { office: 0, candidate: 1, former: 2 };
    out.sort(function (a, b) {
      var ra = (rank[a.status] === undefined ? 3 : rank[a.status]);
      var rb = (rank[b.status] === undefined ? 3 : rank[b.status]);
      if (ra !== rb) return ra - rb;
      if (a.state !== b.state) return a.state < b.state ? -1 : 1;
      return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });
    return out;
  }

  // The states this chamber actually has people in, alphabetical, with counts.
  function states(chamber) {
    var all = roster(chamber, ALL), seen = {}, list = [];
    for (var i = 0; i < all.length; i++) {
      var s = all[i].state || '';
      if (!s) continue;
      if (seen[s] === undefined) { seen[s] = list.length; list.push({ state: s, count: 0 }); }
      list[seen[s]].count++;
    }
    list.sort(function (a, b) { return a.state < b.state ? -1 : (a.state > b.state ? 1 : 0); });
    return list;
  }

  // "U.S. Senate · Ohio" — the heading the brief asks for. With no state it
  // says "all states", which is still a roster statement and still not a seat.
  function label(chamber, state) {
    var c = byKey(chamber);
    return (c ? c.label : 'Archive') + ' · ' + (String(state || '').trim() || ALL_LABEL);
  }
  function byKey(k) {
    for (var i = 0; i < CHAMBERS.length; i++) if (CHAMBERS[i].key === k) return CHAMBERS[i];
    return null;
  }

  // ── Selection ──────────────────────────────────────────────────────────
  // Federal first: the panel opens on the U.S. Senate, which is the one
  // chamber where the archive has something for every state.
  var sel = { chamber: 'senator', state: ALL, seededFrom: null, touched: false };

  // The reader's state is a convenience, never a claim: it pre-narrows the
  // roster slice they most likely want to read. It comes from the resolver
  // (the only thing that knows where they are) and it selects a STATE, which
  // is all a chamber list needs. It cannot and does not select a district.
  function seedState() {
    // Once the reader narrows the listing themselves their choice wins for good.
    if (sel.touched) return;
    if (typeof window.pdxRepsForMe !== 'function') return;
    var reps = null;
    try { reps = window.pdxRepsForMe(); } catch (e) { return; }
    if (!reps || !reps.located) return;
    var st = String(reps.state || '').trim();
    // Re-seed when the resolver's state actually changes, so a reader who moves
    // their location from Ohio to Utah is not left reading Ohio's roster.
    if (st === sel.seededFrom) return;
    sel.seededFrom = st;
    if (!st) return;
    var avail = states(sel.chamber);
    for (var i = 0; i < avail.length; i++) {
      if (avail[i].state.toLowerCase() === st.toLowerCase()) { sel.state = avail[i].state; return; }
    }
  }

  function select(chamber, state, touched) {
    if (chamber && byKey(chamber)) sel.chamber = chamber;
    if (state !== undefined && state !== null) sel.state = String(state);
    if (touched) sel.touched = true;
    // A state that this chamber has nobody in is not an error and is not
    // silently swapped for a different state — it renders as an honest empty.
    paint();
  }

  function open(pid) {
    if (!pid) return;
    if (window.PDXPerson && typeof window.PDXPerson.open === 'function') {
      window.PDXPerson.open(pid);
      return;
    }
    if (typeof window.showProfile === 'function') window.showProfile(pid);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  // Long slices are capped so a chamber band cannot become the page, but the
  // cap is STATED with the number withheld and the way to see the rest. A
  // silent truncation reads as "that is everyone", which is the kind of quiet
  // lie this whole phase exists to avoid.
  var CAP = 60;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slot(host, id) {
    if (!host) return null;
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = 'ab-band';
    host.appendChild(el);
    return el;
  }

  function chipRow() {
    var out = '';
    for (var i = 0; i < CHAMBERS.length; i++) {
      var c = CHAMBERS[i];
      out += '<button type="button" class="ab-chip' + (c.key === sel.chamber ? ' is-on' : '') +
             '" data-ab-chamber="' + esc(c.key) + '"' +
             (c.key === sel.chamber ? ' aria-current="true"' : '') + '>' + esc(c.label) + '</button>';
    }
    return '<div class="ab-chips" role="group" aria-label="Browse the archive by chamber">' + out + '</div>';
  }

  function stateSelect() {
    var avail = states(sel.chamber);
    var opts = '<option value="">All states (' + avail.length + ')</option>';
    for (var i = 0; i < avail.length; i++) {
      var s = avail[i];
      opts += '<option value="' + esc(s.state) + '"' +
              (s.state.toLowerCase() === String(sel.state).toLowerCase() ? ' selected' : '') +
              '>' + esc(s.state) + ' (' + s.count + ')</option>';
    }
    return '<label class="ab-statewrap"><span class="ab-statelab">State</span>' +
           '<select class="ab-state" data-ab-state="1" aria-label="Narrow the archive listing to one state">' +
           opts + '</select></label>';
  }

  function rows() {
    var list = roster(sel.chamber, sel.state);
    if (!list.length) {
      return '<p class="ab-empty">No one in the archive is filed under <strong>' +
             esc(label(sel.chamber, sel.state)) + '</strong> yet. ' + esc(GROWTH) + '</p>';
    }
    var shown = list.slice(0, CAP), out = '';
    for (var i = 0; i < shown.length; i++) {
      var p = shown[i];
      var meta = [p.office, (sel.state ? '' : p.state), STATUS_LABEL[p.status] || '']
                   .filter(function (x) { return !!x; }).join(' · ');
      out += '<button type="button" class="ab-row" data-ab-pid="' + esc(p.pid) + '">' +
               '<span class="ab-rowname">' + esc(p.name) + '</span>' +
               '<span class="ab-rowmeta">' + esc(meta) + '</span>' +
             '</button>';
    }
    var over = list.length - shown.length;
    var head = '<p class="ab-count"><strong>' + esc(label(sel.chamber, sel.state)) + '</strong> — ' +
               list.length + (list.length === 1 ? ' person' : ' people') + ' in the roster. ' +
               esc(ROWNOTE) + '.</p>';
    var tail = over
      ? '<p class="ab-over">Showing the first ' + shown.length + '. ' + over +
        ' more are in this listing — pick a single state above, or use the full ' +
        'browse tree in The Record, to reach them.</p>'
      : '';
    return head + '<div class="ab-rows">' + out + '</div>' + tail;
  }

  function html() {
    return '<p class="ab-kicker">' + esc(KICKER) + '</p>' +
           '<p class="ab-lead">' + esc(LEAD) + '</p>' +
           '<p class="ab-sub">' + esc(SUB) + '</p>' +
           chipRow() +
           stateSelect() +
           rows() +
           '<p class="ab-growth">' + esc(GROWTH) + '</p>';
  }

  // Delegated once per band: the markup above is replaced on every paint, so
  // per-button handlers would leak listeners on every chip press.
  function bind(band) {
    if (!band || band.__abBound) return;
    band.__abBound = true;
    band.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== band) {
        if (t.getAttribute) {
          var ch = t.getAttribute('data-ab-chamber');
          if (ch) { select(ch, sel.state); return; }
          var pid = t.getAttribute('data-ab-pid');
          if (pid) { open(pid); return; }
        }
        t = t.parentNode;
      }
    });
    band.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute('data-ab-state')) select(sel.chamber, t.value, true);
    });
  }

  function paint() {
    if (!ready()) return;
    // The two entry points are independent: a page that carries the browse
    // toolbar but not Who Represents Me (or the reverse) still gets the one it
    // has, rather than losing both to an early return.
    paintDoor1();
    seedState();
    var host = document.querySelector('#who-represents-me .wrm-inner');
    var band = slot(host, 'ab-wrm');
    if (!band) return;
    band.innerHTML = html();
    bind(band);
  }

  // ── Door 1 entry point ─────────────────────────────────────────────────
  // The browse toolbar already has a state axis; this adds the chamber axis
  // next to it and drives the EXISTING #myteam-browse-office filter through
  // the existing myteamBrowseFilter(). No second list, no second renderer —
  // the chips are a shortcut into Door 1's own grouped browse, which is why
  // they carry Door 1's own labels.
  function paintDoor1() {
    var host = document.querySelector('#browse-toolbar .browse-state-scope');
    if (!host) return;
    var row = document.getElementById('ab-d1');
    if (row) return;
    var officeSel = document.getElementById('myteam-browse-office');
    if (!officeSel) return;
    row = document.createElement('div');
    row.id = 'ab-d1';
    row.className = 'ab-d1';
    var out = '<span class="ab-d1-label">🏛 Browse by chamber</span><span class="ab-d1-chips">';
    for (var i = 0; i < CHAMBERS.length; i++) {
      var c = CHAMBERS[i];
      out += '<button type="button" class="ab-chip ab-chip--sm" data-ab-d1="' + esc(c.d1) + '">' +
             esc(c.label) + '</button>';
    }
    out += '</span>';
    row.innerHTML = out;
    row.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== row) {
        if (t.getAttribute) {
          var v = t.getAttribute('data-ab-d1');
          if (v) {
            var s = document.getElementById('myteam-browse-office');
            if (s) s.value = v;
            var chips = row.querySelectorAll('[data-ab-d1]');
            for (var i = 0; i < chips.length; i++) {
              if (chips[i].getAttribute('data-ab-d1') === v) chips[i].className = 'ab-chip ab-chip--sm is-on';
              else chips[i].className = 'ab-chip ab-chip--sm';
            }
            if (typeof window.myteamBrowseFilter === 'function') window.myteamBrowseFilter();
            return;
          }
        }
        t = t.parentNode;
      }
    });
    host.appendChild(row);
  }

  function sync() { try { paint(); } catch (e) {} }

  // ── Boot ───────────────────────────────────────────────────────────────
  // Wrap rather than poll, exactly like scope-chrome.js: the two things that
  // change what this panel should show are a location being set (which can
  // pre-narrow the state) and the roster arriving. A few settle timers cover
  // the deferred-script ordering we do not control.
  function wrap(name, flag) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn[flag]) return;
    var wrapped = function () {
      var r = fn.apply(this, arguments);
      setTimeout(sync, 0);
      return r;
    };
    wrapped[flag] = true;
    window[name] = wrapped;
  }

  function boot() {
    wrap('pdxFindMyReps', '__abReps');
    wrap('_updateTeamPositionsForLocation', '__abLoc');
    sync();
    [400, 1200, 3000].forEach(function (ms) { setTimeout(sync, ms); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PDXArchiveBrowse = {
    CHAMBERS: CHAMBERS,
    KICKER: KICKER, LEAD: LEAD, SUB: SUB, GROWTH: GROWTH, ROWNOTE: ROWNOTE,
    CAP: CAP,
    ready: ready,
    chamberOf: chamberOf,
    stateOf: stateOf,
    roster: roster,
    states: states,
    label: label,
    select: select,
    open: open,
    sync: sync,
    _sel: function () { return { chamber: sel.chamber, state: sel.state }; },
    _html: html
  };
})();
