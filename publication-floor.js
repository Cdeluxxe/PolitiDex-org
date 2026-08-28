/* ═══════════════════════════════════════════════════════════════════════════
   publication-floor.js — one rule for "is this record publishable?"
   ────────────────────────────────────────────────────────────────────────────
   WHY THIS FILE EXISTS

   A sitemap is a claim. Listing /p/<id> tells a search engine, and through it a
   reader, that there is a record at that address worth arriving at. The app
   already knows perfectly well which person files are thin — profiles-full.js
   computes _isThinProfile and prints a "still being built" notice instead of a
   record — but that knowledge lived inside a render function, where a generator
   running in Node could not reach it. So a sitemap written from the roster would
   have published all 757 ids, including the 148 that have no cited position at
   all, and the app would then have greeted those visitors with the thin notice.
   An index entry that lands on "still being built" is the same silent lie as a
   /vote/ link that quietly shows the front page.

   This module is that rule, extracted once, in a form both callers can run:

     · the browser, where it is window.PDXPublicationFloor and answers whether a
       durable URL may be advertised for the person currently open;
     · scripts/gen-sitemap.mjs, which loads this exact file in a VM alongside
       cmp-data.js and the stance chunks, so the sitemap cannot drift from what
       the app believes.

   WHAT THE FLOOR IS, AND WHY IT SITS WHERE IT SITS

   Two conditions, both required.

   1. IDENTITY. name, office and state, from the roster (CMP_DATA). This is not
      a formality: window.ISSUE_STANCE_DATA carries positions for 258 keys the
      roster does not carry at all — people who appear in a stance file and have
      no record page to arrive at. A URL for one of those is an address with
      nobody behind it.

   2. CITED RECORD CONTENT. At least MIN_CITED_POSITIONS documented positions
      that each carry a source URL, or one such position plus at least one
      tracked promise, or at least MIN_CITED_POSITIONS measures with a sourced
      formal act on file. "Cited" is load-bearing — a position with no source is
      exactly the thing this product refuses to publish, so it cannot be the
      thing that earns an address.

      THE THIRD DOOR IS NOT A LOWER FLOOR. MIN_CITED_POSITIONS has never moved
      and does not move here; the same number is asked of a third source of
      cited content the floor used to be unable to see. The formal record —
      roll calls and committee acts — lives in the database behind
      /api/voting-record, not in the repo, so for as long as this file read only
      CMP_DATA and ISSUE_STANCE_DATA it was answering "is there anything cited
      here?" while looking away from the most heavily cited material in the
      product. It said no about files holding a hundred sourced formal acts, and
      the person-file kicker then printed "record still being built" over them.
      That was the floor being wrong, not strict.

      formal-index.js closes it: a generated, committed count of sourced acts
      per person, built from the shipped lane seeds by
      scripts/gen-formal-index.mjs, so both runtimes read the same integers and
      the browser needs no fetch to ask. The door counts MEASURES rather than
      acts, because "two documented positions" has always meant two subjects and
      never one subject voted on twice.

   The threshold is two rather than one because the product already has a word
   for one item, and it is "thin": word-action.js prints "this row rests on one
   item" and marks it pdxwa-row-thin. Publishing an address for a record the app
   itself labels thin would be lowering the floor to fill the sitemap, which is
   the one thing the floor exists to prevent. Two is not a new doctrine; it is
   the existing thin/not-thin line, applied to a URL.

   WHAT THIS FILE IS NOT

   It is not a score. It returns a boolean and the reasons behind it, never a
   number, never a ranking, and nothing here is displayed as a quality grade. A
   record below the floor is not a worse record — it is a record we decline to
   advertise an address for until it has cited content to show.

   It reads no party field and it has no opinion about one.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  if (root.PDXPublicationFloor) return;

  // Two cited positions, or one plus a tracked promise, or two measures with a
  // sourced formal act. See the note above for why this is the existing
  // thin/not-thin line rather than a new number, and why the third door is the
  // same number asked of a source this file could not previously see.
  var MIN_CITED_POSITIONS = 2;

  // A pid is part of a URL, so its shape is part of the contract. Every id in
  // the roster today is [a-z0-9_]+, which makes /p/<pid> unambiguous with no
  // slug table to keep in sync. An id outside this shape does not get an
  // address — the sitemap test fails on it rather than emitting a URL that
  // needs escaping to survive being pasted.
  var PID_RE = /^[a-z0-9_]+$/;

  function isPid(pid) { return typeof pid === 'string' && PID_RE.test(pid); }

  // All three data sources are injectable so the generator can hand in exactly
  // what it loaded, and so a test can probe the rule with a fixture instead of
  // the 757-record roster. Defaults are the globals the app itself reads.
  function sources(src) {
    src = src || {};
    return {
      roster: src.roster || root.CMP_DATA || {},
      stances: src.stances || root.ISSUE_STANCE_DATA || {},
      // Absent in a sandbox that did not load formal-index.js, which must cost
      // the third door and nothing else — never a thrown floor decision.
      formal: src.formal || root.PDXFormalIndex || null
    };
  }

  // Positions that carry a source URL. A source object with a label and no url
  // is a citation you cannot follow, so it does not count toward the floor.
  function citedPositions(pid, src) {
    var s = sources(src).stances;
    var list = s && s[pid];
    if (!list || typeof list.length !== 'number') return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it && it.source && it.source.url) out.push(it);
    }
    return out;
  }

  // Promise counts as the roster carries them. Read defensively: this field is
  // absent on most records and must never throw a floor decision.
  function promiseCount(pid, src) {
    var d = sources(src).roster[pid];
    if (!d) return 0;
    var n = 0;
    ['kept', 'broken', 'pending'].forEach(function (k) {
      var v = Number(d[k]);
      if (isFinite(v) && v > 0) n += v;
    });
    return n;
  }

  // Measures with at least one sourced formal act on file. Read through the
  // generated index rather than through a live record fetch: the floor is asked
  // at kicker time, before /api/voting-record has resolved, and a floor whose
  // answer depends on network timing would flicker between two claims about the
  // same file.
  function formalMeasures(pid, src) {
    var f = sources(src).formal;
    if (!f || typeof f.measures !== 'function') return 0;
    var n = Number(f.measures(pid));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function identity(pid, src) {
    var d = sources(src).roster[pid];
    if (!d) return null;
    var name = d.name ? String(d.name).trim() : '';
    var office = d.office ? String(d.office).trim() : '';
    var state = d.state ? String(d.state).trim() : '';
    if (!name || !office || !state) return null;
    return { pid: pid, name: name, office: office, state: state };
  }

  // The whole decision, with its reasons. Callers that need to explain a blank
  // — the sitemap report, a test that wants to say WHY an id was excluded —
  // read `reasons`; callers that just need a gate read `publishable`.
  function read(pid, src) {
    var out = {
      pid: pid, publishable: false, reasons: [],
      identity: null, cited: 0, promises: 0, formal: 0
    };
    if (!isPid(pid)) { out.reasons.push('pid-shape'); return out; }
    out.identity = identity(pid, src);
    if (!out.identity) { out.reasons.push('no-identity'); }
    out.cited = citedPositions(pid, src).length;
    out.promises = promiseCount(pid, src);
    out.formal = formalMeasures(pid, src);
    var contentOk = out.cited >= MIN_CITED_POSITIONS ||
                    (out.cited >= 1 && out.promises > 0) ||
                    out.formal >= MIN_CITED_POSITIONS;
    // A promise total is not content. It can only ever TOP UP one cited
    // position, and on its own it does not open a door — which is why a file
    // with twenty-five tracked promises, no cited stance and no formal act
    // still fails, and why the reason it fails says "no cited record" rather
    // than pretending the promises were the near miss.
    if (!contentOk) {
      out.reasons.push((out.cited === 0 && out.formal === 0) ? 'no-cited-record' : 'thin-record');
    }
    out.publishable = !!out.identity && contentOk;
    return out;
  }

  function clears(pid, src) { return read(pid, src).publishable; }

  // Every publishable id, sorted, for the generator. Sorted rather than
  // insertion-ordered so two runs over unchanged data produce byte-identical
  // output and a sitemap diff means something changed in the records.
  function publishable(src) {
    var roster = sources(src).roster;
    return Object.keys(roster).filter(function (pid) {
      return clears(pid, src);
    }).sort();
  }

  root.PDXPublicationFloor = {
    MIN_CITED_POSITIONS: MIN_CITED_POSITIONS,
    PID_RE: PID_RE,
    isPid: isPid,
    read: read,
    clears: clears,
    publishable: publishable,
    _citedPositions: citedPositions,
    _promiseCount: promiseCount,
    _formalMeasures: formalMeasures,
    _identity: identity
  };
})();
