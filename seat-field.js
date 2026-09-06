/* ═══════════════════════════════════════════════════════════════════════════
   seat-field.js — ONE answer to "who is on the ballot for this seat"
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN. A seat has exactly one field: every person on file who
   holds, seeks, or once held THAT seat — the office, in that state, in that
   district number. PolitiDex was deriving that list in three different places
   and the three disagreed about real people:

     · COMPARE FIELD read the curated 2026 ballot (_pdxVoterBallot →
       byOffice.representative.pids). For a Layton voter that ballot says UT-2 /
       Celeste Maloy, because it was curated before Utah's map was corrected. So
       "Compare Field" on Blake Moore's U.S. House card opened a sheet holding
       Maloy, and printed "nobody holds this seat" over it — the seat's actual
       holder was the button the reader had just pressed.
     · WORK THIS SEAT took its holder from pdxSeatHolders() (the resolver, which
       DOES apply the map correction) and its field from the curated ballot. One
       pane, two sources, two different humans.
     · WHERE THEY STAND was handed a pid list built by the browse tree, which
       keys on office + state + district over the whole roster — so the stance
       grid for a state seat already listed people the field beside it omitted.
       The reader could see, in one screen, names the "full field" did not have.

   Three derivations is three answers, and a seat has one. This file is the one
   that answers it, and it answers from the roster, on the key the seat itself
   publishes.

   THE KEY IS OFFICE + STATE + DISTRICT, AND NOTHING ELSE. The resolver
   (pdxRepsForMe → pdxSeatHolders) already says which office, which state and
   which district number this voter's seat IS — including the redistricting
   correction, which is exactly the fact the curated ballot is behind on. So the
   key comes from the resolver's own level, and the members come from the roster
   through the keyers the browse tree already uses:

     window._pdxBrowseType(pid)      → the chamber bucket (one doctrine, shared)
     window._pdxBrowseStateOf(pid)   → the state, normalized
     window._pdxRelevantDistNum(pid) → the district number, however spelled

   Reading those three rather than owning a fourth copy is the whole point: if
   this file and the browse tree ever disagree about a person, the bug is in one
   function instead of a mismatch between two surfaces.

   NOBODY ON THE KEY IS OMITTED. There is no cap, no party sort, no ranking by
   Direction Match, and no relevance filter. If a record says U.S. House · Utah ·
   1, it is in the UT-1 field — holder, challenger, or former member, each
   labelled by window._pdxOfficeStatus and never promoted or demoted by anything
   else. The order is the app's existing unranked order: the sitting holder
   first (theirs is the record being judged), then officeholder → candidate →
   former, then alphabetical.

   HOLDERS COME FROM pdxSeatHolders() ONLY. Not from the curated ballot, not
   from a "does this record say office" scan of the field. A person is tagged as
   holding this seat when the resolver says they hold it, full stop — that is
   the single fact that made Moore and Maloy swap places.

   IT REFUSES RATHER THAN GUESSES. answerable:false, with a `reason`, when:
     · the key is not one of the five seats it owns
     · there is no location to answer for
     · a DISTRICT seat has no resolved district number
   The last one is the important refusal. A district seat with no district is
   not "the whole state's members" — that is a different question with a much
   longer answer, ~32 of whose names cannot be on the reader's ballot. Callers
   keep their own existing behaviour on a refusal; none of them is given a list
   to print in its place.

   WHAT IT DOES NOT DO. No news scraping, no invented challengers, no score, no
   party, no TTL, no cache, no DOM. It is a projection over data already in the
   page, recomputed on ask, so it cannot go stale against the roster or the
   resolver.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.pdxSeatField) return;

  // The five seats whose field is a roster question with an answer. `local` is
  // deliberately absent: a local field is a bag of different offices (mayor,
  // council, school board, county) rather than one seat, and the Relevant-to-Me
  // ballot owns it. `president` is absent because it is not keyed by state or
  // district and the existing matcher already answers it whole.
  var SEATS = {
    senate:      { type: 'senator',       statewide: true  },
    governor:    { type: 'governor',      statewide: true  },
    house:       { type: 'representative', statewide: false },
    statesenate: { type: 'state_senator', statewide: false },
    statehouse:  { type: 'state_rep',     statewide: false }
  };

  var STATUS_RANK = { office: 0, candidate: 1, former: 2 };

  function roster() {
    return (window.CMP_DATA && typeof window.CMP_DATA === 'object') ? window.CMP_DATA : null;
  }

  function seatKeyOf(k) {
    try {
      if (typeof window.pdxSeatKey === 'function') return window.pdxSeatKey(k);
    } catch (e) {}
    return String(k == null ? '' : k).trim().toLowerCase();
  }

  function typeOf(pid) {
    try {
      if (typeof window._pdxBrowseType === 'function') return window._pdxBrowseType(pid);
    } catch (e) {}
    return '';
  }

  function stateOf(pid) {
    try {
      if (typeof window._pdxBrowseStateOf === 'function') return window._pdxBrowseStateOf(pid);
    } catch (e) {}
    return '';
  }

  // District number, through compare-hub's own parser when it is loaded. The
  // local fallback reads the SAME fields in the SAME order as that function, so
  // a page where compare-hub has not run yet gets the same answer rather than a
  // different one — the source order is the doctrine, not the file it lives in.
  function distOf(pid) {
    try {
      if (typeof window._pdxRelevantDistNum === 'function') return window._pdxRelevantDistNum(pid);
    } catch (e) {}
    var R = roster(); var d = R && R[pid];
    if (!d) return null;
    var parse = (typeof window._pdxDistNumFromStr === 'function') ? window._pdxDistNumFromStr : null;
    if (!parse) return null;
    var orig = window._originalStates && window._originalStates[pid];
    var src = [d.district, d.state, orig, d.office];
    for (var i = 0; i < src.length; i++) {
      var n = parse(src[i]);
      if (n !== null && n !== undefined) return n;
    }
    return null;
  }

  function statusOf(pid) {
    var R = roster(); var d = R && R[pid];
    if (!d) return 'candidate';
    try {
      if (typeof window._pdxOfficeStatus === 'function') return window._pdxOfficeStatus(d);
    } catch (e) {}
    return 'candidate';
  }

  function nameOf(pid) {
    var R = roster(); var d = R && R[pid];
    return d ? String(d.name || pid) : String(pid);
  }

  function officeOf(pid) {
    var R = roster(); var d = R && R[pid];
    return d ? String(d.office || '') : '';
  }

  function no(rk, reason, extra) {
    var out = { answerable: false, reason: reason, seat: rk || '', state: '', district: null,
                statewide: false, districtGap: false, located: false, redrawn: false,
                holders: [], pids: [], sole: false, scope: '', label: '' };
    if (extra) { for (var k in extra) out[k] = extra[k]; }
    return out;
  }

  // ── The one field function ────────────────────────────────────────────────
  // seatKey may be spelled in any of the app's dialects (ussenate1, state_rep,
  // representative …) — pdxSeatKey owns that table. Returns the shape documented
  // in the header; `pids` is the field in reading order and `holders` is the
  // subset the resolver says sits in the seat today.
  function pdxSeatField(seatKey) {
    var rk = seatKeyOf(seatKey);
    var spec = SEATS[rk];
    if (!spec) return no(rk, 'not-a-keyed-seat');

    var R = roster();
    if (!R) return no(rk, 'no-roster');

    var reps = null;
    try { reps = (typeof window.pdxRepsForMe === 'function') ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }
    if (!reps || !reps.located) return no(rk, 'no-location');
    var st = String(reps.state || '').trim();
    if (!st || st === 'National') return no(rk, 'no-state');

    var held = null;
    try { held = (typeof window.pdxSeatHolders === 'function') ? window.pdxSeatHolders(rk) : null; } catch (e) { held = null; }
    var holders = (held && held.pids) ? held.pids.slice() : [];
    var levels = (held && held.levels) ? held.levels : [];

    // The district number is the SEAT's, taken from the resolver's own level for
    // it. Two levels share the U.S. Senate key and neither has one; a district
    // seat has exactly one level and its number is the key.
    var dist = null;
    for (var i = 0; i < levels.length; i++) {
      if (levels[i] && !levels[i].statewide && levels[i].district != null && levels[i].district !== '') {
        dist = parseInt(String(levels[i].district).replace(/[^0-9]/g, ''), 10);
        if (isNaN(dist)) dist = null;
        if (dist !== null) break;
      }
    }
    if (!spec.statewide && dist === null) {
      // Honest hole, not a wider list: see the header. The caller keeps whatever
      // it already says about an unmapped district.
      return no(rk, 'no-district', { located: true, state: st, holders: holders,
                                     districtGap: !!(held && held.districtGap) });
    }

    var wantDist = spec.statewide ? null : dist;
    var pids = [];
    Object.keys(R).forEach(function (pid) {
      if (typeOf(pid) !== spec.type) return;
      if (stateOf(pid) !== st) return;
      // The 'governor' bucket is every statewide executive office (AG, treasurer,
      // auditor, Lt. Governor) because they share one browse section. The Governor
      // SEAT is one of them, so the office text has to agree — and lieutenant
      // governor is a different seat whose title contains the word.
      if (rk === 'governor') {
        var o = officeOf(pid).toLowerCase();
        if (!/governor/.test(o) || /lieutenant|lt\.?\s*gov/.test(o)) return;
      }
      if (wantDist !== null && distOf(pid) !== wantDist) return;
      if (pids.indexOf(pid) === -1) pids.push(pid);
    });

    // A resolved holder is on the field even when the keyers cannot place their
    // record (a thin roster row, an office string nobody has normalized yet).
    // The seat's own holder missing from the seat's own field is the failure this
    // file exists to end, so it is repaired here rather than reported.
    holders.forEach(function (pid) {
      if (R[pid] && pids.indexOf(pid) === -1) pids.push(pid);
    });

    pids.sort(function (a, b) {
      var ha = holders.indexOf(a), hb = holders.indexOf(b);
      if (ha !== -1 || hb !== -1) {
        if (ha === -1) return 1;
        if (hb === -1) return -1;
        return ha - hb;
      }
      var ra = STATUS_RANK[statusOf(a)]; if (ra === undefined) ra = 1;
      var rb = STATUS_RANK[statusOf(b)]; if (rb === undefined) rb = 1;
      if (ra !== rb) return ra - rb;
      return nameOf(a).localeCompare(nameOf(b));
    });

    // The scope line names what the reader is looking at: the state for a
    // statewide seat, the DISTRICT for a district seat. It used to read "your
    // districts" — plural, possessive, and true of no single seat on the page.
    var scope = spec.statewide ? st : (st + ' · District ' + dist);

    return {
      answerable: true,
      reason: '',
      seat: rk,
      state: st,
      district: spec.statewide ? null : dist,
      statewide: !!spec.statewide,
      districtGap: !!(held && held.districtGap),
      located: true,
      // Whether this seat's district number comes from the corrected current map
      // rather than the curated 2026 ballot. Published so a surface can say so
      // out loud instead of leaving the reader to reconcile two numbers.
      redrawn: !!(reps.redrawn && rk === 'house'),
      holders: holders,
      pids: pids,
      // One person on file is not an unopposed race, and no caller may say it is.
      sole: pids.length === 1,
      scope: scope,
      label: scope
    };
  }

  window.pdxSeatField = pdxSeatField;
  // The seat's own scope line, for the surfaces that print a title but do not
  // need the field. Empty string when the seat is not answerable — a caller that
  // interpolates '' prints no scope, which is the honest output.
  window.pdxSeatScope = function (seatKey) {
    var f = pdxSeatField(seatKey);
    return (f && f.answerable) ? f.scope : '';
  };
})();
