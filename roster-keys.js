/* ═══════════════════════════════════════════════════════════════════════════
   roster-keys.js — how a roster record is keyed to a seat: chamber, state and
   district number
   ────────────────────────────────────────────────────────────────────────────
   seat-field.js answers "who is on file for this seat" by keying the roster on
   office + state + district. The three keyers used to live inside compare-hub.js,
   a homepage module, so on /ballot — which does not load it — every record
   keyed to nothing and each seat's field was its sitting holder alone. They live
   here now, and compare-hub.js delegates to them, so both documents key every
   person the same way. This is a move, not a copy: compare-hub.js holds no
   second body for any of them.

     PDXRosterKeys.type(pid)          → chamber bucket   (window._pdxBrowseType)
     PDXRosterKeys.stateOf(pid)       → canonical state  (window._pdxBrowseStateOf)
     PDXRosterKeys.distNumFromStr(s)  → district number  (window._pdxDistNumFromStr)
     PDXRosterKeys.distNum(pid, fb)   → a record's district, from its own fields in
                                        one source order (window._pdxRelevantDistNum);
                                        `fb` is a caller's last-word label, which the
                                        homepage passes and /ballot does not have.
     window._pdxNormalizeState(raw, pid)

   No DOM, no storage, no network. Reads window.CMP_DATA and
   window._originalStates only.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRosterKeys) return;

  // Complete, unbiased US-state normalizer. Turns any raw state value — a full
  // name ("California"), an abbreviation ("CA", "KY-04"), a "State · County /
  // District" compound ("Utah · Cache County", "Texas · Harris County"), or a
  // federal label ("Federal", "U.S.") — into ONE canonical bucket, using EXACT
  // recognition of real states first. Only when no real US state is present in
  // the value do the dataset-specific Utah fallbacks apply, so a value can
  // never bleed into the wrong state (the old code mis-bucketed "Connecticut"
  // as Colorado via startsWith('co'), and folded every "…County" into Utah
  // before other-state checks ran). Verified by /tmp/test-state.js against the
  // live roster's distinct state values. Exposed on window for reuse/testing.
  (function () {
    if (window._pdxNormalizeState) return;
    var ABBR2NAME = {
      AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
      CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
      IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
      ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
      MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
      NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
      OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
      TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
      WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',
      PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'
    };
    var NAME_SET = {};
    Object.keys(ABBR2NAME).forEach(function (a) { NAME_SET[ABBR2NAME[a].toLowerCase()] = ABBR2NAME[a]; });
    var UTAH_PIDS = { owens:1, maloy:1, bmoore:1, kennedy:1 };
    var _canonCache = {};

    // A leading run of words that spells a real state name — but NOT when the
    // next word is "county" (so "Washington County", a Utah county, is not read
    // as Washington State). Handles multi-word names up to "District of Columbia".
    function _leadingStateName(segLow) {
      var words = segLow.split(/\s+/);
      for (var n = Math.min(3, words.length); n >= 1; n--) {
        var phrase = words.slice(0, n).join(' ');
        if (NAME_SET[phrase]) { return words[n] === 'county' ? '' : NAME_SET[phrase]; }
      }
      return '';
    }
    function _canon(s) {
      var low = s.toLowerCase();
      if (low === 'national' || low === 'federal' || low === 'cabinet' || low === 'u.s.' ||
          low === 'us' || low === 'usa' || low === 'u.s.a.' || low === 'united states') return 'National';
      if (NAME_SET[low]) return NAME_SET[low];
      if (/^[a-z]{2}$/.test(low) && ABBR2NAME[low.toUpperCase()]) return ABBR2NAME[low.toUpperCase()];
      var segs = s.split(/[·,|\/–—]/);
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i].trim(); if (!seg) continue;
        var segLow = seg.toLowerCase();
        if (NAME_SET[segLow]) return NAME_SET[segLow];
        if (/^[a-z]{2}$/.test(segLow) && ABBR2NAME[segLow.toUpperCase()]) return ABBR2NAME[segLow.toUpperCase()];
        var sub = seg.split('-')[0].trim(), subLow = sub.toLowerCase();
        if (sub !== seg) {
          if (NAME_SET[subLow]) return NAME_SET[subLow];
          if (/^[a-z]{2}$/.test(subLow) && ABBR2NAME[subLow.toUpperCase()]) return ABBR2NAME[subLow.toUpperCase()];
        }
        var lp = _leadingStateName(segLow);
        if (lp) return lp;
        var toks = seg.split(/\s+/);
        for (var j = 0; j < toks.length; j++) { if (/^[A-Z]{2}$/.test(toks[j]) && ABBR2NAME[toks[j]]) return ABBR2NAME[toks[j]]; }
      }
      return '';
    }
    function canon(s) {
      if (_canonCache[s] !== undefined) return _canonCache[s];
      var r = _canon(s); _canonCache[s] = r; return r;
    }
    window._pdxNormalizeState = function (raw, pid) {
      var st = String(raw == null ? '' : raw).trim();
      if (!st) return 'National';
      var c = canon(st);
      if (c) return c;
      // Dataset-specific Utah fallbacks — only reached when the value contains
      // NO recognizable US state, so they can never mislabel another state.
      if (pid && UTAH_PIDS[pid]) return 'Utah';
      if (/^(?:(?:u\.?\s?s\.?\s+)?(?:state\s+|us\s+)?(?:house|senate|congress(?:ional)?|legislative)\s+)?(?:district|dist\.?|hd|sd|cd)\s*#?\s*\d{1,3}$/i.test(st) ||
          /^\d{1,3}$/.test(st)) return 'Utah';
      if (/county/i.test(st)) return 'Utah'; // bare county w/ no state → Utah (Utah-focused set)
      return st; // unknown label kept as its own bucket rather than mislabeled
    };
  })();

  function _classifyBrowseType(pid) {
    var d = (window.CMP_DATA || {})[pid];
    if (!d) return 'other';
    var o = String(d.office || '').toLowerCase();
    var st = (d.state || '').trim();

    // Candidates are NOT a category of their own — they classify by the office
    // they are running FOR, so a challenger nests under the same race as the
    // incumbent (e.g. a U.S. House UT-01 candidate lands in U.S. Representatives →
    // Utah). The incumbent/candidate distinction is carried by status, not bucket.

    // "President" appears inside titles that are not the presidency, and a bare
    // substring test filed all of them under President / Executive. The Senate's
    // president pro tempore is a U.S. senator — Grassley was vanishing out of
    // "U.S. Senate · Iowa" entirely, which reads as Iowa having one senator —
    // and a school-board president is a local officeholder. Both now classify by
    // the seat they actually hold. ("Senate President" was already excluded for
    // the same reason: that is a state chamber's presiding officer.)
    var _isBoardPresidency = o.includes('school board') || o.includes('board of education') ||
                             o.includes('school district board');
    if (o.includes('president') && !o.includes('senate president') &&
        !o.includes('president pro tem') && !_isBoardPresidency) return 'president';
    if (o.includes('secretary') || o.includes('director') || o.includes('ambassador')) return 'cabinet';

    // Federal Senate — incumbents and candidates ("Candidate for U.S. Senate").
    // The bare-'senate' fallback exists for committee-chair titles ("Senate
    // Finance Committee Chair"), which are always federal here. It excluded
    // offices containing 'state' — but "Utah Senate President" does not contain
    // that word, so the Utah Senate's presiding officer was filing under
    // "U.S. Senate · Utah", i.e. the archive asserted a seat the person does not
    // hold. A state chamber's presiding officer is excluded here and picked up by
    // the state_senator clause below, where 'senate president' was already named.
    // A bare chamber title that names a DISTRICT is a state seat: U.S. Senate
    // seats have no districts. "Utah Senate candidate, District 1" was filing
    // as a U.S. Senate candidate for Utah, so no state senate field could hold
    // the person; it now falls through to the bare-chamber state_senator rule.
    if (o.includes('u.s. senator') || o.includes('u.s. senate') ||
        ((o.includes('senator') || o.includes('senate')) && !o.includes('state') &&
         !o.includes('senate president') && !/\bdistrict\b/.test(o)))
      return 'senator';

    // Federal House / Congress — incumbents and candidates ("Candidate for
    // Congress", "U.S. House Candidate", "Candidate · U.S. House (UT-01)").
    if (o.includes('u.s. rep') || o.includes('u.s. house') || o.includes('congress') ||
        (o.includes('representative') && !o.includes('state')))
      return 'representative';

    // Statewide executive / constitutional offices — Governor, Lt. Governor,
    // Attorney General, State Treasurer and State Auditor are all elected by the
    // whole state, so they share one "Statewide Executive Offices" section (the
    // 'governor' bucket) instead of being scattered across Governors / State
    // Representatives / Other. County treasurers and auditors are local seats and
    // are deliberately excluded. Checked before the state chambers so a sitting
    // legislator running for one of these seats classifies by the seat sought.
    if (o.includes('governor') || o.includes('attorney general') ||
        ((o.includes('treasurer') || o.includes('auditor')) && o.indexOf('county') === -1))
      return 'governor';

    if (o.includes('state sen') || o.includes('senate president') || o.includes('state senate')) return 'state_senator';
    if (o.includes('state rep') || o.includes('house speaker') || o.includes('house minority') || o.includes('state house') || o.includes('state assembly') || o.includes('state legislature')) return 'state_rep';
    // Bare-chamber legislative offices (e.g. "House District 56", "Candidate for
    // Senate District 12") — including candidates — land in the right state
    // chamber instead of the vague "Other" bucket. Federal seats are excluded
    // (they are already classified above as U.S. Senator / Representative).
    var _isFederalOffice = o.includes('u.s.') || o.includes('congress') || o.includes('federal');
    if (!_isFederalOffice) {
      if (o.includes('house district') || (o.includes('house') && o.includes('district')) || (o.includes('assembly') && o.includes('district'))) return 'state_rep';
      if (o.includes('senate district') || (o.includes('senate') && o.includes('district')) || (o.includes('senator') && o.includes('district'))) return 'state_senator';
    }
    // Local offices — mayors, county seats, and municipal / school-district
    // bodies. City Council, Town Council and School Board / Board of Education
    // seats are local too, so they drop into the Local level alongside county
    // offices instead of the vague "Other" bucket. State-level boards (e.g. the
    // Utah State Board of Education) are excluded so they keep their statewide
    // bucket.
    var _isSchoolBoard = (o.includes('school board') || o.includes('board of education')) && o.indexOf('state') === -1;
    if (o.includes('mayor') || o.includes('county') || o.includes('city council') ||
        o.includes('town council') || o.includes('city commission') || _isSchoolBoard) return 'local';

    // Generic candidate/nominee with no office hint (e.g. office "Candidate" or
    // "Republican Nominee") but a congressional-district state code ("FL-06",
    // "KY-04") is a U.S. House race — nest it under U.S. Representatives.
    if ((o.includes('candidate') || o.includes('nominee')) && /^[A-Za-z]{2}-\d+$/.test(st)) return 'representative';

    return 'other';
  }


  function _getPoliticianState(pid) {
    // Prefer the original hardcoded state (cached before any Firestore sync that
    // may overwrite a clean state with a bare district), then normalize.
    var C = window.CMP_DATA || {};
    var origSt = window._originalStates && window._originalStates[pid];
    var checkVal = origSt || (C[pid] && C[pid].state) || '';
    return window._pdxNormalizeState(checkVal, pid);
  }

  function _pdxDistNumFromStr(s) {
    if (s == null) return null;
    s = String(s).trim();
    if (!s) return null;
    var m;
    // "District 15" / "House District 15" / "Congressional District 2"
    if ((m = s.match(/\bDistrict\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
    // "HD15" / "HD 15" / "H.D. 15" / "SD6" / "CD2" (house/senate/congress abbrev.)
    if ((m = s.match(/\b[HSC]\.?\s?D\.?\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
    // "UT-15" / "FL-06" / "UT 15" (state code + district)
    if ((m = s.match(/\b[A-Za-z]{2,}-\s*0*(\d{1,3})\b/))) return parseInt(m[1], 10);
    // "(Dist. 56)" / "Dist 56"
    if ((m = s.match(/\bDist\.?\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
    // A value that is essentially just the number ("15", "#15").
    if ((m = s.match(/^#?\s*0*(\d{1,3})\s*$/))) return parseInt(m[1], 10);
    return null;
  }

  // Read the district number straight from the record's own fields — the
  // dedicated `district` field is most authoritative, then the (possibly
  // Firestore-overwritten) `state` field, the cached original state, and the
  // office text — then the caller's fallback label, if it has one.
  function _relevantDistNum(pid, fallback) {
    var d = (window.CMP_DATA || {})[pid];
    if (!d) return null;
    var orig = window._originalStates && window._originalStates[pid];
    var sources = [d.district, d.state, orig, d.office];
    for (var i = 0; i < sources.length; i++) {
      var n = _pdxDistNumFromStr(sources[i]);
      if (n !== null) return n;
    }
    if (typeof fallback === 'function') {
      try { return _pdxDistNumFromStr(fallback(pid)); } catch (e) { return null; }
    }
    return null;
  }

  window.PDXRosterKeys = {
    type: _classifyBrowseType,
    stateOf: _getPoliticianState,
    distNumFromStr: _pdxDistNumFromStr,
    distNum: _relevantDistNum
  };
  // The window names seat-field.js and archive-browse.js already read. On the
  // homepage compare-hub.js assigns its delegating wrappers over these, which
  // give the same answers.
  if (typeof window._pdxBrowseType !== 'function') window._pdxBrowseType = _classifyBrowseType;
  if (typeof window._pdxBrowseStateOf !== 'function') window._pdxBrowseStateOf = _getPoliticianState;
  if (typeof window._pdxDistNumFromStr !== 'function') window._pdxDistNumFromStr = _pdxDistNumFromStr;
  if (typeof window._pdxRelevantDistNum !== 'function') window._pdxRelevantDistNum = function (pid) { return _relevantDistNum(pid); };
})();
