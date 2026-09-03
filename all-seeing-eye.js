// ─────────────────────────────────────────────────────────────────────────────
// All-Seeing Eye search
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 68581 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  (function () {
    'use strict';
    var input = document.getElementById('pdx-eye-input');
    var panel = document.getElementById('pdx-eye-panel');
    var eye   = document.getElementById('pdx-eye');
    var clear = document.getElementById('pdx-eye-clear');
    if (!input || !panel || !eye) return;

    // ── tiny helpers ──────────────────────────────────────────────────
    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function norm(s) { return String(s == null ? '' : s).toLowerCase(); }
    // A chip that names a vocabulary key is painted by that key, from the one
    // table every other surface reads (issue-colors.js). Same strength as a bill
    // letterhead chip: soft fill, solid border, ink text. Fails open to the
    // stylesheet's own colour when the module has not loaded.
    function issueTint(key) {
      try {
        var IC = window.PDXIssueColors;
        if (!IC || typeof IC.styleFor !== 'function') return '';
        var st = IC.styleFor(key);
        return st ? ' data-ic="on" style="' + esc(st) + '"' : '';
      } catch (e) { return ''; }
    }
    // Canonicalize a party string to a display chip {label,color}.
    function partyChip(raw) {
      var p = String(raw || '').trim().toUpperCase();
      if (!p) return null;
      var c = p.charAt(0);
      if (c === 'R') return { label: 'R', color: '#f87171' };
      if (c === 'D') return { label: 'D', color: '#60a5fa' };
      if (c === 'I') return { label: 'IND', color: '#a78bfa' };
      return { label: p.slice(0, 3), color: '#94a3b8' };
    }
    // Leading emoji (if any) from a label like "🏥 Healthcare …".
    function leadEmoji(s) {
      var m = String(s || '').match(/^\s*(\p{Extended_Pictographic}(?:️)?)/u);
      return m ? m[1] : '';
    }
    function stripEmoji(s) {
      return String(s || '').replace(/^\s*\p{Extended_Pictographic}(?:️)?\s*/u, '').trim();
    }

    // ── data access (defensive — sources may load asynchronously) ─────
    // ONE PERSON IS ONE RESULT.
    //
    // This is the surface the defect was reported from: a query for "chew"
    // returned two current Utah House District 68 officeholders. It got there
    // honestly — the haystack is the union of every CMP_DATA and PROFILES key,
    // and `scott_chew` is a real Firestore document key. What it is not is a
    // second person: PDX_PROFILE_ALIAS (profile-evidence.js) has said `scott_chew`
    // and `chew_h68` are one officeholder the whole time, which is why tapping
    // the stub row already landed on /p/chew_h68 — the reader was shown a choice
    // between two files that were never two files.
    //
    // So the ids are grouped by the address they actually open, through the one
    // resolver the arrival path uses, and each group becomes ONE row. The groups
    // are kept rather than thrown away because the duplicate document is not
    // noise — it holds a bio and topics of its own, and a row that swallowed a
    // record's text would trade a cosmetic defect for a discoverability one. See
    // the haystack union in buildIndex below.
    function polIdGroups() {
      var raw = [];
      try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA) raw = raw.concat(Object.keys(CMP_DATA)); } catch (e) {}
      try { if (window.PROFILES) raw = raw.concat(Object.keys(window.PROFILES)); } catch (e) {}
      var g = null;
      if (typeof window.PDXCanonIds === 'function') {
        try { g = window.PDXCanonIds(raw); } catch (e) { g = null; }
      }
      // Fail open, and fail to the OLD behaviour: with the resolver unavailable
      // the eye still lists everybody, de-duplicated by raw id exactly as it was.
      if (!g || !g.ids) {
        var order = [], groups = Object.create(null);
        raw.forEach(function (id) { if (!groups[id]) { groups[id] = [id]; order.push(id); } });
        g = { ids: order, groups: groups };
      }
      // The RAW count, for the index cache key: it must stay at least as
      // sensitive to a roster arrival as it was before this grouping existed, and
      // a page of Firestore docs that are all retired ids would not move the
      // collapsed count at all.
      g.total = raw.length;
      return g;
    }
    function polRec(id) {
      var p = null;
      try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
      if (!p) { try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) p = CMP_DATA[id]; } catch (e) {} }
      return p;
    }
    function photoFor(id) {
      try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
      return '';
    }
    // The searchable text of ONE record. Lifted out of the people loop below so
    // the same fields are harvested from a retired document as from the record it
    // resolves into — collapsing two rows into one must not make a person harder
    // to find by a word only the duplicate happened to carry.
    function hayParts(d) {
      if (!d) return [];
      var parts = [d.name, d.office, d.state, d.district, d.bio, d.quote, d.tagline, d.summary];
      if (Array.isArray(d.issues)) parts = parts.concat(d.issues);
      else if (typeof d.issues === 'string') parts.push(d.issues);
      if (d.stances && typeof d.stances === 'object') {
        for (var k in d.stances) { if (d.stances[k]) parts.push(d.stances[k]); }
      }
      return parts;
    }

    // ── LANE READINESS ────────────────────────────────────
    // THE EYE MUST NOT DENY WHAT IT HAS NOT LOOKED FOR.
    //
    // Typing 6644 used to flash "The eye finds nothing for 6644", and then, a
    // moment later, H.R. 6644 appeared. Both paints were produced by the same
    // code and only one of them was true. The first was a report on an index that
    // did not exist yet: this script is a plain sync tag, so it runs BEFORE the
    // deferred roster and stance bundles, before the lazily-injected light bill
    // index, and long before the paged /measures fetch that is the only place
    // H.R. 6644 lives at all. A search over an empty haystack returns nothing,
    // and the panel published that nothing as a finding.
    //
    // "Nothing found" and "nothing loaded" are different answers to a reader's
    // question, and the difference is the whole credibility of a record archive:
    // one says the record does not contain this, the other says the record has
    // not arrived. So each lane the eye searches carries three states, and the
    // panel is only ever allowed to print the third:
    //
    //   · WARMING          — the lane's sources have not all landed. "Searching
    //                        the record…". Never "finds nothing", at any point,
    //                        for any query.
    //   · READY, WITH HITS — the ordinary result list.
    //   · READY, WITH NONE — and only here, "The eye finds nothing".
    //
    // Three lanes, named for what a reader is looking for rather than for the
    // files behind them:
    //
    //   people — the roster (CMP_DATA / PROFILES) and the receipts filed against
    //            it (ISSUE_STANCE_DATA). A person and that person's positions are
    //            one record, so they warm and clear together.
    //   bills  — the light inline index (bills-index.js, lazily injected) merged
    //            with the authoritative paged /measures list. THIS is the lane the
    //            defect was reported from.
    //   issues — the national issue categories and the Issue Spotlights.
    //
    // Every lane also has a CEILING. A lane whose source never announces itself —
    // an offline boot, a 404, a bundle nobody ever requests — must not leave the
    // eye saying "Searching the record…" for the rest of the session, because a
    // permanent "searching" is a worse lie than a momentary "nothing". After the
    // deadline a lane is treated as ready and reports honestly on whatever it did
    // manage to load.
    var LANE_DEADLINE_MS = 8000;
    var bootAt = Date.now();
    var billsSettled = false;
    // ── THE MEASURES SLICE IS NOT GOVERNED BY A CLOCK ────────────────────
    // WHAT WAS WRONG, AGAIN, AND WITH A DIFFERENT MEASURE. 8245 — the emergency
    // price relief memorandum — was still being denied on a cold load: the panel
    // painted "Formal 0" and "The eye finds nothing for 8245", and a moment later
    // the same query painted the memo under Legislation & Bills. The first frame
    // was a denial of a record that was already on the wire.
    //
    // The clock is why. The memo lives ONLY in the paged /measures list, which is
    // pulled a hundred rows at a time and can take far longer than eight seconds
    // to walk on a cold function and a cold branch. The ceiling expired while the
    // pages were still landing, laneReady() answered true on the strength of a
    // deadline, and the eye reported an index it had not finished reading.
    //
    // So the measures lane is taken off the clock. It is not like the other three:
    // the roster, the register and the issue library are passive globals — nothing
    // ever announces that a bundle is not coming, which is exactly why they need a
    // ceiling. THIS lane owns its request and is told how it ended, so its wait
    // ends on that outcome and on nothing else. A slice that has not been fetched
    // is cold no matter what the clock says, and a cold slice gets a loading line
    // in the measures group rather than a zero in the Formal count.
    //
    // Two things still end the wait without a response, and neither is a parse
    // clock — both are facts about the REQUEST:
    //   · IT STALLED. Nothing has landed for MEASURES_STALL_MS. The window is
    //     stamped when the request goes out and re-stamped by every page that
    //     arrives, so a long walk that is still making progress never trips it;
    //     only a walk that has gone quiet does.
    //   · IT WAS NEVER ISSUED. bills.js itself never executed, so there is no
    //     request to wait on. A deferred module that has not run half a minute
    //     after the parse ended is absent rather than late.
    var MEASURES_STALL_MS = 30000;
    var measuresAt = 0;        // when the paged request last made progress
    function measuresWarm() {
      if (billsSettled) return true;               // a terminal outcome: rows, none, or a failure
      if (!docReady()) return false;               // nothing deferred has had a turn yet
      if (measuresAt) return (Date.now() - measuresAt) > MEASURES_STALL_MS;
      return (Date.now() - bootAt) > MEASURES_STALL_MS;
    }
    // ── AND THE CEILING'S CLOCK STARTS WHEN A LANE COULD HAVE ARRIVED ────
    // WHAT WAS WRONG. bootAt was stamped the moment this file ran, and this file
    // is a plain synchronous tag partway down a very large document. Every
    // source a lane waits on is behind `defer`: the roster, the register and the
    // measures fetch cannot execute until the parse finishes. So at bootAt none
    // of them had been given a chance yet — and on a slow load the parse alone
    // outruns eight seconds. The ceiling then expired while the page was still
    // loading, laneReady() answered true on a technicality, and the eye printed
    // "finds nothing" for a query the record answers. 8245 typed on a cold load
    // was denied that way.
    //
    // The ceiling is still a ceiling — the deadline is unchanged and nothing
    // warms forever. What moved is where its clock starts: the first instant a
    // deferred script could have run, which is DOMContentLoaded. While the
    // document is still parsing, no lane is past anything, because no lane has
    // been offered a turn.
    function docReady() {
      try { return String(document.readyState || '') !== 'loading'; } catch (e) { return true; }
    }
    try {
      if (!docReady() && document.addEventListener) {
        document.addEventListener('DOMContentLoaded', function () { bootAt = Date.now(); });
      }
    } catch (e) {}
    function pastDeadline() {
      if (!docReady()) return false;
      return (Date.now() - bootAt) > LANE_DEADLINE_MS;
    }
    function stanceCount() {
      try { return Object.keys(window.ISSUE_STANCE_DATA || {}).length; } catch (e) { return 0; }
    }
    function spotlightCount() {
      try {
        return (window.PDXSpotlight && typeof window.PDXSpotlight.list === 'function')
          ? window.PDXSpotlight.list().length : 0;
      } catch (e) { return 0; }
    }
    // pdx-lazy-data.js is the honest witness for a bundle that is legitimately
    // empty: `loaded` flips the moment the file has executed, whether or not it
    // put anything in the global.
    function lazyDone(key) {
      try { return !!(window.PDXLazyData && window.PDXLazyData.loaded(key)); } catch (e) { return false; }
    }
    // The issue REGISTER — the map every issue file is built from. It arrives with
    // alignment-tool.js, which is deferred like everything else here.
    function registerCount() {
      try { return Object.keys(window.ISSUE_MAP || {}).length; } catch (e) { return 0; }
    }
    var LANE_ORDER = ['people', 'bills', 'files', 'issues'];
    var LANE_TESTS = {
      people: function () { return polIdGroups().total > 0 && stanceCount() > 0; },
      bills: function () { return measuresWarm(); },
      // THE REGISTER IS ITS OWN LANE. The formal lane's first group — the issue
      // files — is built from ISSUE_MAP. The families and the spotlights are
      // not, and neither of them says anything about whether the register has
      // landed. Asking one question for all three meant a cold register could be
      // reported ready on the strength of a core list that ships inline, and a
      // query a file answers got the panel's denial instead of a loading line.
      // One source, one question, one notice.
      files: function () { return registerCount() > 0; },
      issues: function () {
        return (window.CORE_NATIONAL_ISSUES || []).length > 0 && (lazyDone('spotlights') || spotlightCount() > 0);
      }
    };
    // WHICH LANES THE CEILING SPEAKS FOR. The roster, the register and the issue
    // library wait on globals that never announce their own absence, so a clock is
    // the only thing that can end their wait. The measures lane is told how its
    // request ended — see measuresWarm() — and a deadline that fired while the
    // pages were still landing is what denied 8245, so the ceiling does not get a
    // vote on that lane.
    function clockGoverned(lane) { return lane !== 'bills'; }
    function laneReady(lane) {
      var t = LANE_TESTS[lane];
      if (!t) return true;
      var r = false;
      try { r = !!t(); } catch (e) { r = false; }
      return r || (clockGoverned(lane) && pastDeadline());
    }
    function warmingLanes() {
      return LANE_ORDER.filter(function (l) { return !laneReady(l); });
    }
    // Which lane answers which result category. Politicians and their receipts are
    // two categories over one lane, which is why the warming notice is printed per
    // LANE and not per category — one loading roster is one fact.
    var CAT_LANE = {
      pol: 'people', stance: 'people', bill: 'bills',
      // Files come from the register; families and spotlights come from the core
      // list and the spotlight bundle. Two sources, so two lanes.
      file: 'files', fam: 'issues', spot: 'issues'
    };
    var LANE_TITLES = {
      people: 'Politicians & Positions', bills: 'Legislation & Bills',
      files: 'Issue files \u00b7 the formal record', issues: 'Issues & Hot Topics'
    };
    var LANE_DOTS = { people: '#f5c842', bills: '#9ff0bd', files: '#7dd3fc', issues: '#fb923c' };
    var LANE_NOUNS = {
      people: 'the roster and its receipts', bills: 'the legislation index',
      files: 'the issue register', issues: 'the issue library'
    };

    // ── TWO MODES, ONE BOX ────────────────────────────────────────────────
    // WHAT WAS WRONG. One list called "Issues & Hot Topics" held four different
    // kinds of thing at once: /i/<key> issue files, the thirteen core bundles,
    // Spotlights, and whatever names happened to fuzzy-match. Typed "land pres",
    // a reader asking what the RECORD says about public lands got a wildfire
    // Spotlight first, because a deep local investigation and a formal issue file
    // were competing on one relevance number. They are not competing. They are
    // answers to two different questions, read at two different moments, so they
    // get two lists and the reader says which one they are in.
    //
    // FORMAL IS THE DEFAULT, because this site's claim is the record. It holds the
    // issue files, the families they sit in, the roster (formal-row holders
    // first) and the measures. A Spotlight does not appear in it — not demoted,
    // ABSENT, including as a cross-link chip on a person row: in the formal lane
    // a row's neighbours are formal too.
    //
    // PUBLIC is what was said and reported: Spotlights, quotes, stated positions.
    // No /i/ file row appears in it, and neither does the file lead block.
    //
    // WHAT THE TOGGLE IS NOT. It is not a filter on the query — the string in the
    // box is untouched, `curQ` never changes, and an expanded category stays
    // expanded across a switch, because nothing about the reader's question
    // changed. Only the ranking and the visible groups swap. It is not persisted
    // either: a mode is a posture inside one search session, not a preference.
    // And no party letter is a term in either mode's ordering — see rank().
    //
    // AND A MANDATE IS A THIRD LANE — NOT PUBLIC, AND NOT FORMAL.
    // The People's Mandate is the site's third kind of document, and with two
    // lanes it had nowhere honest to sit. In PUBLIC it would read as a quote: a
    // thing somebody SAID, when a proposed reform is a thing citizens are ASKING
    // FOR and nobody may have said a word about it. In FORMAL it would read as a
    // measure: a thing that was VOTED ON, when a proposed vehicle has no tally at
    // all, not even a failed one. Both readings are wrong in the same direction —
    // they lend the document a standing it has not got — so it gets a lane of its
    // own, labelled for what it is, and the empty state says what it is too.
    //
    // WHAT THE MANDATE LANE MAY NOT CARRY. No formal pattern chip, no Word vs
    // Action figure, no "backs it up" action, no percentage and no party term:
    // every one of those is a reading of a RECORD, and this document has none.
    // Nor does its count enter a formal denominator — laneCounts keeps mandate in
    // its own slot, and formalPatternIndex, Direction Match and Word vs Action
    // never see a mandate row. See mandateItem() and the laneCounts note below.
    var laneMode = 'formal';
    var LANE_MODES = [
      { id: 'formal', label: 'Formal record', ico: '🏛' },
      { id: 'public', label: 'Public & spotlights', ico: '🔦' },
      { id: 'mandate', label: 'Mandate', ico: '📜' }
    ];
    // One list, asked instead of a hardcoded pair of strings, so a third lane
    // cannot be half-added: the toggle, the click handler and PDXEye.lane() all
    // read membership from here.
    function isLaneMode(m) {
      for (var i = 0; i < LANE_MODES.length; i++) { if (LANE_MODES[i].id === m) return true; }
      return false;
    }
    // What each lane holds, in the lane's own words, and where the rest of the
    // record went. The trailing clause is kept in the singular-friendly form
    // "in the other lanes" so the sentence is true with three of them.
    var LANE_SAY = {
      formal: 'Issue files, the families they sit in, the roster and the measures. Spotlights, quotes and mandates are in the other lanes',
      'public': 'Spotlights, quotes and stated positions. Issue files, measures and mandates are in the other lanes',
      mandate: 'People\u2019s Mandate reforms only \u2014 a mandate is a proposed vehicle, not a vote and not a quote. Files, measures and spotlights are in the other lanes'
    };
    var LANE_SHORT = { formal: 'Formal record', 'public': 'Public & spotlights', mandate: 'Mandate' };
    // Each mode says what it holds AND what the OTHER TWO hold, with a count
    // each, so no lane can dead-end a reader who picked the wrong one. A bill
    // number typed in the Mandate lane is not "no results"; it is results in the
    // formal lane, and the sentence under the control names the number.
    function laneModeBar(counts, warm) {
      var h = '<div class="pdx-eye-lane" role="group" aria-label="Which lane of the record to search">';
      for (var i = 0; i < LANE_MODES.length; i++) {
        var m = LANE_MODES[i], on = (m.id === laneMode);
        var nHtml = '';
        if (counts) {
          var cold = laneCountCold(m.id, counts, warm);
          var nAttrs = cold ? ' class="pdx-eye-lane-n is-warm" title="Still loading"' : ' class="pdx-eye-lane-n"';
          nHtml = '<span' + nAttrs + '>' + laneCountText(m.id, counts, warm) + '</span>';
        }
        h += '<button type="button" class="pdx-eye-lane-btn' + (on ? ' is-on' : '') +
          '" data-eye-lane="' + m.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="pdx-eye-lane-ico" aria-hidden="true">' + m.ico + '</span>' + esc(m.label) +
          nHtml +
          '</button>';
      }
      var others = [];
      for (var j = 0; j < LANE_MODES.length; j++) {
        var oid = LANE_MODES[j].id;
        if (oid === laneMode) continue;
        others.push(esc(LANE_SHORT[oid] || oid) + ' holds <b>' + (counts ? laneCountText(oid, counts, warm) : 0) + '</b>');
      }
      h += '<span class="pdx-eye-lane-say">' + esc(LANE_SAY[laneMode] || '') +
        (counts ? ': ' + others.join(' and ') + ' for this search.' : '.') + '</span>';
      return h + '</div>';
    }
    // ── A ZERO IS A COUNT OF A RECORD THAT ARRIVED ────────────────────────
    // "Formal 0" is the same claim as "the eye finds nothing", printed as a
    // number, and 8245 was denied in both fonts at once: the memo lives only in
    // the paged /measures list, so while that slice is cold the formal lane's
    // total is not zero — it is unknown. A lane whose count is nothing AND one of
    // whose sources is still loading prints the wait instead of the figure. A lane
    // with hits prints the hits: a number that is short by a lane still coming is
    // a floor, not a lie, and the loading line in that lane's own group says which
    // group is still to be added to.
    function laneCountCold(mode, counts, warm) {
      if (!warm || !warm.length) return false;
      if ((counts && counts[mode]) > 0) return false;
      var cats = MODE_CATS[mode] || [];
      for (var i = 0; i < cats.length; i++) {
        if (warm.indexOf(CAT_LANE[cats[i]]) !== -1) return true;
      }
      return false;
    }
    function laneCountText(mode, counts, warm) {
      return laneCountCold(mode, counts, warm) ? '…' : ((counts && counts[mode]) || 0);
    }
    // THE EMPTY STATE IS THE HONEST STATE, so it is a locked sentence rather than
    // a hidden lane. A search that no reform answers gets this, verbatim — the
    // lane is never dropped from the control just because it came back empty, and
    // the copy explains what the reader was looking for in the first place.
    var MANDATE_EMPTY = 'No mandate on file for this search. A mandate is a proposed vehicle \u2014 not a vote and not a quote.';
    function mandateEmptyHtml() {
      return '<div class="pdx-eye-empty pdx-eye-mand-empty">' + esc(MANDATE_EMPTY) + '</div>';
    }
    // Does this person have a formal row at all — a vote or a formal action on
    // file? Asked of the shipped index, guarded, and used ONLY to partition an
    // already-ranked list. It adds no score, so relevance order survives inside
    // each half and a person with nothing on file is still findable by name.
    function hasFormalRow(pid) {
      try {
        var C = window.PDXConsistency, F = C && C.formalPatternIndex;
        if (!F || typeof F.count !== 'function') return false;
        return (F.count(pid) || 0) > 0;
      } catch (e) { return false; }
    }
    function formalFirst(list) {
      var withRow = [], without = [];
      for (var i = 0; i < list.length; i++) {
        (hasFormalRow(list[i].id) ? withRow : without).push(list[i]);
      }
      return withRow.concat(without);
    }

    // ── build the search index (people + issues), memoized ────────────
    var index = null, indexKey = '', relCache = {};
    function buildIndex() {
      // `issues` is Spotlights only now. The thirteen bundles are `families` and
      // the register's own keys are `files`, because the toggle above renders
      // them as three separate answers and one mixed array cannot be ordered
      // three ways at once.
      var people = [], issues = [], families = [], files = [];

      // Politicians — mirror the app's browse haystack so a nav search and the
      // "All Politicians" search surface the same records.
      var polGroups = polIdGroups();
      polGroups.ids.forEach(function (id) {
        var alsoKnownAs = polGroups.groups[id] || [id];
        var d = polRec(id);
        // The row reads from the record its own address opens. Only if that record
        // carries no name at all does a retired sibling's stand in, so a collapse
        // can never turn a findable person into no result.
        if (!d || !d.name) {
          for (var ai = 0; ai < alsoKnownAs.length; ai++) {
            var altRec = polRec(alsoKnownAs[ai]);
            if (altRec && altRec.name) { d = altRec; break; }
          }
        }
        if (!d || !d.name) return;
        var parts = hayParts(d);
        // Every address that resolves into this row contributes its text to it, so
        // a term that only ever appeared in the duplicate document still reaches
        // the one person it was about.
        alsoKnownAs.forEach(function (alt) {
          if (alt !== id) parts = parts.concat(hayParts(polRec(alt)));
        });
        var pc = partyChip(d.party);
        if (pc) parts.push(pc.label === 'R' ? 'republican gop' : pc.label === 'D' ? 'democrat democratic' : 'independent');
        var sub = [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
          .filter(Boolean).join(' · ');
        people.push({
          kind: 'pol', id: id, title: d.name,
          titleLc: norm(d.name),
          tokens: norm(d.name).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
          sub: sub, icon: d.icon || '🏛', party: pc,
          hay: parts.filter(Boolean).join(' ').toLowerCase()
        });
      });

      // Issue Spotlights (Hot Topics) — deep, sourced local investigations.
      try {
        if (window.PDXSpotlight && typeof window.PDXSpotlight.list === 'function') {
          window.PDXSpotlight.list().forEach(function (sp) {
            if (!sp || !sp.slug) return;
            var desc = sp.blurb || sp.summary || sp.metaDescription || '';
            var parts = [sp.title, sp.place, sp.eyebrow, desc, sp.summary, sp.controversy, sp.searchKeywords];
            // Phase 2 — pull the key claims/sections into the haystack so a query
            // can reach a Spotlight through its timeline or the way people group.
            if (Array.isArray(sp.timeline)) sp.timeline.forEach(function (t) { if (t && t.text) parts.push(t.text); });
            if (Array.isArray(sp.groups)) sp.groups.forEach(function (g) { if (g && g.label) parts.push(g.label); });
            if (Array.isArray(sp.evidence)) sp.evidence.forEach(function (ev) { if (ev && ev.label) parts.push(ev.label); });
            issues.push({
              kind: 'spotlight', slug: sp.slug, title: sp.title || 'Issue Spotlight',
              titleLc: norm(sp.title),
              tokens: norm(sp.title).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
              sub: sp.place ? ('🔦 Spotlight · ' + sp.place) : '🔦 Issue Spotlight',
              desc: desc, icon: '🔦',
              hay: parts.filter(Boolean).join(' ').toLowerCase()
            });
          });
        }
      } catch (e) {}

      // ── THE THIRTEEN, AS A TABLE OF CONTENTS ────────────────────────────
      // A core is a place to browse from: it has no record of its own and nothing
      // characterises a person "on" a core (see pdx-issue-family.js). So the row
      // is `kind: 'family'`, not `kind: 'issue'`, and activating it opens the
      // desk's own family shelf — the inventory and the child chips under it —
      // instead of the 882-person ranking that used to answer a bundle query as
      // though the bundle itself had been read. The ranking still exists; it is
      // one tap deeper, behind the key the reader actually meant.
      //
      // AND THE ROW IS NOT AN ADDRESS. It used to be an anchor on the core's own
      // path, which resolved to no file and left the reader looking at nothing —
      // see issueFileHref() and navigate('family') below. A family is a door on
      // this page, not a document with a citation.
      try {
        var core = window.CORE_NATIONAL_ISSUES || [];
        core.forEach(function (ci) {
          if (!ci || !ci.label) return;
          var parts = [ci.label, ci.blurb].concat(ci.keys || []);
          var kidN = (ci.keys || []).length;
          families.push({
            kind: 'family', issueKey: ci.key, keys: (ci.keys || []).slice(), title: stripEmoji(ci.label) || ci.label,
            titleLc: norm(stripEmoji(ci.label) || ci.label),
            tokens: norm(ci.label).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
            sub: 'Issue family · ' + (kidN
              ? (kidN + ' key' + (kidN === 1 ? '' : 's') + ' filed under it · opens the issue desk')
              : 'no keys filed under it yet'),
            desc: ci.blurb || '', icon: leadEmoji(ci.label) || '🎯',
            hay: parts.filter(Boolean).join(' ').toLowerCase()
          });
        });
      } catch (e) {}

      // ── THE ISSUE FILES, REACHABLE AS THEMSELVES ────────────────────────
      // `lands_preserve` is a published key with a label, a chip and mapped
      // measures, and it had no row in this index at all: the eye only ever
      // scanned the thirteen bundles, so a query that named a key got whichever
      // bundle's curated keywords happened to contain the word. Every published
      // ISSUE_MAP key is a row here, filed under `file`, and the row's address is
      // the key's own /i/<key>.
      //
      // A CORE KEY IS NOT LISTED TWICE. Some keys are both — `guns` is a shipped
      // key and one of the thirteen — and /i/<coreKey> opens the same desk either
      // way, so the bundle keeps the family row and the file list skips it.
      //
      // THE KEY IS SPELT OUT ("lands preserve") beside its label, so a reader who
      // types the slug and a reader who types the words both land on it. The key
      // itself is never re-spelt, aliased or stemmed: PUBLISHED is the register's
      // own test (a key with no label is scaffolding), asked of PDXIssueFamily.
      try {
        var IM = window.ISSUE_MAP || {};
        var FAM = window.PDXIssueFamily;
        var coreKeySet = {};
        (window.CORE_NATIONAL_ISSUES || []).forEach(function (c) { if (c && c.key) coreKeySet[c.key] = 1; });
        Object.keys(IM).forEach(function (k) {
          var rec = IM[k];
          if (!rec || !rec.label) return;   // unpublished scaffolding has no face to print
          if (coreKeySet[k]) return;        // a bundle is a family row, not a file row
          var lbl = stripEmoji(rec.label) || rec.label;
          var coreKey = '', coreLbl = '';
          try { if (FAM && typeof FAM.coreOf === 'function') coreKey = FAM.coreOf(k) || ''; } catch (fe) {}
          try { if (coreKey && FAM && typeof FAM.label === 'function') coreLbl = stripEmoji(FAM.label(coreKey)) || ''; } catch (fe) {}
          var spelled = k.replace(/_/g, ' ');
          var fparts = [k, spelled, rec.label, rec.chip, coreLbl].concat(rec.keywords || []);
          files.push({
            kind: 'issuefile', issueKey: k, coreKey: coreKey, coreLabel: coreLbl,
            keys: [k],
            title: lbl,
            titleLc: norm(lbl + ' ' + spelled),
            tokens: norm(lbl + ' ' + spelled).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
            sub: coreLbl ? ('Issue file · in ' + coreLbl) : 'Issue file · the formal record',
            desc: '', icon: leadEmoji(rec.label) || '🏛',
            hay: fparts.filter(Boolean).join(' ').toLowerCase()
          });
        });
      } catch (e) {}

      // Individual promises / positions & Evidence Locker receipts. Each stance
      // card (a topic + sourced position, sometimes a campaign pledge) is its own
      // searchable record, tagged to a politician and an issue key. This is what
      // lets the eye surface specifics — "closed-loop cooling", "truth in taxation"
      // — not just names. Resolved from the same live data the Evidence Locker reads.
      var stances = [];
      try {
        var SD = window.ISSUE_STANCE_DATA || {};
        Object.keys(SD).forEach(function (rawPid) {
          var list = SD[rawPid];
          if (!Array.isArray(list)) return;
          // A receipt is tagged to a PERSON, so it is tagged to the id that
          // person's file opens at. 18 of the 29 retired ids carry a curated
          // stance block — that is the documented convention, the block is filed
          // under the roster record's display-name slug — and every receipt row
          // minted from one used to read the slug back out as its name
          // ("scott chew"), file itself under the retired id for My Team and
          // Share, and send "Jump to politician" at an address that redirects.
          // The block is not moved; only the id the ROW carries is canonicalised.
          var pid = rawPid;
          try {
            if (typeof window.PDXProfilePid === 'function') pid = window.PDXProfilePid(rawPid) || rawPid;
          } catch (e) { pid = rawPid; }
          var d = polRec(pid);
          var pname = (d && d.name) || pid.replace(/_/g, ' ');
          var psub = d ? [d.office, d.state].map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean).join(' · ') : '';
          list.forEach(function (st) {
            if (!st || !st.topic) return;
            var srcLabel = (st.source && st.source.label) || '';
            var parts = [st.topic, st.text, st.evidence, pname, psub, st.issueKey, srcLabel];
            stances.push({
              kind: 'stance', id: pid, title: st.topic,
              titleLc: norm(st.topic),
              tokens: norm(st.topic + ' ' + pname).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
              polName: pname, polSub: psub, icon: st.icon || '🧾',
              pos: st.pos || st.issueStance || '', issueKey: st.issueKey || '',
              pledge: !!st.pledge, strength: st.strength || '', sourceLabel: srcLabel,
              snippet: st.text || st.evidence || '',
              hay: parts.filter(Boolean).join(' ').toLowerCase()
            });
          });
        });
      } catch (e) {}

      // Bills & Legislation — the Voting Record measures, made first-class in the eye
      // so it is the ONE place that reaches politicians, positions, issues, Spotlights
      // AND legislation. Sourced from the live /measures list once fetched (full,
      // authoritative) merged with the inline light index (instant + curated search
      // keywords). Live entries win on the natural key; the inline `keywords` are
      // always folded in so a curated bill (e.g. the Farm Bill) stays reachable by the
      // plain-language terms people type — "pesticide liability", "farm bill", "7567".
      var bills = [];
      try {
        var issLabel = (typeof window._issueLabel === 'function') ? window._issueLabel : function () { return ''; };
        // keyword lookup from the inline index, keyed by congress|number
        var inlineKw = {};
        if (Array.isArray(window.PDX_BILLS_INDEX)) {
          window.PDX_BILLS_INDEX.forEach(function (b) {
            if (b && b.number) inlineKw[String(b.congress || '') + '|' + b.number] = b.keywords || '';
          });
        }
        var billSeen = {}, billPools = [];
        if (Array.isArray(window.__pdxEyeBillsLive)) billPools.push(window.__pdxEyeBillsLive); // full live list wins
        if (Array.isArray(window.PDX_BILLS_INDEX)) billPools.push(window.PDX_BILLS_INDEX);
        billPools.forEach(function (pool) {
          pool.forEach(function (b) {
            if (!b || !b.number) return;
            var natKey = String(b.congress || '') + '|' + b.number;
            if (billSeen[natKey]) return;
            billSeen[natKey] = 1;
            var numRaw = String(b.number);
            var numCompact = numRaw.replace(/[^a-z0-9]/gi, '');          // "hr7567"
            var numDigits = (numRaw.match(/\d+/g) || []).join(' ');       // "7567"
            // The flagged issue joins the set when the index omits it — that is a
            // MEMBERSHIP fix, and it used to `unshift`, which also made it the topic
            // a searcher read first. Membership is kept; the queue-jump is not. The
            // list is then put in the shared Big Picture order so a search result
            // names a bill's topics in the same sequence as the bill's own page.
            var ikeys = (b.issueKeys || []).slice();
            if (b.primaryIssue && ikeys.indexOf(b.primaryIssue) === -1) ikeys.push(b.primaryIssue);
            if (typeof window._pdxBigPictureKeys === 'function') {
              try { ikeys = window._pdxBigPictureKeys(ikeys, { labelFn: issLabel }); } catch (e) {}
            }
            var issueLabels = ikeys.map(function (k) { try { return issLabel(k) || ''; } catch (e) { return ''; } });
            // A result row is one line, so a bundle of twelve topics genuinely does
            // not fit. What it must not do is print three of them and stop, which
            // reads as "this bill is about these three". It now names what it can
            // and states the total it could not, so the number a reader carries to
            // the bill page is the real one.
            // The labels are filtered, so the KEYS are filtered in the same pass. Build
            // them apart and a chip ends up wearing the colour of the topic beside it
            // the moment one key in the middle of the bundle has no label.
            var namedLbls = [], namedKeys = [];
            for (var li = 0; li < issueLabels.length; li++) {
              if (!issueLabels[li]) continue;
              namedLbls.push(issueLabels[li]);
              namedKeys.push(ikeys[li] || '');
            }
            var descTxt = namedLbls.slice(0, 3).join(' · ');
            if (namedLbls.length > 3) descTxt += ' · +' + (namedLbls.length - 3) + ' more of ' + namedLbls.length + ' topics';
            var kw = b.keywords || inlineKw[natKey] || '';
            var disp = b.shortTitle || b.title || numRaw;
            var chamberW = b.chamber === 'senate' ? 'senate' : b.chamber === 'house' ? 'house' : (b.chamber || '');
            var typeW = (b.measureType === 'resolution' ? 'resolution' : b.measureType === 'nomination' ? 'nomination' :
              b.measureType === 'litigation' ? 'litigation lawsuit court case' : b.measureType === 'amendment' ? 'amendment' : 'bill') + ' legislation measure';
            var parts = [numRaw, numCompact, numDigits, b.title, b.shortTitle, kw, typeW, chamberW,
              ('congress ' + (b.congress || '')), b.status].concat(ikeys).concat(issueLabels);
            var chamberLbl = chamberW === 'senate' ? 'Senate' : chamberW === 'house' ? 'House' : '';
            bills.push({
              kind: 'bill', number: numRaw, id: (b.id != null ? b.id : null),
              title: disp,
              titleLc: norm(numRaw + ' ' + disp),
              tokens: norm(numRaw + ' ' + numCompact + ' ' + disp + ' ' + kw).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
              sub: numRaw + (chamberLbl ? ' · ' + chamberLbl : '') + (b.isOmnibus ? ' · omnibus' : ''),
              desc: descTxt,
              // The same labels descTxt is joined from, kept apart. The row prints
              // them as separate chips now and needs the seams; `desc` stays for
              // shape parity with the issue entries above, which do still read it.
              topics: namedLbls.slice(),
              // Paired with `topics` index for index: the label a chip prints and the
              // vocabulary key it takes its colour from.
              topicKeys: namedKeys.slice(),
              icon: '🏛️', issueKey: b.primaryIssue || (ikeys[0] || ''), issueKeys: ikeys,
              status: b.status || '',
              hay: parts.filter(Boolean).join(' ').toLowerCase()
            });
          });
        });
      } catch (e) {}

      // ── THE MANDATE LANE'S OWN LIST ───────────────────────────────────
      // READ FROM THE ONE REGISTRY. window._pdxMandateItems is the mandate
      // bridge's own array (index.html) \u2014 the same list the Evidence Locker's
      // per-reform filter and every mandate chip already read. No second copy is
      // kept here and no key is minted here: a reform's issueKey is whatever the
      // bridge filed it under, and a reform the bridge left unbridged simply has
      // none. Guarded, because the bridge is inline script and this module can be
      // booted (and tested) without it.
      //
      // The row carries the reform, the tracked issues it is filed against, and
      // its agenda id \u2014 which is the address of the mandate surface that already
      // exists. It carries no pid, no tally and no score, so nothing downstream
      // can mistake it for a person or a measure.
      var mandates = [];
      try {
        var MI = window._pdxMandateItems;
        var mLabel = (typeof window._issueLabel === 'function') ? window._issueLabel : function () { return ''; };
        if (Array.isArray(MI)) {
          MI.forEach(function (m) {
            if (!m || !m.agendaId) return;
            var mname = String(m.name || m.title || m.agendaId);
            var mkeys = (Array.isArray(m.issueKeys) && m.issueKeys.length)
              ? m.issueKeys.slice() : (m.issueKey ? [m.issueKey] : []);
            // The tracked issues, as labels. A label that is simply the reform's
            // own name again is dropped rather than printed twice: several
            // reforms are filed against the key they are named after, and a chip
            // that repeats the row's title tells the reader nothing.
            var mlbls = [], mchipKeys = [], mtitleLc = norm(stripEmoji(mname) || mname);
            mkeys.forEach(function (k) {
              var lb = '';
              try { lb = stripEmoji(mLabel(k) || '') || ''; } catch (e) { lb = ''; }
              if (!lb) return;
              if (norm(lb) === mtitleLc) return;
              mlbls.push(lb); mchipKeys.push(k);
            });
            // The haystack names the reform, its tracked issues and the words the
            // document is called by, so "mandate", "reform" or "term limits" all
            // reach it. It is searched in the mandate lane and nowhere else.
            var mAllLbls = mkeys.map(function (k) {
              try { return stripEmoji(mLabel(k) || '') || ''; } catch (e) { return ''; }
            });
            var mparts = [mname, m.title, String(m.agendaId).replace(/[-_]+/g, ' ')]
              .concat(mkeys).concat(mAllLbls);
            mparts.push('mandate peoples mandate proposed vehicle reform agenda');
            mandates.push({
              kind: 'mandate', agendaId: String(m.agendaId),
              issueKey: mkeys[0] || '', issueKeys: mkeys,
              // Paired index for index, exactly as a bill row's are: the label a
              // chip prints and the vocabulary key it takes its colour from.
              topics: mlbls, topicKeys: mchipKeys,
              title: stripEmoji(mname) || mname,
              titleLc: norm(mname),
              tokens: norm(mname + ' ' + (m.title || '')).split(/[^\p{L}\p{N}]+/u).filter(Boolean),
              sub: 'People\u2019s Mandate \u00b7 proposed vehicle',
              icon: m.icon || '📜',
              hay: mparts.filter(Boolean).join(' ').toLowerCase()
            });
          });
        }
      } catch (e) {}

      index = { people: people, issues: issues, families: families, files: files, stances: stances, bills: bills, mandates: mandates };
      relCache = {};
      return index;
    }
    function getIndex() {
      ensureEyeBills(); // kick off the one-time live Legislation fetch (guarded)
      // Rebuild when the roster size changes (e.g. Firestore profiles arrive).
      var key = polIdGroups().total + ':' +
        ((window.PDXSpotlight && window.PDXSpotlight.list) ? window.PDXSpotlight.list().length : 0) + ':' +
        ((window.CORE_NATIONAL_ISSUES || []).length) + ':' +
        // The register itself is a lane now (the issue files), so its arrival has
        // to invalidate the index the same way the roster's does.
        (window.ISSUE_MAP ? Object.keys(window.ISSUE_MAP).length : 0) + ':' +
        (window.ISSUE_STANCE_DATA ? Object.keys(window.ISSUE_STANCE_DATA).length : 0) + ':' +
        (Array.isArray(window.__pdxEyeBillsLive) ? ('L' + window.__pdxEyeBillsLive.length)
          : ('I' + ((window.PDX_BILLS_INDEX || []).length))) + ':' +
        // The mandate bridge is inline script and may register after this module
        // boots, so its arrival invalidates the index exactly as the roster's and
        // the register's do. Zero is a legitimate value here: the lane ships
        // whether or not the bridge is on the page.
        (Array.isArray(window._pdxMandateItems) ? window._pdxMandateItems.length : 0);
      if (!index || key !== indexKey) { indexKey = key; buildIndex(); }
      return index;
    }
    // Load the full, authoritative Legislation list once (and the inline light index,
    // for its curated search keywords), then rebuild so EVERY bill — not just the
    // marquee inline set — is discoverable in the eye. Guarded so it runs at most once
    // and only after PDXBills is present; failures leave the inline set in place.
    var billsFetchStarted = false, billsLazyAsked = false;
    // HOW MANY TIMES THE MEASURES LIST MAY BE ASKED FOR. PDXBills.list() swallows a
    // failed request and hands back the INLINE marquee index instead (`_inline`),
    // which the eye used to store as `__pdxEyeBillsLive` and then report on as
    // though the record had answered — a permanent, silent denial of every measure
    // that lives only in the database. A papered-over failure is not a response, so
    // it does not settle the lane on the first attempt: the warming recheck asks
    // once more. Bounded, because a second refusal is an answer too.
    var MEASURES_TRIES = 2;
    var measuresTries = 0;
    // The bills lane clears here, and it clears on EVERY terminal path — the list
    // arrived, the list came back empty, the request failed. A lane that only
    // clears on success is a lane that says "Searching the record…" forever the
    // first time the network says no.
    function billsDone() {
      if (billsSettled) return;
      billsSettled = true;
      refreshOpenPanel();
    }
    function refreshOpenPanel() {
      try {
        if (window.PDXEye) window.PDXEye.rebuild();
        if (eye.classList.contains('is-open')) render(input.value);
      } catch (e) {}
    }
    function ensureEyeBills() {
      // THE EYE ASKS FOR THE FILE IT SEARCHES. bills-index.js is injected on
      // demand by pdx-lazy-data.js the first time the Digital Library's Legislation
      // tab opens — which means the eye's bill lane used to sit empty until some
      // other part of the page happened to want it. Waiting for a tab nobody opened
      // is not loading; it is not asking. The eye asks now, and rebuilds when the
      // file lands, so the curated search keywords are in the haystack whether or
      // not the reader has been to the library.
      if (!billsLazyAsked) {
        billsLazyAsked = true;
        try {
          if (window.PDXLazyData && typeof window.PDXLazyData.whenReady === 'function') {
            window.PDXLazyData.whenReady('bills', refreshOpenPanel);
          }
        } catch (e) {}
      }
      if (billsFetchStarted) return;
      if (!(window.PDXBills && typeof window.PDXBills.list === 'function')) return;
      billsFetchStarted = true;
      measuresTries++;
      // THE STALL WINDOW OPENS HERE, not at boot: it measures the request, and a
      // request that has not been issued cannot have gone quiet. Every page that
      // lands re-stamps it, so the walk may take as long as it takes.
      measuresAt = Date.now();
      try { if (typeof window.PDXBills.ensureIndex === 'function') window.PDXBills.ensureIndex().then(refreshOpenPanel).catch(function () {}); } catch (e) {}
      try {
        // Page through the full list (the API caps pageSize at 100) so EVERY measure
        // is indexed, not just the first page — then rebuild once at the end.
        var acc = [], fellBack = false;
        var pull = function (page) {
          return window.PDXBills.list({ pageSize: 100, page: page, sort: 'number' }).then(function (d) {
            if (!d || !Array.isArray(d.items)) return;
            // The client's own fallback, not the record's answer. Flagged rather
            // than accumulated: storing the marquee subset as the live measures
            // list is how a failed request came to look like a fetched one.
            if (d._inline) { fellBack = true; return; }
            measuresAt = Date.now();   // progress: the walk is alive
            acc = acc.concat(d.items);
            var total = (typeof d.total === 'number') ? d.total : acc.length;
            if (acc.length < total && d.items.length > 0 && page < 25) return pull(page + 1);
          });
        };
        // EVERY TERMINAL PATH SETTLES THE LANE — the rows arrived, the list came
        // back empty, the request failed, the handler threw. The ONE path that does
        // not is the deliberate re-arm below, and it leaves the lane warm on
        // purpose: the request is going out again.
        var settleOrRetry = function () {
          if (acc.length) window.__pdxEyeBillsLive = acc;
          // Nothing but a fallback came back, and there is another ask left. Re-arm
          // instead of settling: the lane stays warm, the measures group keeps its
          // loading line, and the warming recheck issues the next attempt.
          if (fellBack && !acc.length && measuresTries < MEASURES_TRIES) {
            billsFetchStarted = false;
            measuresAt = 0;
            refreshOpenPanel();
            return;
          }
          billsDone();
        };
        pull(1).then(settleOrRetry, billsDone).catch(billsDone);
      } catch (e) { billsDone(); }
    }

    // ── fuzzy scoring ─────────────────────────────────────────────────
    // Subsequence quality: 1 when q's letters appear contiguously in hay, less
    // as they spread out; -1 when q is not a subsequence at all. Gives typo /
    // partial tolerance ("massie" → "Thomas Massie", "healthcre" → Healthcare).
    function subseq(hay, q) {
      if (!q) return -1;
      var hi = 0, qi = 0, first = -1, last = -1;
      while (hi < hay.length && qi < q.length) {
        if (hay.charCodeAt(hi) === q.charCodeAt(qi)) { if (first < 0) first = hi; last = hi; qi++; }
        hi++;
      }
      if (qi < q.length) return -1;
      var span = last - first + 1;
      return q.length / span; // 1 = contiguous run
    }
    function tokenPrefix(tokens, t) {
      for (var i = 0; i < tokens.length; i++) { if (tokens[i].indexOf(t) === 0) return true; }
      return false;
    }
    function score(entry, q, terms) {
      var name = entry.titleLc, hay = entry.hay, s = 0;

      // whole-query hits (strongest signal)
      var idxName = name.indexOf(q);
      if (idxName === 0) s += 120;
      else if (idxName > 0) s += 70;
      else if (hay.indexOf(q) !== -1) s += 26;

      // per-term hits
      var allInHay = true, nameHit = false;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i], inName = name.indexOf(t);
        if (inName === 0) { s += 44; nameHit = true; }
        else if (tokenPrefix(entry.tokens, t)) { s += 38; nameHit = true; }
        else if (inName > 0) { s += 22; nameHit = true; }
        if (hay.indexOf(t) !== -1) s += 9; else allInHay = false;
      }

      // fuzzy subsequence fallback on the name (typo tolerance)
      var fq = subseq(name, q);
      if (fq > 0) { s += Math.round(18 * fq); if (fq >= 0.999) s += 6; }

      // gate: keep only genuinely relevant entries
      if (!allInHay && !nameHit && fq < 0.34) return 0;
      // very short queries: require a name-side hit so we don't dump the DB
      if (q.length <= 2 && !nameHit && idxName !== 0) return 0;
      return s;
    }
    function rank(list, q, terms, limit, ctx) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var sc = score(list[i], q, terms);
        if (sc > 0) {
          // Personal nudge: only ever added on top of a genuine match, so the
          // gate above still decides *what* shows — this just reorders within it.
          if (ctx) sc += personalBoost(personalOf(list[i], ctx));
          out.push({ e: list[i], s: sc });
        }
      }
      out.sort(function (a, b) { return b.s - a.s || a.e.title.localeCompare(b.e.title); });
      return out.slice(0, limit).map(function (r) { return r.e; });
    }

    // ── connection discovery ──────────────────────────────────────────
    // Small, calm cross-links that let the eye "see" relationships in the data.
    // Everything is derived from existing structures (spotlight rosters + the
    // stance records) and memoized per id, and it only runs for the handful of
    // rows actually shown — so it never touches search-matching performance.
    function stripThe(s) { return String(s || '').replace(/^the\s+/i, ''); }
    // Friendly issue label for an issueKey, via ISSUE_MAP then the national buckets.
    function issueShort(issueKey) {
      if (!issueKey) return '';
      var im = window.ISSUE_MAP || {};
      if (im[issueKey] && im[issueKey].label) return stripEmoji(im[issueKey].label);
      var core = window.CORE_NATIONAL_ISSUES || [];
      for (var i = 0; i < core.length; i++) {
        if ((core[i].keys || []).indexOf(issueKey) !== -1) return stripEmoji(core[i].label);
      }
      return issueKey.replace(/_/g, ' ');
    }
    // The national-issue bucket key an issueKey rolls up into (for a clickable hint).
    function coreKeyForIssue(issueKey) {
      var core = window.CORE_NATIONAL_ISSUES || [];
      for (var i = 0; i < core.length; i++) {
        if ((core[i].keys || []).indexOf(issueKey) !== -1) return core[i].key;
      }
      return '';
    }
    // Which stance topics a Spotlight grades "strong" for each politician. Strength
    // is recorded on the Spotlight receipts (a recorded vote/ruling = Strong), not on
    // the base stance, so we read it from there — this is what earns a "Strong on …"
    // hint rather than a plainer "On record". Built once per index, memoized.
    function strongTopicMap() {
      if (relCache.__strong) return relCache.__strong;
      var m = {};
      try {
        var reg = (window.PDXSpotlight && window.PDXSpotlight.registry) || {};
        Object.keys(reg).forEach(function (slug) {
          var sp = reg[slug];
          (sp.groups || []).forEach(function (g) {
            (g.people || []).forEach(function (p) { if (p && p.id && p.topic && p.strength === 'strong') { (m[p.id] = m[p.id] || {})[p.topic] = 1; } });
          });
          (sp.evidence || []).forEach(function (ev) {
            (ev.items || []).forEach(function (it) { if (it && it.id && it.topic && it.strength === 'strong') { (m[it.id] = m[it.id] || {})[it.topic] = 1; } });
          });
        });
      } catch (e) {}
      relCache.__strong = m;
      return m;
    }
    // 1–2 hints for a politician: Spotlights they're central to, then one strongly
    // documented issue ("Strong on Climate Action" / "Central to Stratos …").
    function relatedForPol(id) {
      var ck = 'pol:' + id;
      if (relCache[ck]) return relCache[ck];
      var out = [];
      try {
        if (window.PDXSpotlight && window.PDXSpotlight.forPolitician) {
          window.PDXSpotlight.forPolitician(id).forEach(function (sp) {
            if (out.length < 2 && sp && sp.slug) out.push({ kind: 'spotlight', slug: sp.slug, ico: '🔦', label: 'Central to ' + stripThe(sp.title) });
          });
        }
      } catch (e) {}
      if (out.length < 2) {
        try {
          var list = (window.ISSUE_STANCE_DATA || {})[id] || [];
          var strongTopics = strongTopicMap()[id] || {};
          var pick = null, isStrong = false, i;
          // prefer a base stance the Spotlights grade "strong"
          for (i = 0; i < list.length; i++) { if (list[i] && list[i].issueKey && strongTopics[list[i].topic]) { pick = list[i]; isStrong = true; break; } }
          if (!pick) { for (i = 0; i < list.length; i++) { var p = list[i]; if (p && p.issueKey && (p.pos === 'support' || p.pos === 'oppose')) { pick = p; break; } } }
          if (pick) {
            var lbl = issueShort(pick.issueKey);
            if (lbl) out.push({ kind: 'issue', key: coreKeyForIssue(pick.issueKey), ico: '📍', label: (isStrong ? 'Strong on ' : 'On record: ') + lbl });
          }
        } catch (e) {}
      }
      relCache[ck] = out.slice(0, 2);
      return relCache[ck];
    }
    // 1–2 key politicians with strong documented positions on an issue / spotlight.
    function relatedForIssue(entry) {
      var ck = entry.kind === 'spotlight' ? 'sp:' + entry.slug : 'iss:' + (entry.issueKey || '');
      if (relCache[ck]) return relCache[ck];
      var out = [], seen = {};
      try {
        if (entry.kind === 'spotlight' && window.PDXSpotlight) {
          var sp = (window.PDXSpotlight.registry || {})[entry.slug];
          if (sp && Array.isArray(sp.groups)) {
            var people = [];
            sp.groups.forEach(function (g) { (g.people || []).forEach(function (pp) { people.push(pp); }); });
            people.sort(function (a, b) { return (b.strength === 'strong' ? 1 : 0) - (a.strength === 'strong' ? 1 : 0); });
            people.forEach(function (pp) { if (out.length < 2 && pp.id && !seen[pp.id]) { seen[pp.id] = 1; out.push({ kind: 'pol', id: pp.id, ico: '👤', label: pp.name }); } });
          }
        } else {
          var keys = entry.keys || [], SD = window.ISSUE_STANCE_DATA || {}, strong = [], other = [];
          Object.keys(SD).forEach(function (pid) {
            (SD[pid] || []).forEach(function (st) {
              if (!st || !st.issueKey || keys.indexOf(st.issueKey) === -1) return;
              if (st.strength === 'strong') strong.push(pid);
              else if (st.pos === 'support' || st.pos === 'oppose') other.push(pid);
            });
          });
          strong.concat(other).forEach(function (pid) {
            if (out.length < 2 && !seen[pid]) { var d = polRec(pid); if (d && d.name) { seen[pid] = 1; out.push({ kind: 'pol', id: pid, ico: '👤', label: d.name }); } }
          });
        }
      } catch (e) {}
      relCache[ck] = out.slice(0, 2);
      return relCache[ck];
    }
    // Render the little "related" chip row beneath a result (or '' when there's none).
    function relBlock(entry) {
      var hints = entry.kind === 'pol' ? relatedForPol(entry.id)
        : (entry.kind === 'spotlight' || entry.kind === 'issue' ||
           entry.kind === 'family' || entry.kind === 'issuefile') ? relatedForIssue(entry)
        : [];
      if (!hints || !hints.length) return '';
      // FORMAL MEANS FORMAL, DOWN TO THE CROSS-LINKS. A Spotlight is a good
      // neighbour for a person — in the other lane. "Spotlights do not appear in
      // this mode" is not a statement about rows only; a chip that says "Central
      // to <investigation>" is a Spotlight appearing. Filtered here rather than in
      // relatedForPol, because the cache it fills is shared with public mode.
      if (laneMode === 'formal') {
        hints = hints.filter(function (h) { return h.kind !== 'spotlight'; });
        if (!hints.length) return '';
      }
      var chips = hints.map(function (h) {
        var attr = h.kind === 'pol' ? 'data-kind="pol" data-id="' + esc(h.id) + '"'
          : h.kind === 'spotlight' ? 'data-kind="spotlight" data-slug="' + esc(h.slug) + '"'
          : 'data-kind="issue" data-key="' + esc(h.key || '') + '"' + issueTint(h.key || '');
        return '<button type="button" class="pdx-eye-rel-chip" ' + attr + '><span class="pdx-eye-rel-ico" aria-hidden="true">' + esc(h.ico || '↳') + '</span>' + esc(h.label) + '</button>';
      }).join('');
      return '<div class="pdx-eye-rel"><span class="pdx-eye-rel-lead" aria-hidden="true">↳</span>' + chips + '</div>';
    }
    // A tiny stance pill (Supports / Opposes / Mixed) for a receipt row.
    function posPill(pos) {
      var p = String(pos || '').toLowerCase(), c, lbl;
      if (p.indexOf('support') !== -1) { c = '#34d399'; lbl = 'Supports'; }
      else if (p.indexOf('oppose') !== -1) { c = '#f87171'; lbl = 'Opposes'; }
      else if (p.indexOf('mix') !== -1) { c = '#fbbf24'; lbl = 'Mixed'; }
      else return '';
      return '<span class="pdx-eye-pos" style="color:' + c + ';background:' + c + '22;border:1px solid ' + c + '55;">' + lbl + '</span>';
    }

    // ── the action layer (Phase 3) ────────────────────────────────────
    // The eye now lets you *act* on a result, not just open it. Each entry maps
    // to a small, calm set of command-palette actions revealed on focus/hover.
    // "Save" routes into the shared window.PDXSaved collection; the rest reuse
    // the app's existing navigation (team, compare, profile, Evidence Locker,
    // Spotlights) — no new surfaces, just a faster way to reach them.
    function toast(msg) { if (typeof window._showToast === 'function') window._showToast(msg); }

    // The {type,key} identity a saveable entry stores in window.PDXSaved.
    function savedKeyFor(e) {
      if (e.kind === 'stance') return { type: 'receipt', key: e.id + '|' + (e.issueKey || '') + '|' + e.title };
      if (e.kind === 'spotlight') return { type: 'spotlight', key: e.slug };
      if (e.kind === 'issue') return { type: 'issue', key: e.issueKey || e.title };
      return null;
    }
    function isSavedEntry(e) {
      var sk = savedKeyFor(e);
      return !!(sk && window.PDXSaved && window.PDXSaved.has(sk.type, sk.key));
    }
    // A self-contained snapshot so a saved item stays openable even if the live
    // index later changes — it carries its own title/sub/icon and the nav hooks.
    function savedSnapshot(e) {
      var sk = savedKeyFor(e);
      if (!sk) return null;
      var snap = { type: sk.type, key: sk.key, title: e.title, icon: e.icon || '🔖', sub: '', nav: {} };
      if (e.kind === 'stance') {
        snap.icon = e.icon || '🧾';
        snap.sub = posPillText(e.pos) + (e.polName || '') + (e.sourceLabel ? ' · ' + e.sourceLabel : '');
        snap.nav = { polId: e.id, issueKey: e.issueKey || '' };
        // Rich fields so the My Evidence workspace can render a canonical stance
        // pill, the politician + context, and a snippet without re-deriving from
        // the live index (which may have changed since this was saved).
        snap.stance = e.pos || '';
        snap.polId = e.id;
        snap.polName = e.polName || '';
        snap.polSub = e.polSub || '';
        snap.topic = e.title || '';
        snap.sourceLabel = e.sourceLabel || '';
        snap.snippet = e.snippet || '';
        snap.issueKey = e.issueKey || '';
        snap.pledge = !!e.pledge;
      } else if (e.kind === 'spotlight') {
        snap.icon = '🔦'; snap.sub = e.sub || 'Issue Spotlight';
        snap.nav = { slug: e.slug, issueKey: e.issueKey || '' };
        snap.slug = e.slug;
      } else if (e.kind === 'issue') {
        snap.icon = e.icon || '🎯'; snap.sub = 'National issue';
        snap.nav = { issueKey: e.issueKey || '' };
        snap.issueKey = e.issueKey || '';
      }
      return snap;
    }
    function posPillText(pos) {
      var p = String(pos || '').toLowerCase();
      if (p.indexOf('support') !== -1) return 'Supports · ';
      if (p.indexOf('oppose') !== -1) return 'Opposes · ';
      if (p.indexOf('mix') !== -1) return 'Mixed · ';
      return '';
    }

    // ── personal awareness (saved items + My Team) ────────────────────
    // The eye now knows *whose* eye it is. It reads two client-side stores the
    // rest of the app already keeps — the shared window.PDXSaved collection and
    // the My Team roster (localStorage 'politidex_my_politicians' + the ballot
    // map 'politidex_my_team') — and turns them into a small "personal context".
    // That context does two calm things: it *boosts* already-relevant results
    // that matter to this visitor (their saved receipts, their team's positions)
    // so they surface first, and it *badges* those rows so the relevance is
    // legible. Both stores are tiny, so the context is rebuilt per render and is
    // always truthful the instant something is saved or a teammate is added.
    function teamIdSet() {
      var set = {};
      try { var a = JSON.parse(localStorage.getItem('politidex_my_politicians') || '[]'); if (Array.isArray(a)) a.forEach(function (id) { if (id) set[id] = 1; }); } catch (e) {}
      try { var sel = JSON.parse(localStorage.getItem('politidex_my_team') || '{}') || {}; for (var k in sel) { if (sel[k]) set[sel[k]] = 1; } } catch (e) {}
      return set;
    }
    function personalContext() {
      var ctx = { team: teamIdSet(), savedIds: {}, savedIssueKeys: {}, savedPolIds: {} };
      var items = (window.PDXSaved && window.PDXSaved.list) ? window.PDXSaved.list() : [];
      items.forEach(function (s) {
        ctx.savedIds[String(s.type) + '::' + String(s.key)] = 1;
        var ik = s.issueKey || (s.nav && s.nav.issueKey) || '';
        if (ik) ctx.savedIssueKeys[ik] = 1;   // a theme this visitor has been collecting
        var pid = s.polId || (s.nav && s.nav.polId) || '';
        if (pid) ctx.savedPolIds[pid] = 1;    // a person this visitor keeps saving from
      });
      ctx.hasTeam = Object.keys(ctx.team).length > 0;
      ctx.hasSaved = items.length > 0;
      return ctx;
    }
    // The politician an entry is "about" (people + receipts are tied to a person).
    function entryPolId(e) { return (e && (e.kind === 'pol' || e.kind === 'stance')) ? (e.id || '') : ''; }
    // The three personal signals a result can carry, against a context.
    function personalOf(e, ctx) {
      var sig = { saved: false, team: false, theme: false };
      if (!ctx || !e) return sig;
      var sk = savedKeyFor(e);
      if (sk && ctx.savedIds[sk.type + '::' + sk.key]) sig.saved = true;        // literally in their collection
      var pid = entryPolId(e);
      if (pid && ctx.team[pid]) sig.team = true;                                 // one of their people
      var ik = e.issueKey || '';
      if ((ik && ctx.savedIssueKeys[ik]) || (pid && ctx.savedPolIds[pid])) sig.theme = true; // adjacent to a save
      return sig;
    }
    // A calm nudge added on top of a result's base relevance — never enough to
    // outrank a strong name/topic match, just enough to float personal items to
    // the front of the pack they already belong to. Only applied to entries that
    // already scored above the relevance gate, so we never surface unrelated
    // saved/team content into an unrelated query.
    function personalBoost(sig) {
      var b = 0;
      if (sig.saved) b += 60;
      if (sig.team)  b += 40;
      if (sig.theme) b += 20;
      return b;
    }
    // One small pill for the strongest personal signal a row carries (saved wins
    // over team so the collection reads first). Empty when nothing is personal —
    // so a normal search looks exactly as it did before this layer existed.
    function personalBadge(e) {
      if (badgeOff) return '';
      var sig = personalOf(e, curCtx);
      if (sig.saved) return '<span class="pdx-eye-tag pdx-eye-tag--saved" title="In your saved collection">Saved</span>';
      if (sig.team)  return '<span class="pdx-eye-tag pdx-eye-tag--team" title="From a politician on My Team">★ My Team</span>';
      return '';
    }

    // The share action, named for what it will actually send. The tier is resolved
    // synchronously from what is already loaded (PDXShareAnywhere.state), so a row
    // whose person has a guard-cleared Official Record card says "Share the card"
    // and a row whose person has nothing on file says "Share profile link" — the
    // label is a promise the tap keeps. Search had no share action at all before
    // this, which is why a reader who found someone here had to open the profile,
    // find the header button and open a sheet before they could pass anything on.
    function shareAct(pid, issueKey) {
      var t = 'link';
      try {
        var SA = window.PDXShareAnywhere;
        if (SA && typeof SA.state === 'function') {
          var st = SA.state(pid, { issueKey: issueKey || '' });
          if (st) t = st.tier;
        }
      } catch (e) {}
      if (t === 'summary') return { id: 'share', ico: '⚖️', label: 'Share their record card' };
      if (t === 'record') return { id: 'share', ico: '🏛️', label: 'Share the record card' };
      if (t === 'receipt') return { id: 'share', ico: '🧾', label: 'Share the receipt' };
      return { id: 'share', ico: '🔗', label: 'Share profile link' };
    }

    // The ordered action list for an entry. `primary` gets the gold treatment;
    // `saved`/`on` reflect current state so the label flips to a confirmation.
    function actionsFor(e) {
      var acts = [];
      if (e.kind === 'pol') {
        var on = (typeof window._pdxIsOnTeam === 'function') && window._pdxIsOnTeam(e.id);
        acts.push({ id: 'team', ico: on ? '★' : '＋', label: on ? 'On My Team' : 'Add to My Team', primary: !on, on: on });
        acts.push({ id: 'compare', ico: '⚖', label: 'Compare' });
        acts.push({ id: 'profile', ico: '👤', label: 'View full profile' });
        acts.push(shareAct(e.id, ''));
      } else if (e.kind === 'stance') {
        var rs = isSavedEntry(e);
        acts.push({ id: 'save', ico: rs ? '✓' : '🔖', label: rs ? 'Saved to My Evidence' : 'Save this receipt', primary: !rs, saved: rs });
        acts.push({ id: 'evidence', ico: '🗄', label: 'View in Evidence Locker' });
        acts.push({ id: 'jump', ico: '👤', label: 'Jump to politician' });
        // Scoped to the issue this row is about, so it shares THIS receipt rather
        // than the person's strongest one on some other issue.
        acts.push(shareAct(e.id, e.issueKey || ''));
      } else if (e.kind === 'spotlight') {
        var ss = isSavedEntry(e);
        acts.push({ id: 'save', ico: ss ? '✓' : '🔖', label: ss ? 'Saved' : 'Save this issue', primary: !ss, saved: ss });
        acts.push({ id: 'open', ico: '🔦', label: 'Open Spotlight' });
        acts.push({ id: 'stands', ico: '🧭', label: 'See who stands where' });
      } else if (e.kind === 'issue') {
        var is = isSavedEntry(e);
        // Ranked comparison leads: it is the shortest path from "this issue" to
        // "who is consistent on it, with the receipt".
        acts.push({ id: 'ranking', ico: '🧭', label: 'See who backs it up', primary: true });
        acts.push({ id: 'topreceipt', ico: '🧾', label: 'Top receipt on this' });
        acts.push({ id: 'save', ico: is ? '✓' : '🔖', label: is ? 'Saved' : 'Save this issue', saved: is });
        acts.push({ id: 'locker', ico: '🗄', label: 'Open Evidence Locker' });
      } else if (e.kind === 'bill') {
        acts.push({ id: 'openbill', ico: '🏛️', label: 'Open bill detail', primary: true });
        if (e.issueKey) acts.push({ id: 'stands', ico: '🧭', label: 'See who stands where' });
      } else if (e.kind === 'saved') {
        acts.push({ id: 'open', ico: '↗', label: 'Open' });
        acts.push({ id: 'unsave', ico: '✕', label: 'Remove', danger: true });
      }
      return acts;
    }
    function actionStrip(e) {
      var acts = actionsFor(e);
      if (!acts.length) return '';
      var btns = acts.map(function (a) {
        var cls = 'pdx-eye-act' + (a.primary ? ' pdx-eye-act--primary' : '') +
          ((a.saved || a.on) ? ' is-saved' : '') + (a.danger ? ' pdx-eye-act--danger' : '');
        return '<button type="button" class="' + cls + '" data-act="' + a.id + '" tabindex="-1">' +
          '<span class="pdx-eye-act-ico" aria-hidden="true">' + esc(a.ico) + '</span>' + esc(a.label) + '</button>';
      }).join('');
      return '<div class="pdx-eye-actions" role="group" aria-label="Actions for this result">' + btns + '</div>';
    }

    // ── A DOOR THAT HAS NOT BOOTED YET IS NOT A DEAD ROW ────────────────────
    // WHAT WAS WRONG. Both issue-class rows opened through modules that arrive
    // LATER than this file does. all-seeing-eye.js is a synchronous tag; the
    // desk (door1-workspace.js), the file's address book (pdx-issue-profile.js)
    // and the family table (pdx-issue-family.js) are all deferred. Tap a family
    // row or a leaf row in the seconds before those execute and every branch
    // missed: no window.pdxDoor1Issue, no window.PDXDoor1, no address — so a
    // family tap fell through to a scroll and a leaf tap did nothing at all. The
    // handler was on the shipped eye the whole time; what it reached for was not
    // on the page yet. That is exactly the report from production, and a row that
    // does nothing when tapped is indistinguishable from a broken one.
    //
    // So the door WAITS for its own opener, on the same cold-arrival schedule
    // door1-workspace.js already uses for its own late arrivals. No path is
    // spelled out here: the address is still asked of the module that owns it,
    // and the last resort is still the section itself.
    var ISSUE_DOOR_WAIT = [120, 400, 900, 1600];
    function issueDoorTry(key, isFam) {
      // The desk's own entry point, for either shape — the same call the desk's
      // chip makes, so the pick is recorded and the record warmed identically.
      try { if (typeof window.pdxDoor1Issue === 'function' && window.pdxDoor1Issue(key)) return true; } catch (e) {}
      if (isFam) {
        // A core has no file of its own, so the desk's landing is the answer:
        // never the consistency ranking, and never an address with no document.
        try {
          var D = window.PDXDoor1;
          if (D && typeof D.toDesk === 'function') { D.toDesk('issue'); return true; }
        } catch (e) {}
        return false;
      }
      // A published leaf's own ledger at its own address, which issueFileHref
      // only answers for once the register has actually landed.
      try { var h = issueFileHref(key); if (h) { window.location.href = h; return true; } } catch (e) {}
      return false;
    }
    function issueDoorLast(key) {
      // The ladder ran out: nothing on this page is going to open. The key's own
      // address is asked of the module that owns it and taken as-is — a leaf's is
      // its census, a core's is the family shelf that /i/ paints for a core (no
      // census, its own notice, pinned by scripts/test-eye-formal-family.mjs), so
      // neither shape can land on an empty file.
      try { var u = issueFileUrl(key); if (u && u !== '#') { window.location.href = u; return; } } catch (e) {}
      try {
        var ht = document.getElementById('hot-topics');
        if (ht && ht.scrollIntoView) ht.scrollIntoView({ behavior: 'smooth' });
      } catch (e) {}
    }
    function issueDoor(key, isFam, tries) {
      var k = String(key == null ? '' : key).trim();
      if (!k) return;
      if (issueDoorTry(k, isFam)) return;
      var t = tries || 0;
      if (t < ISSUE_DOOR_WAIT.length) {
        try {
          setTimeout(function () { issueDoor(k, isFam, t + 1); }, ISSUE_DOOR_WAIT[t]);
          return;
        } catch (e) {}
      }
      issueDoorLast(k);
    }

    // Navigate to a result (the default open) — shared by clicks, Enter, and the
    // related-connection chips, so every path lands in the same place.
    function navigate(kind, data) {
      close();
      if (kind === 'pol') { if (typeof window.showProfile === 'function') window.showProfile(data.id); }
      else if (kind === 'spotlight') { if (window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') window.PDXSpotlight.open(data.slug); }
      else if (kind === 'issue') {
        // Issue-first: an issue result opens the RANKED view of that issue — every
        // tracked politician ordered by consistency, receipts one tap away — rather
        // than the raw locker. `focusKey` narrows it to a single sub-issue when the
        // caller knows one; `mode` preselects the say-vs-do lens.
        if (window.PDXIssueView && typeof window.PDXIssueView.open === 'function' && data.key) {
          window.PDXIssueView.open(data.key, { focusKey: data.focusKey || '', mode: data.mode || '', scope: data.scope || '' });
        }
        else if (typeof window._pdxOpenEvidenceLocker === 'function' && data.key) window._pdxOpenEvidenceLocker({ issue: data.key });
        else { var ht = document.getElementById('hot-topics'); if (ht) ht.scrollIntoView({ behavior: 'smooth' }); }
      }
      else if (kind === 'issuefile') {
        // THE FILE, NOT THE RANKING. A published leaf opens its own ledger at its
        // own address. Routed through the desk's own entry point, so the pick is
        // recorded and the record warmed exactly as it is when the chip is tapped
        // on the desk itself.
        // No desk on the page YET: a leaf's address is real, so go to it rather
        // than falling through to a view that answers a different question — and
        // if neither the desk nor the address has arrived, wait for one instead
        // of leaving the tap unanswered.
        issueDoor(data.key || '', false, 0);
      }
      else if (kind === 'family') {
        // ── A FAMILY ROW OPENS THE FAMILY SHELF ─────────────────────────────
        // NOT the consistency ranking (that characterises people, and this row is
        // about an issue), and NOT an issue file (a core has none — see
        // issueFileHref). What it opens is the door that already exists: Door 1's
        // "Open an issue" desk, with this family selected and its child keys
        // painted as chips, so the reader picks the key they actually meant. One
        // entry point — window.pdxDoor1Issue — which is the same call the desk's
        // own chip makes, so the pick is recorded and the record warmed
        // identically whether the tap happened here or there.
        // No desk painted on this page YET. The honest fallback is the desk's own
        // landing, never the ranking and never an address with no file behind it
        // — and a desk that is merely still deferred is waited for rather than
        // treated as absent.
        issueDoor(data.key || '', true, 0);
      }
      else if (kind === 'bill') {
        if (window.PDXBills && typeof window.PDXBills.open === 'function') window.PDXBills.open(data.number || data.id);
        else { var dl = document.getElementById('digital-library'); if (dl) dl.scrollIntoView({ behavior: 'smooth' }); }
      }
      else if (kind === 'mandate') {
        // THE EXISTING MANDATE SURFACE, not a new workshop. _pdxMandateFocusReform
        // is the bridge's own per-reform opener \u2014 it dismisses whatever is open,
        // scrolls to #agenda and flashes the card carrying this agenda id, which
        // is exactly the address the row already holds. Its per-issue sibling is
        // the fallback for a row the bridge filed under an issue but whose card is
        // addressed some other way; the section itself is the last resort, because
        // it exists whether or not the inline bridge loaded.
        var aid = data.agendaId || '';
        try {
          if (aid && typeof window._pdxMandateFocusReform === 'function') { window._pdxMandateFocusReform(aid); return; }
          if (data.key && typeof window._pdxMandateFocus === 'function') { window._pdxMandateFocus(data.key); return; }
        } catch (e) {}
        var ag = document.getElementById('agenda');
        if (ag && ag.scrollIntoView) ag.scrollIntoView({ behavior: 'smooth' });
      }
    }
    function openSaved(s) {
      close();
      var nav = s.nav || {};
      if (s.type === 'spotlight' && nav.slug) { navigate('spotlight', { slug: nav.slug }); return; }
      if (s.type === 'receipt') {
        if (typeof window._pdxOpenEvidenceLocker === 'function') { window._pdxOpenEvidenceLocker({ pol: nav.polId, issue: nav.issueKey || '' }); return; }
        if (typeof window.showProfile === 'function') window.showProfile(nav.polId); return;
      }
      if (s.type === 'issue') { navigate('issue', { key: nav.issueKey }); }
    }
    function activateEntry(e) {
      if (!e) return;
      if (e.kind === 'saved') { openSaved(e.saved); return; }
      if (e.kind === 'pol' || e.kind === 'stance') navigate('pol', { id: e.id });
      else if (e.kind === 'spotlight') navigate('spotlight', { slug: e.slug });
      else if (e.kind === 'issue') navigate('issue', { key: e.issueKey, focusKey: e._focus || '' });
      else if (e.kind === 'family') navigate('family', { key: e.issueKey });
      else if (e.kind === 'issuefile') navigate('issuefile', { key: e.issueKey });
      else if (e.kind === 'bill') navigate('bill', { number: e.number, id: e.id });
      // A mandate row opens the mandate surface by the issue the bridge filed the
      // reform under, with the agenda id alongside so the right card is flashed
      // when one issue carries several reforms.
      else if (e.kind === 'mandate') navigate('mandate', { key: e.issueKey, agendaId: e.agendaId });
    }
    // Run one command action for an entry. Saving toggles the shared collection
    // (which fires 'pdx-saved-change' → the panel re-renders to flip the label
    // and update the My Saved count); navigation actions close the eye.
    function runAction(e, id) {
      if (!e) return;
      if (id === 'team') {
        // mypolToggleAnimated shows its own rich "added to your team" toast — we
        // just re-render so the action label flips to reflect membership.
        if (typeof window.mypolToggleAnimated === 'function') window.mypolToggleAnimated(null, e.id);
        rerenderKeepFocus();
        return;
      }
      if (id === 'compare') {
        close();
        try {
          if (window._cmpSelected && typeof window._cmpSelected.add === 'function') window._cmpSelected.add(e.id);
          if (typeof window.openCompare === 'function') window.openCompare();
          if (typeof window.cmpAddRacePeers === 'function') window.cmpAddRacePeers(e.id);
        } catch (err) { navigate('pol', { id: e.id }); }
        return;
      }
      if (id === 'profile' || id === 'jump') { navigate('pol', { id: e.id }); return; }
      // Share whatever this person's strongest artifact is. The eye closes first:
      // an image share hands off to the OS sheet and a link share opens the share
      // overlay, and neither should have to layer over a search panel. Because the
      // panel is gone by then the button is detached, so no element is passed as the
      // busy/anchor target — PDXReceipts centres its desktop destination menu when
      // it has nothing to anchor to.
      if (id === 'share') {
        var sid = e.id, siss = (e.kind === 'stance' ? (e.issueKey || '') : '');
        close();
        try {
          var SA = window.PDXShareAnywhere;
          if (SA && typeof SA.share === 'function') { SA.share(sid, null, { issueKey: siss }); return; }
        } catch (err) {}
        if (typeof window.pdxSharePolitician === 'function') window.pdxSharePolitician(sid);
        else navigate('pol', { id: sid });
        return;
      }
      if (id === 'openbill') { close(); if (window.PDXBills && typeof window.PDXBills.open === 'function') window.PDXBills.open(e.number || e.id); else navigate('bill', { number: e.number, id: e.id }); return; }
      if (id === 'evidence') { close(); if (typeof window._pdxOpenEvidenceLocker === 'function') window._pdxOpenEvidenceLocker({ pol: e.id, issue: e.issueKey || '' }); else navigate('pol', { id: e.id }); return; }
      if (id === 'open') { if (e.kind === 'saved') openSaved(e.saved); else navigate('spotlight', { slug: e.slug }); return; }
      if (id === 'stands') {
        var ik = e.issueKey || '';
        // "Where they stand" now means the ranked comparison, not the raw locker.
        if (ik) { navigate('issue', { key: ik, focusKey: e._focus || '' }); return; }
        if (e.kind === 'spotlight') { navigate('spotlight', { slug: e.slug }); return; }
        close(); var ht = document.getElementById('hot-topics'); if (ht) ht.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (id === 'ranking') { navigate('issue', { key: e.issueKey || '', focusKey: e._focus || '' }); return; }
      if (id === 'locker') {
        close();
        if (typeof window._pdxOpenEvidenceLocker === 'function' && e.issueKey) window._pdxOpenEvidenceLocker({ issue: e.issueKey });
        else navigate('issue', { key: e.issueKey || '' });
        return;
      }
      // The single strongest sourced receipt on this issue — one tap from an issue
      // result to the evidence. If nothing is documented yet, say so instead of
      // opening an empty view.
      if (id === 'topreceipt') {
        var rows = [];
        try {
          if (window.PDXIssueView && window.PDXIssueView.buildRanking && window.CORE_NATIONAL_ISSUES) {
            var core = null;
            window.CORE_NATIONAL_ISSUES.forEach(function (c) { if (c && c.key === e.issueKey) core = c; });
            if (core) rows = window.PDXIssueView.buildRanking(core, e._focus || '') || [];
          }
        } catch (err) {}
        var hit = null;
        for (var ri = 0; ri < rows.length && !hit; ri++) { if (rows[ri].receiptCount && rows[ri].topReceiptPid) hit = rows[ri]; }
        if (hit && window.PDXReceipts && typeof window.PDXReceipts.open === 'function') {
          close(); window.PDXReceipts.open(hit.topReceiptPid, hit.topReceiptIssue || '');
        } else if (typeof window._showToast === 'function') {
          window._showToast('No sourced receipt on this issue yet — opening the ranking');
          navigate('issue', { key: e.issueKey || '', focusKey: e._focus || '' });
        } else {
          navigate('issue', { key: e.issueKey || '', focusKey: e._focus || '' });
        }
        return;
      }
      if (id === 'save') {
        var snap = savedSnapshot(e);
        if (snap && window.PDXSaved) {
          var nowSaved = window.PDXSaved.toggle(snap);
          toast(nowSaved ? 'Saved — find it in My Saved ✓' : 'Removed from My Saved');
        }
        return; // 'pdx-saved-change' triggers the re-render
      }
      if (id === 'unsave') {
        if (e.saved && window.PDXSaved) { window.PDXSaved.remove(e.saved.type, e.saved.key); toast('Removed from My Saved'); }
        return;
      }
    }

    // ── render ────────────────────────────────────────────────────────
    var flat = [];      // flattened list of currently-rendered items (for keyboard)
    var active = -1;    // active row index
    var actIdx = -1;    // focused action within the active row (-1 = the row itself)
    var curQ = null;    // last-rendered query (to reset per-category expansion)
    var curCtx = null;  // personal context (saved + team) for the current render
    var badgeOff = false; // suppress the personal badge inside sections that already imply it
    var expand = { pol: false, stance: false, iss: false, saved: false, team: false }; // "see more" per category

    function highlight(text, q, terms) {
      var lc = norm(text), at = -1, len = 0;
      var qi = lc.indexOf(q);
      if (q && qi !== -1) { at = qi; len = q.length; }
      else {
        for (var i = 0; i < terms.length; i++) {
          var ti = lc.indexOf(terms[i]);
          if (ti !== -1 && (at === -1 || ti < at)) { at = ti; len = terms[i].length; }
        }
      }
      if (at === -1) return esc(text);
      return esc(text.slice(0, at)) + '<mark>' + esc(text.slice(at, at + len)) + '</mark>' + esc(text.slice(at + len));
    }

    // ── A result row that names a person opens as a LINK ────────────────────
    // Every other row kind (issue, spotlight, bill, saved) keeps its <button>:
    // those open panels and overlays with no address of their own, and a link to
    // nowhere is worse than a button. Only the two person-shaped rows change,
    // because only they have a URL to advertise.
    //
    // rowOpen/rowClose are a pair so the tag can never disagree with itself: if
    // person-link.js has not loaded, or the id is not pid-shaped, BOTH fall back
    // to the <button> this row has always been and the row behaves exactly as
    // before. The class list and the data-* attributes are identical either way,
    // so wire(), the keyboard model and every selector in this file are untouched.
    function rowOpen(pid, cls, data) {
      var PL = window.PDXPersonLink;
      var a = (PL && typeof PL.attrs === 'function') ? PL.attrs(pid) : '';
      if (!a) return '<button type="button" role="option" class="' + cls + '" ' + data + '>';
      return '<a role="option" class="' + cls + '" ' + a + ' ' + data + '>';
    }
    function rowClose(pid) {
      var PL = window.PDXPersonLink;
      var a = (PL && typeof PL.attrs === 'function') ? PL.attrs(pid) : '';
      return a ? '</a>' : '</button>';
    }

    function polItem(e, q, terms, idx) {
      var url = photoFor(e.id);
      var thumb = url
        ? '<span class="pdx-eye-thumb"><img src="' + esc(url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + esc(e.icon) + '\'"></span>'
        : '<span class="pdx-eye-thumb">' + esc(e.icon) + '</span>';
      var tag = e.party ? '<span class="pdx-eye-tag" style="color:' + e.party.color + ';background:' + e.party.color + '22;border:1px solid ' + e.party.color + '55;">' + esc(e.party.label) + '</span>' : '';
      // THE RESULT CHIP — one meaning, and it is the profile's own.
      //
      // First choice is the issue index: the strongest bucket that has rows, in the
      // index's word and colour (PDXWordAction.searchBadgeHTML). A reader who taps
      // through then finds that same word at the top of the profile. This used to
      // lead with the curated Say-vs-Do receipt verdict instead, which answers a
      // different question off a different evidence base — and answers it in the
      // index's hardest words, so a record the index reads as Mixed was announced
      // in search as "Says One Thing · Does Another".
      //
      // Where the index has no result to name, searchBadgeHTML answers with the size
      // of the formal record instead of with nothing — a count of issues with votes
      // or formal actions on file, no score and no direction. Silence about an issue
      // is not absence of a record, and this row is where that used to be published
      // as though it were.
      //
      // The receipt verdict is still the next fallback, and it is a real one: it
      // covers people the formal lane cannot reach — a record that is public rather
      // than legislative. It is only ever shown where there is no formal answer to
      // disagree with. Coverage is the last resort, and now genuinely last: a person
      // we know, hold no formal record for and have not documented reads as "not yet
      // documented" rather than as silence.
      var receipt = '';
      try {
        if (window.PDXWordAction && window.PDXWordAction.searchBadgeHTML) {
          receipt = window.PDXWordAction.searchBadgeHTML(e.id) || '';
        }
      } catch (ierr) {}
      if (!receipt) {
        try { if (window.PDXReceipts && window.PDXReceipts.rowBadge) receipt = window.PDXReceipts.rowBadge(e.id) || ''; } catch (rerr) {}
      }
      if (!receipt) {
        try { if (window.PDXCoverage && window.PDXCoverage.badgeHTML) receipt = window.PDXCoverage.badgeHTML(e.id) || ''; } catch (cerr) {}
      }
      // THE ROW IS A LINK, not a button. Everything inside it — thumb, name, sub
      // line, badges — is the same person, so the whole row is the photo+name
      // cluster the address belongs on, and there is nothing interactive inside it
      // to nest: the action strip (Add to My Team, Compare, Share) is a SIBLING in
      // .pdx-eye-res, not a child, precisely so the row can be one control.
      //
      // role="option" is kept, so the combobox contract with the input above is
      // unchanged; wire() still opens the in-app file on a plain click and now
      // leaves a ⌘-click to the browser. What is new is that the address is in the
      // markup: a reader can open a search result in a new tab, and a crawler that
      // reaches this panel can walk from a name to /p/<pid>.
      return rowOpen(e.id, 'pdx-eye-item', 'data-i="' + idx + '" data-kind="pol" data-id="' + esc(e.id) + '"') +
        thumb +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
        (e.sub ? '<span class="pdx-eye-sub">' + esc(e.sub) + '</span>' : '') + '</span>' +
        personalBadge(e) + receipt + tag + rowClose(e.id);
    }
    // Which single sub-issue (an ISSUE_MAP key) the current query is really about,
    // if any — so "housing" reaches housing instead of the whole economy bundle.
    // Stashed on the entry so the row, its actions and Enter all agree.
    function issueFocusFor(e, q) {
      if (!q || e.kind !== 'issue') return '';
      if (e._fq === q) return e._focus || '';
      var f = '';
      try {
        var hits = (window.PDXIssueView && window.PDXIssueView.searchIssues) ? window.PDXIssueView.searchIssues(q, 6) : [];
        for (var i = 0; i < hits.length; i++) { if (hits[i].key === e.issueKey) { f = hits[i].focusKey || ''; break; } }
      } catch (err) {}
      e._fq = q; e._focus = f;
      return f;
    }
    function issueItem(e, q, terms, idx) {
      var attr = e.kind === 'spotlight'
        ? 'data-kind="spotlight" data-slug="' + esc(e.slug) + '"'
        : 'data-kind="issue" data-key="' + esc(e.issueKey || '') + '"';
      var sub = e.desc ? (e.sub.split(' · ')[0] + ' · ' + e.desc) : e.sub;
      var tag = '';
      if (e.kind === 'issue') {
        // Lead with what is actually documented on this issue — a live count, or an
        // honest "not yet documented" — instead of a static promise to compare.
        var focus = issueFocusFor(e, q);
        try {
          var cov = (window.PDXIssueView && window.PDXIssueView.coverage)
            ? window.PDXIssueView.coverage(e.issueKey, { focusKey: focus }) : null;
          if (cov) {
            sub = cov.people === 0
              ? 'National issue · not yet documented'
              : (cov.people + ' ranked by consistency' + (cov.withReceipts ? ' · ' + cov.withReceipts + ' with receipts' : ' · stated positions only'));
            if (focus) {
              var fl = '';
              try { fl = (window.ISSUE_MAP && window.ISSUE_MAP[focus] && window.ISSUE_MAP[focus].label) || ''; } catch (fe) {}
              if (fl) sub = fl + ' · ' + sub;
            }
            if (cov.thin && cov.people > 0) tag = '<span class="pdx-eye-tag pdx-eye-tag--src">Thin coverage</span>';
            else if (cov.people === 0) tag = '<span class="pdx-eye-tag pdx-eye-tag--src">No data yet</span>';
          }
        } catch (err) {}
      }
      return '<button type="button" role="option" class="pdx-eye-item" data-i="' + idx + '" ' + attr + '>' +
        '<span class="pdx-eye-thumb pdx-eye-thumb--issue">' + esc(e.icon) + '</span>' +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
        '<span class="pdx-eye-sub">' + esc(sub) + '</span></span>' +
        personalBadge(e) + tag + '</button>';
    }
    // ── AN ISSUE FILE ROW, AND A FAMILY ROW ───────────────────────────────
    // One shape, two kinds, and both of them are ANCHORS. /i/<key> is a served
    // path, so the row can carry a real destination the way a person row carries
    // /p/<pid>: copyable, middle-clickable, openable in a new tab. A plain tap is
    // still the eye's and opens the file in place (see navigate('issuefile')).
    //
    // THE COLOUR IS THE ISSUE'S OWN, taken from PDXIssueColors through the shared
    // issueTint() — the same three tokens a bill letterhead chip and /issue/<key>
    // take for the same key, so Climate, Energy & Land is the same green in a
    // search result as it is on the desk. A key the colour table does not know
    // gets no tint rather than a stand-in colour.
    //
    // NO COUNT, NO SHARE, NO ORDERING CLAIM in either row's sub-line. A family
    // says how many keys are filed under it (a length, not a reading); a file says
    // which family it sits in, or that it sits in none — which is not a gap.
    function fileRowHtml(e, q, terms, idx, cls, chipText, chipKey) {
      var href = issueFileHref(e.issueKey || '');
      var tint = issueTint(chipKey || e.issueKey || '');
      var chip = chipText
        ? '<span class="pdx-eye-topic"' + tint + '>' + esc(chipText) + '</span>'
        : '';
      // ONE SHAPE, TWO ELEMENTS, AND THE ADDRESS DECIDES WHICH. A leaf file has
      // a served path, so its row is an anchor. A family has no file at that
      // address, so its row is a button — the same body, the same tint, the same
      // tap, minus a destination it cannot honour. See issueFileHref() above.
      var open = href
        ? '<a role="option" class="pdx-eye-item ' + cls + '" data-i="' + idx + '"' +
          ' href="' + esc(href) + '"'
        : '<button type="button" role="option" class="pdx-eye-item ' + cls + '" data-i="' + idx + '"';
      return open +
        ' data-kind="' + (e.kind === 'family' ? 'family' : 'issuefile') + '"' +
        ' data-key="' + esc(e.issueKey || '') + '"' + tint + '>' +
        '<span class="pdx-eye-thumb pdx-eye-thumb--issue">' + esc(e.icon) + '</span>' +
        '<span class="pdx-eye-body">' +
          '<span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
          '<span class="pdx-eye-sub">' + esc(e.sub) + '</span>' +
        '</span>' +
        chip + personalBadge(e) +
      (href ? '</a>' : '</button>');
    }
    function issueFileItem(e, q, terms, idx) {
      return fileRowHtml(e, q, terms, idx, 'pdx-eye-item--file',
        e.coreLabel || 'Unfiled key', e.coreKey || e.issueKey || '');
    }
    // A FAMILY ROW SAYS WHAT IT OPENS. A length ("17 keys filed under it") and a
    // destination ("opens the issue desk") — no count of people, no share, no
    // ordering claim, and no promise of a file this key has not got.
    function familyItem(e, q, terms, idx) {
      return fileRowHtml(e, q, terms, idx, 'pdx-eye-item--fam', 'Issue family', e.issueKey || '');
    }
    // A bill / measure from the Legislation library. Clicking opens the rich in-app
    // bill detail panel (PDXBills.open → PDXBillDetail), where the omnibus breakdown,
    // sponsors, member actions and related Spotlights live.
    function billStatusLabel(s) {
      var M = { introduced: 'Introduced', passed_house: 'Passed House', passed_senate: 'Passed Senate', enacted: 'Enacted', failed: 'Failed', vetoed: 'Vetoed', pending: 'Pending' };
      return M[s] || '';
    }
    // The topics a measure is mapped to, as chips rather than as one more clause on
    // the end of the sub line. Read-only labels, not doors: the row itself already
    // opens the bill, and a chip inside a <button> cannot be a second button.
    var BILL_TOPIC_CAP = 3;
    function billTopicChips(e) {
      var t = (e && e.topics) || [];
      var tk = (e && e.topicKeys) || [];
      if (!t.length) return '';
      var out = '';
      for (var i = 0; i < t.length && i < BILL_TOPIC_CAP; i++) {
        if (!t[i]) continue;
        out += '<span class="pdx-eye-topic"' + issueTint(tk[i] || '') + '>' + esc(t[i]) + '</span>';
      }
      // Same promise the joined form made: name what fits and state the true total,
      // so the number the reader carries to the bill page is the real one. It names
      // no topic, so it takes no topic's colour - it stays the neutral counter.
      if (t.length > BILL_TOPIC_CAP) {
        out += '<span class="pdx-eye-topic pdx-eye-topic--more">+' +
          (t.length - BILL_TOPIC_CAP) + ' of ' + t.length + ' topics</span>';
      }
      return out;
    }
    // WHY THIS ROW WRAPS INSTEAD OF CLIPPING. It used to put the number, the
    // chamber and every topic label on one nowrap sub line and pin the status badge
    // to the right of it. On H.R. 6644 the topic ran straight over PASSED HOUSE:
    // .pdx-eye-sub is an inline span, and overflow/text-overflow do not apply to
    // inline boxes, so the text neither wrapped nor ellipsised - it simply painted
    // on top of the badge. Clipping it would have hidden the collision rather than
    // resolved it, so the row now reads top to bottom - title, number, then a
    // wrapping strip of topic chips and status badges - and takes a second line
    // when it needs one.
    function billItem(e, q, terms, idx) {
      var st = billStatusLabel(e.status);
      var badge = st ? '<span class="pdx-eye-tag pdx-eye-tag--src">' + esc(st) + '</span>' : '';
      var meta = billTopicChips(e) + badge + personalBadge(e);
      return '<button type="button" role="option" class="pdx-eye-item pdx-eye-item--bill" data-i="' + idx + '" data-kind="bill" data-number="' + esc(e.number) + '">' +
        '<span class="pdx-eye-thumb pdx-eye-thumb--issue">' + esc(e.icon) + '</span>' +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
        '<span class="pdx-eye-sub">' + esc(e.sub) + '</span>' +
        (meta ? '<span class="pdx-eye-meta">' + meta + '</span>' : '') +
        '</span></button>';
    }
    // A single promise / position / receipt. Clicking opens the politician's
    // profile (where the full Evidence Locker card lives). The row leads with a
    // stance pill and tails with the source label — the "receipt" at a glance.
    function stanceItem(e, q, terms, idx) {
      var url = photoFor(e.id);
      var thumb = url
        ? '<span class="pdx-eye-thumb"><img src="' + esc(url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + esc(e.icon) + '\'"></span>'
        : '<span class="pdx-eye-thumb">' + esc(e.icon) + '</span>';
      var src = e.sourceLabel ? '<span class="pdx-eye-tag pdx-eye-tag--src">' + esc(e.sourceLabel) + '</span>' : '';
      var sub = posPill(e.pos) + esc(e.polName) + (e.polSub ? ' · ' + esc(e.polSub) : '') + (e.pledge ? ' · pledge' : '');
      // Same treatment as a person row, and for the same reason: this row's click
      // already opened e.id's person file, so the address it opens is the address
      // it should advertise.
      return rowOpen(e.id, 'pdx-eye-item', 'data-i="' + idx + '" data-kind="pol" data-id="' + esc(e.id) + '"') +
        thumb +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
        '<span class="pdx-eye-sub">' + sub + '</span></span>' +
        personalBadge(e) + src + rowClose(e.id);
    }
    // A People's Mandate reform. The row is deliberately the plainest one in the
    // panel, and that is the point of the whole pass:
    //   \u00b7 NO ADDRESS IT HAS NOT GOT. It is a <button>, not an <a href="/i/\u2026">,
    //     because a reform is not an issue file and printing a file address on it
    //     would be the Formal lane's lie in a different font.
    //   \u00b7 NO FORMAL PATTERN CHIP, NO WORD-VS-ACTION FIGURE, NO PERCENTAGE, and
    //     no "See who backs it up" \u2014 there is no record here to read one off.
    //     This is not special-cased away: relBlock(), actionsFor() and
    //     savedKeyFor() all decline a kind they do not know, so a mandate row
    //     inherits no chip, no action strip and no badge by construction.
    //   \u00b7 NO PARTY LETTER anywhere, and nothing on the row is sortable by one.
    // What it does carry is what the document actually is: the reform's name, the
    // words "proposed vehicle", and the tracked issues it is filed against, tinted
    // from the one colour table so the chip agrees with every other surface.
    var MANDATE_TOPIC_CAP = 2;
    function mandateTopicChips(e) {
      var t = (e && e.topics) || [], tk = (e && e.topicKeys) || [], out = '';
      for (var i = 0; i < t.length && i < MANDATE_TOPIC_CAP; i++) {
        if (!t[i]) continue;
        out += '<span class="pdx-eye-topic"' + issueTint(tk[i] || '') + '>' + esc(t[i]) + '</span>';
      }
      if (t.length > MANDATE_TOPIC_CAP) {
        out += '<span class="pdx-eye-topic pdx-eye-topic--more">+' + (t.length - MANDATE_TOPIC_CAP) + '</span>';
      }
      return out;
    }
    function mandateItem(e, q, terms, idx) {
      var meta = mandateTopicChips(e);
      // The kind and the agenda id lead the tag, on the same line as the class, for
      // the same reason a bill row's do: this is the row's identity, and the row
      // audits that read the panel (and the source) read it from there.
      return '<button type="button" role="option" class="pdx-eye-item pdx-eye-item--mand" data-kind="mandate"' +
        ' data-key="' + esc(e.agendaId || '') + '" data-i="' + idx + '">' +
        '<span class="pdx-eye-thumb pdx-eye-thumb--issue">' + esc(e.icon) + '</span>' +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + highlight(e.title, q, terms) + '</span>' +
        '<span class="pdx-eye-sub">' + esc(e.sub) + '</span>' +
        (meta ? '<span class="pdx-eye-meta">' + meta + '</span>' : '') +
        '</span></button>';
    }
    // Wrap one rendered row so its related hints and its action strip live in a
    // single focus/hover container — this is what lets the eye reveal the action
    // layer for exactly the row you're on, and nothing else.
    function wrapRes(idx, itemHtml, entry, q, terms) {
      return '<div class="pdx-eye-res" data-i="' + idx + '">' + itemHtml + relBlock(entry) + actionStrip(entry) + '</div>';
    }
    // A saved-collection row (rendered in the empty-state "My Saved" section).
    function savedItemHtml(e, idx) {
      var s = e.saved;
      var badge = s.type === 'receipt' ? 'Receipt' : s.type === 'spotlight' ? 'Spotlight' : 'Issue';
      var thumbCls = (s.type === 'spotlight' || s.type === 'issue') ? 'pdx-eye-thumb pdx-eye-thumb--issue' : 'pdx-eye-thumb';
      return '<button type="button" role="option" class="pdx-eye-item" data-i="' + idx + '" data-kind="saved">' +
        '<span class="' + thumbCls + '">' + esc(e.icon) + '</span>' +
        '<span class="pdx-eye-body"><span class="pdx-eye-name">' + esc(e.title) + '</span>' +
        (e.sub ? '<span class="pdx-eye-sub">' + esc(e.sub) + '</span>' : '') + '</span>' +
        '<span class="pdx-eye-tag pdx-eye-tag--saved">' + badge + '</span>' +
        '</button>';
    }
    // The "My Saved" section — the retrievable home of everything the eye let you
    // save. Shown in the calm empty/focused state so a returning visitor sees
    // their collection the moment they open the eye.
    function savedBlock() {
      var items = (window.PDXSaved && window.PDXSaved.list) ? window.PDXSaved.list() : [];
      if (!items.length) return '';
      var cap = expand.saved ? items.length : 6;
      var h = '<div class="pdx-eye-cat" data-cat="saved"><div class="pdx-eye-cat-h"><span class="pdx-eye-cat-dot" style="background:#a78bfa;"></span>My Saved<span class="pdx-eye-cat-n">' + items.length + '</span></div>';
      items.slice(0, cap).forEach(function (s) {
        var e = { kind: 'saved', saved: s, title: s.title, icon: s.icon || '🔖', sub: s.sub || '' };
        var i = flat.length; flat.push(e);
        h += wrapRes(i, savedItemHtml(e, i), e, '', []);
      });
      if (items.length > cap) { h += '<button type="button" class="pdx-eye-more" data-more="saved">See ' + (items.length - cap) + ' more ▾</button>'; }
      return h + '</div>';
    }
    // The "From My Team" section — the visitor's own roster, surfaced the moment
    // the eye opens so a returning user lands on their people first. Rows reuse
    // the normal politician renderer (and its action strip: compare, profile,
    // Evidence Locker), so a teammate here behaves exactly like one found by name.
    function teamBlock() {
      var ctx = curCtx || personalContext();
      var ids = Object.keys(ctx.team);
      if (!ids.length) return '';
      var byId = {};
      getIndex().people.forEach(function (p) { byId[p.id] = p; });
      var entries = [];
      ids.forEach(function (id) { if (byId[id]) entries.push(byId[id]); });
      if (!entries.length) return '';
      var cap = expand.team ? entries.length : 6;
      var h = '<div class="pdx-eye-cat" data-cat="team"><div class="pdx-eye-cat-h"><span class="pdx-eye-cat-dot" style="background:#f5c842;"></span>From My Team<span class="pdx-eye-cat-n">' + entries.length + '</span></div>';
      badgeOff = true; // every row here is a teammate — the section header already says so
      entries.slice(0, cap).forEach(function (e) {
        var i = flat.length; flat.push(e);
        h += wrapRes(i, polItem(e, '', [], i), e, '', []);
      });
      badgeOff = false;
      if (entries.length > cap) { h += '<button type="button" class="pdx-eye-more" data-more="team">See ' + (entries.length - cap) + ' more ▾</button>'; }
      return h + '</div>';
    }
    // ── the personal map (Phase 5) ────────────────────────────────────
    // Per-result boosting told the visitor "this one is yours". The map goes a
    // step further and shows the *shape* of what they watch: it rolls their saved
    // receipts up to national themes, then, for each theme, counts how many of
    // their own teammates are already on record on it. That single crossing —
    // "a theme you collect × a person you back" — is the connection this layer
    // surfaces, plus the people who share a Spotlight with something they saved.
    // Everything is derived live from window.PDXSaved + the My Team roster, so it
    // is always truthful and needs no store of its own.
    var connOpen = true; // the map is calm-but-visible by default; the header collapses it
    // One friendly {label, icon} for a national-issue bucket key (falls back to
    // the raw issueKey when a save doesn't roll up into a known bucket).
    function themeMeta(coreKey, ik) {
      var core = window.CORE_NATIONAL_ISSUES || [];
      for (var i = 0; i < core.length; i++) {
        if (core[i].key === coreKey) return { label: stripEmoji(core[i].label) || core[i].label, icon: leadEmoji(core[i].label) || '📍' };
      }
      return { label: issueShort(ik) || String(coreKey).replace(/_/g, ' '), icon: '📍' };
    }
    // The connection graph for this visitor. Cheap: one pass over the (tiny) saved
    // list, then one pass over each teammate's stances. Rebuilt per open, memoized
    // only within a single render via curCtx.
    function connectionsData(ctx) {
      ctx = ctx || personalContext();
      var out = { tagThemes: [], issueThemes: [], siblings: [], teamActive: 0, itemsById: {} };
      if (!ctx.hasSaved) return out; // the map needs a collection to connect
      var items = (window.PDXSaved && window.PDXSaved.list) ? window.PDXSaved.list() : [];
      var normTags = (window.PDXSaved && window.PDXSaved.normTags)
        ? window.PDXSaved.normTags
        : function (t) { return Array.isArray(t) ? t : []; };

      // 1a · roll each saved item up to a national-issue bucket (the app's own themes)
      var buckets = {}; // coreKey -> { kind:'issue', key, label, icon, savedCount, teamIds:{}, itemIds:{}, items:[] }
      function bucketOf(ik) {
        var ck = coreKeyForIssue(ik) || ik; // fall back to the raw key as its own bucket
        if (!buckets[ck]) { var m = themeMeta(ck, ik); buckets[ck] = { kind: 'issue', key: ck, label: m.label, icon: m.icon, savedCount: 0, teamIds: {}, itemIds: {}, items: [] }; }
        return buckets[ck];
      }
      // 1b · …and cluster the SAME saves by the visitor's own tags — how *they*
      // organize their evidence. Each tag remembers which national issues its
      // receipts span, so we can cross-link the visitor's team to it later.
      var tags = {}; // tag -> { kind:'tag', key, label, icon, savedCount, teamIds:{}, cores:{coreKey:n}, itemIds:{}, items:[] }
      function tagOf(tg) {
        if (!tags[tg]) tags[tg] = { kind: 'tag', key: tg, label: tg, icon: '🏷', savedCount: 0, teamIds: {}, cores: {}, itemIds: {}, items: [] };
        return tags[tg];
      }
      // One compact summary per saved item, so an expanded cluster can list the
      // real receipts (and deep-link each) without re-reading the store. The same
      // summary object is shared across every cluster the item lands in, which is
      // also what lets two clusters be detected as "sharing" a receipt.
      function summarize(s) {
        return {
          id: String(s.type) + '::' + String(s.key),
          type: s.type, key: s.key,
          title: s.title || '(untitled)', sub: s.sub || '', icon: s.icon || '🔖',
          polId: s.polId || (s.nav && s.nav.polId) || '',
          issueKey: s.issueKey || (s.nav && s.nav.issueKey) || ''
        };
      }
      function addItem(cluster, sum) { if (!cluster.itemIds[sum.id]) { cluster.itemIds[sum.id] = 1; cluster.items.push(sum); } }
      items.forEach(function (s) {
        var sum = summarize(s);
        out.itemsById[sum.id] = sum;
        var ik = sum.issueKey;
        var ck = ik ? (coreKeyForIssue(ik) || ik) : '';
        if (ik) { var b = bucketOf(ik); b.savedCount++; addItem(b, sum); }
        normTags(s.tags).forEach(function (tg) {
          var tb = tagOf(tg); tb.savedCount++; addItem(tb, sum);
          if (ck) tb.cores[ck] = (tb.cores[ck] || 0) + 1;
        });
      });

      // 2 · which of the visitor's own teammates are on record on each cluster.
      //   · an issue cluster matches a teammate with a stance in that core theme
      //   · a tag cluster matches a teammate active on ANY theme that tag spans —
      //     i.e. the people already working the issues the visitor tags heavily.
      var teamIds = Object.keys(ctx.team);
      var SD = window.ISSUE_STANCE_DATA || {};
      var activeAll = {};
      var teamCores = {}; // pid -> { coreKey:1 } — each teammate's themes, indexed once
      teamIds.forEach(function (pid) {
        var cs = {};
        (SD[pid] || []).forEach(function (st) {
          if (!st || !st.issueKey) return;
          cs[coreKeyForIssue(st.issueKey) || st.issueKey] = 1;
        });
        teamCores[pid] = cs;
      });
      teamIds.forEach(function (pid) {
        var cs = teamCores[pid];
        Object.keys(buckets).forEach(function (ck) { if (cs[ck]) { buckets[ck].teamIds[pid] = 1; activeAll[pid] = 1; } });
        Object.keys(tags).forEach(function (tg) {
          var tb = tags[tg];
          for (var ck in tb.cores) { if (cs[ck]) { tb.teamIds[pid] = 1; activeAll[pid] = 1; break; } }
        });
      });
      out.teamActive = Object.keys(activeAll).length;

      function finish(b) {
        b.teamCount = Object.keys(b.teamIds).length;
        // the theme a tag leans on most — scopes a teammate chip's deep-link.
        if (b.kind === 'tag') {
          var top = '', best = 0;
          for (var ck in b.cores) { if (b.cores[ck] > best) { best = b.cores[ck]; top = ck; } }
          b.topIssue = top;
        }
        return b;
      }
      // strongest connection first: most saved, then most of the visitor's people active
      var sortFn = function (a, b) { return (b.savedCount - a.savedCount) || (b.teamCount - a.teamCount) || String(a.label).localeCompare(String(b.label)); };
      Object.keys(tags).forEach(function (k) { out.tagThemes.push(finish(tags[k])); });
      Object.keys(buckets).forEach(function (k) { out.issueThemes.push(finish(buckets[k])); });
      out.tagThemes.sort(sortFn);
      out.issueThemes.sort(sortFn);

      // 3 · Spotlight siblings — people featured alongside a Spotlight the visitor
      // saved, that they neither saved from nor already have on their team. A
      // sibling drawn from a Spotlight the visitor took the trouble to *tag* reads
      // as a stronger signal, so it sorts first and carries that tag as context.
      try {
        var reg = (window.PDXSpotlight && window.PDXSpotlight.registry) || {};
        var seenSib = {};
        items.forEach(function (s) {
          if (s.type !== 'spotlight') return;
          var slug = s.slug || (s.nav && s.nav.slug) || s.key;
          var sp = reg[slug];
          if (!sp || !Array.isArray(sp.groups)) return;
          var stags = normTags(s.tags);
          sp.groups.forEach(function (g) {
            (g.people || []).forEach(function (pp) {
              if (!pp || !pp.id || seenSib[pp.id]) return;
              if (ctx.team[pp.id] || ctx.savedPolIds[pp.id]) return; // already in their world
              var d = polRec(pp.id); if (!d || !d.name) return;
              seenSib[pp.id] = 1;
              out.siblings.push({ id: pp.id, name: d.name, from: stripThe(sp.title || 'a Spotlight you saved'), tag: stags[0] || '' });
            });
          });
        });
        out.siblings.sort(function (a, b) { return (b.tag ? 1 : 0) - (a.tag ? 1 : 0); });
      } catch (e) {}

      return out;
    }
    // Which cluster (by id "kind:key") is currently expanded in the map, and the
    // last-built data (so the wire handlers can resolve a receipt by id). A single
    // open cluster keeps the panel calm — an accordion, not a wall of detail.
    var connSel = '';
    var connData = null;
    function connReceiptById(id) { return (connData && connData.itemsById && connData.itemsById[id]) || null; }
    // Deep-link a single saved receipt: prefer its politician's Evidence Locker
    // scoped to the receipt's theme, else fall back to My Evidence.
    function connOpenReceipt(sum) {
      close();
      if (sum && sum.polId && typeof window._pdxOpenEvidenceLocker === 'function') {
        window._pdxOpenEvidenceLocker({ pol: sum.polId, issue: sum.issueKey || '' });
      } else if (typeof window._pdxOpenMyEvidenceByTag === 'function') {
        window._pdxOpenMyEvidenceByTag('');
      }
    }
    // Render the personal map into the eye's resting state. Returns '' (nothing at
    // all) unless the visitor has saved content that rolls up into at least one
    // theme — so a new or empty visitor never sees it.
    function connectionsBlock() {
      var ctx = curCtx || personalContext();
      var data = connectionsData(ctx);
      connData = data;
      if (!data.tagThemes.length && !data.issueThemes.length) return '';

      // Blend: the visitor's own tags lead — mirroring how *they* organize their
      // evidence is the whole point of this layer — but at least one of the app's
      // inferred themes is kept alongside when room remains. So tags are
      // *preferred*, never a wholesale replacement of the national-issue map.
      var themes;
      if (data.tagThemes.length) themes = data.tagThemes.slice(0, 3).concat(data.issueThemes).slice(0, 4);
      else themes = data.issueThemes.slice(0, 4);
      if (!themes.length) return '';
      var sibs = data.siblings.slice(0, 3);

      // Relationships are scoped to the clusters we actually show, so every
      // "overlaps with" chip jumps to something visible on the map. Two clusters
      // overlap when they share a saved receipt (the same item is tagged into both
      // / rolls into both) or a teammate on record across them.
      themes.forEach(function (t) { t._id = t.kind + ':' + t.key; });
      var displayed = {}; themes.forEach(function (t) { displayed[t._id] = t; });
      themes.forEach(function (a) {
        var rel = [];
        themes.forEach(function (b) {
          if (b === a) return;
          var st = 0, sr = 0, p, it;
          for (p in a.teamIds) { if (b.teamIds[p]) st++; }
          for (it in a.itemIds) { if (b.itemIds[it]) sr++; }
          if (st || sr) rel.push({ id: b._id, kind: b.kind, key: b.key, label: b.label, icon: b.icon, st: st, sr: sr });
        });
        rel.sort(function (x, y) { return (y.sr + y.st) - (x.sr + x.st); });
        a._rel = rel;
      });
      // Forget a remembered open cluster that is no longer on the map, then light
      // up the clusters the open one overlaps (the calm "shared highlighting").
      if (connSel && !displayed[connSel]) connSel = '';
      var openT = connSel ? displayed[connSel] : null;
      var linked = {};
      if (openT) openT._rel.forEach(function (r) { linked[r.id] = 1; });

      // header summary — a one-line read that stands alone when collapsed
      var nTag = 0, nIss = 0;
      themes.forEach(function (t) { if (t.kind === 'tag') nTag++; else nIss++; });
      var parts = [];
      if (nTag) parts.push(nTag + ' of your tag' + (nTag === 1 ? '' : 's'));
      if (nIss) parts.push(nIss + ' theme' + (nIss === 1 ? '' : 's'));
      var sum = parts.join(' · ');
      if (data.teamActive) sum += ' · ' + data.teamActive + ' on My Team active';
      var collapsed = !connOpen;
      var h = '<div class="pdx-eye-conn' + (collapsed ? ' is-collapsed' : '') + '" data-cat="conn">' +
        '<button type="button" class="pdx-eye-conn-h" data-conn-toggle aria-expanded="' + (collapsed ? 'false' : 'true') + '">' +
          '<span class="pdx-eye-conn-eye" aria-hidden="true">◉</span>' +
          '<span class="pdx-eye-conn-t">Your Connections</span>' +
          '<span class="pdx-eye-conn-sum">' + esc(sum) + '</span>' +
          '<span class="pdx-eye-conn-chev" aria-hidden="true">▾</span>' +
        '</button>';
      if (!collapsed) {
        h += '<div class="pdx-eye-conn-body">' +
          '<div class="pdx-eye-conn-lead">The eye traces what you watch — the receipts you’ve saved, grouped the way you tag them and mapped onto the team you’ve built. <b>Open a cluster to follow its threads.</b></div>' +
          '<div class="pdx-eye-conn-map">';
        themes.forEach(function (t) { h += clusterHtml(t, t._id === connSel, !!linked[t._id]); });
        h += '</div>';
        if (sibs.length) {
          h += '<div class="pdx-eye-conn-sib"><span class="pdx-eye-conn-sib-lead"><span class="pdx-eye-conn-thread" aria-hidden="true">↳</span>Shares a Spotlight with your saves</span>';
          sibs.forEach(function (s) {
            var tip = s.tag ? ('From ' + s.from + ' · your “' + s.tag + '” tag') : ('From ' + s.from);
            h += '<button type="button" class="pdx-eye-conn-chip" data-conn-pol="' + esc(s.id) + '" title="' + esc(tip) + '">' + esc(s.name) + '</button>';
          });
          h += '</div>';
        }
        h += '</div>';
      }
      return h + '</div>';
    }
    // One cluster on the map: its theme button (tap to expand), a light teammate
    // preview at rest, and — when open — its receipts, teammates, overlapping
    // clusters and a strip of quick actions.
    function clusterHtml(t, isOpen, isLinked) {
      var isTag = t.kind === 'tag';
      var meta = t.savedCount + ' saved';
      if (t.teamCount) meta += ' · ' + t.teamCount + ' on My Team';
      var scopeIk = isTag ? (t.topIssue || '') : t.key;
      var cls = 'pdx-eye-conn-cl' + (isOpen ? ' is-open' : '') + (isLinked ? ' is-linked' : '');
      var tip = isOpen ? 'Collapse this cluster' : (isTag ? ('Open your “' + t.label + '” tag cluster') : ('Open the ' + t.label + ' cluster'));
      var h = '<div class="' + cls + '" data-cluster="' + esc(t._id) + '">' +
        '<div class="pdx-eye-conn-row">' +
          '<span class="pdx-eye-conn-node" aria-hidden="true"></span>' +
          '<button type="button" class="pdx-eye-conn-theme' + (isTag ? ' pdx-eye-conn-theme--tag' : '') + '" data-conn-cluster="' + esc(t._id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '" title="' + esc(tip) + '">' +
            '<span class="pdx-eye-conn-ico" aria-hidden="true">' + esc(t.icon) + '</span>' +
            '<b>' + esc(t.label) + '</b>' +
            (isTag ? '<span class="pdx-eye-conn-yours">your tag</span>' : '') +
            '<span class="pdx-eye-conn-meta">' + esc(meta) + '</span>' +
            '<span class="pdx-eye-conn-xp" aria-hidden="true">▾</span>' +
          '</button>';
      // At rest, keep a light teammate preview so the map still reads relational
      // when nothing is open (the full roster appears inside the detail).
      if (!isOpen) {
        Object.keys(t.teamIds).slice(0, 3).forEach(function (pid) {
          var d = polRec(pid); if (!d || !d.name) return;
          var chipIssue = scopeIk ? ' data-conn-issue="' + esc(scopeIk) + '"' : '';
          h += '<button type="button" class="pdx-eye-conn-chip" data-conn-pol="' + esc(pid) + '"' + chipIssue + ' title="See where ' + esc(d.name) + ' stands on ' + esc(t.label) + '">' +
            '<span class="pdx-eye-conn-star" aria-hidden="true">★</span>' + esc(d.name) + '</button>';
        });
      }
      h += '</div>'; // row
      if (isOpen) h += clusterDetail(t, scopeIk);
      return h + '</div>'; // cl
    }
    // The expanded body of a cluster: the receipts it holds, the teammates active
    // on it, the other clusters it overlaps, then the quick-action strip.
    function clusterDetail(t, scopeIk) {
      var isTag = t.kind === 'tag';
      var h = '<div class="pdx-eye-conn-detail">';

      // 1 · the actual receipts in this cluster
      var recs = t.items.slice(0, 4);
      if (recs.length) {
        h += '<div class="pdx-eye-conn-sec"><div class="pdx-eye-conn-sec-h"><span class="pdx-eye-conn-thread" aria-hidden="true">↳</span>Receipts here</div><div class="pdx-eye-conn-list">';
        recs.forEach(function (r) {
          h += '<button type="button" class="pdx-eye-conn-rcpt" data-conn-rcpt="' + esc(r.id) + '" title="Open this receipt">' +
            '<span class="pdx-eye-conn-rcpt-ico" aria-hidden="true">' + esc(r.icon) + '</span>' +
            '<span class="pdx-eye-conn-rcpt-tx"><span class="pdx-eye-conn-rcpt-tt">' + esc(r.title) + '</span>' +
            (r.sub ? '<span class="pdx-eye-conn-rcpt-sb">' + esc(r.sub) + '</span>' : '') + '</span></button>';
        });
        if (t.items.length > recs.length) h += '<span class="pdx-eye-conn-rcpt-more">+' + (t.items.length - recs.length) + ' more</span>';
        h += '</div></div>';
      }

      // 2 · teammates active in this cluster
      var tids = Object.keys(t.teamIds);
      if (tids.length) {
        h += '<div class="pdx-eye-conn-sec"><div class="pdx-eye-conn-sec-h"><span class="pdx-eye-conn-thread" aria-hidden="true">↳</span>Teammates on this</div><div class="pdx-eye-conn-list">';
        tids.slice(0, 6).forEach(function (pid) {
          var d = polRec(pid); if (!d || !d.name) return;
          var chipIssue = scopeIk ? ' data-conn-issue="' + esc(scopeIk) + '"' : '';
          h += '<button type="button" class="pdx-eye-conn-chip" data-conn-pol="' + esc(pid) + '"' + chipIssue + ' title="See where ' + esc(d.name) + ' stands on ' + esc(t.label) + '">' +
            '<span class="pdx-eye-conn-star" aria-hidden="true">★</span>' + esc(d.name) + '</button>';
        });
        h += '</div></div>';
      }

      // 3 · related themes / tags this cluster overlaps (shared receipts or teammates)
      if (t._rel && t._rel.length) {
        h += '<div class="pdx-eye-conn-sec"><div class="pdx-eye-conn-sec-h"><span class="pdx-eye-conn-thread" aria-hidden="true">↳</span>Overlaps with</div><div class="pdx-eye-conn-list">';
        t._rel.slice(0, 4).forEach(function (r) {
          var bits = [];
          if (r.sr) bits.push(r.sr + ' receipt' + (r.sr === 1 ? '' : 's'));
          if (r.st) bits.push(r.st + ' teammate' + (r.st === 1 ? '' : 's'));
          h += '<button type="button" class="pdx-eye-conn-rel" data-conn-cluster="' + esc(r.id) + '" data-kind="' + esc(r.kind) + '" title="Jump to ' + esc(r.label) + '">' +
            '<span aria-hidden="true">' + esc(r.icon) + '</span>' + esc(r.label) +
            (bits.length ? '<span class="pdx-eye-conn-rel-share">' + esc(bits.join(' · ')) + '</span>' : '') + '</button>';
        });
        h += '</div></div>';
      }

      // 4 · quick actions — the deep-links out of the map
      h += '<div class="pdx-eye-conn-acts">';
      if (isTag) {
        h += '<button type="button" class="pdx-eye-conn-act pdx-eye-conn-act--primary" data-conn-act="evidence" data-tag="' + esc(t.key) + '"><span class="pdx-eye-conn-act-ico" aria-hidden="true">🗂</span>View in My Evidence</button>';
      } else {
        h += '<button type="button" class="pdx-eye-conn-act pdx-eye-conn-act--primary" data-conn-act="locker" data-issue="' + esc(t.key) + '"><span class="pdx-eye-conn-act-ico" aria-hidden="true">🗄</span>Open Evidence Locker</button>';
      }
      if (scopeIk && tids.length) {
        h += '<button type="button" class="pdx-eye-conn-act" data-conn-act="teammates" data-issue="' + esc(scopeIk) + '"><span class="pdx-eye-conn-act-ico" aria-hidden="true">★</span>See teammates on this</button>';
      }
      if (t._rel && t._rel.length) {
        h += '<button type="button" class="pdx-eye-conn-act" data-conn-act="related" data-target="' + esc(t._rel[0].id) + '"><span class="pdx-eye-conn-act-ico" aria-hidden="true">◈</span>Explore related ' + (t._rel[0].kind === 'tag' ? 'tags' : 'themes') + '</button>';
      }
      h += '</div>';

      return h + '</div>'; // detail
    }
    // hints and its action strip), and a "See more" expander when the ranked
    // list runs deeper.
    function catBlock(catKey, title, color, listAll, renderItem, q, terms) {
      if (!listAll || !listAll.length) return '';
      var cap = expand[catKey] ? listAll.length : 6;
      var shown = listAll.slice(0, cap);
      var h = '<div class="pdx-eye-cat" data-cat="' + catKey + '"><div class="pdx-eye-cat-h"><span class="pdx-eye-cat-dot" style="background:' + color + ';"></span>' + title + '<span class="pdx-eye-cat-n">' + listAll.length + '</span></div>';
      shown.forEach(function (e) { var i = flat.length; flat.push(e); h += wrapRes(i, renderItem(e, q, terms, i), e, q, terms); });
      if (listAll.length > cap) {
        h += '<button type="button" class="pdx-eye-more" data-more="' + catKey + '">See ' + (listAll.length - cap) + ' more ▾</button>';
      }
      return h + '</div>';
    }

    // ── the issue answer ──────────────────────────────────────────────
    // Names are only one kind of question. "Who actually backs housing?",
    // "who's contradictory on immigration", "guns" — all of these name an ISSUE,
    // and sometimes a lens (who delivers / who contradicts). The issue engine
    // parses that, ranks the people on it with the SAME consistency ordering the
    // issue view uses, and hands back rows plus an honest read of how much data
    // there actually is. We render it above the name results, so the answer comes
    // before the list, and every row lands on the receipt itself in one tap.
    // ── THE ISSUE KEY ITSELF, AS THE LEAD ─────────────────────────────────
    // WHAT WAS WRONG. Typed "land preserve", the eye answered with an issue
    // ranking for ⚖️ Practical Stewardship — because that bundle's curated
    // keywords include 'land' — under the heading "ranked by consistency · who
    // backs up their words first", plus a name hit for a member called Landsman.
    // Three things were wrong at once and only one of them was the fuzzy match:
    //   · `lands_preserve` IS a tracked key, with a label, a chip and formal acts
    //     filed against it. It was unreachable as itself, because the issue search
    //     only scans the thirteen bundles and their member keys and no bundle
    //     lists it.
    //   · the ranking that DID answer is the word-vs-action lane. A person with no
    //     stated position on an issue cannot be inconsistent about it, so ordering
    //     an issue by consistency sorts the formal record by whether we happen to
    //     hold a quote — and it says so in the heading, on a query that asked
    //     about a record.
    //   · a person named Landsman is a fine result. It is not the answer to a
    //     question about public lands, and it should not be the first one.
    //
    // WHAT THIS DOES. Asks PDXDoor1 — one resolver, shared with the issue desk's
    // own typeahead, so a hit here opens exactly what the desk opens — whether the
    // query names a tracked key. Where it does, the key leads: its own label, the
    // bundle it does or does not sit inside, how many measures on file map to it,
    // and one door into the record ledger. Person hits stay exactly where they
    // were, below.
    //
    // AND THE CONSISTENCY RANKING DOES NOT RUN ON THIS PATH. Not relabelled —
    // withheld. The block is a real answer to a different question, and a reader
    // who asked what the record on a key did is not served by a second list
    // ordered by something else directly beneath it. The ranking is one tap away
    // through the ledger, which is where the ordering is named honestly.
    // ── AND A WHOLE BUNDLE IS NOT A KEY ───────────────────────────────────
    // One of the thirteen resolves here too — "guns" is a shipped key and a core
    // bundle at once — and it must not be printed as though it were a narrow cut.
    // Two things change on that branch. The lens says it is one of the thirteen
    // instead of claiming it sits in none of them, which is the opposite of true.
    // And the door says DESK, not ledger, because a bundle has no single record to
    // read: the desk opens its inventory and its keys, and which key the reader
    // meant is theirs to say — see the sub-key shelf in door1-workspace.js.
    // The ranked answer below is left standing on that branch, because it is a
    // real answer to a bundle-sized question and nothing else here replaces it.
    // `keyIsBundle` is how that decision reaches the assembly; it is set on every
    // call, so it can never describe a previous query.
    // The issue file's address, asked of the module that owns it. A fallback of
    // '#' rather than a path built here: a wrong address is worse than an inert
    // one, and the click handler below opens the ledger either way.
    function issueFileUrl(key) {
      try {
        var P = window.PDXIssueProfile;
        if (P && typeof P.path === 'function') return P.path(key) || '#';
      } catch (e) {}
      try {
        var F = window.PDXIssueFamily;
        if (F && typeof F.profileUrl === 'function') return F.profileUrl(key) || '#';
      } catch (e) {}
      return '#';
    }
    // ── WHICH KEYS HAVE A FILE AT THAT ADDRESS, AND WHICH DO NOT ──────────
    // WHAT WAS WRONG. Every issue-class row was an anchor on the issue file's
    // own path, family rows included — so tapping Climate, Energy & Land went to
    // /i/climate_energy and nothing usable opened there. The row was promising a
    // destination that does not exist: `climate_energy` is a CORE FAMILY, not a
    // leaf, and the file at that address is a leaf's census.
    //
    // WHAT DECIDES IT NOW, read off the register rather than guessed:
    //   · PUBLISHED. ISSUE_MAP carries a label for the key. Unpublished
    //     scaffolding has no face to print and no file to open.
    //   · NOT ONE OF THE THIRTEEN. A core is a family: its records ARE its member
    //     keys, issueProfileHtml() answers '' for it because there is no single
    //     key to scope a census to, and a core address therefore lands on the
    //     desk's family shelf rather than on a file. Eleven of the thirteen are
    //     not published keys at all; `healthcare` and `election_integrity` are —
    //     and still have no file, because what gives a key a census is having a
    //     parent to be scoped inside, not being published. So coreness is asked
    //     as its own question rather than inferred from publication.
    // A key that fails either test gets NO href and its row is a <button>. A
    // copyable address is a promise about a destination; where there is none the
    // honest control is the one that cannot be copied. The tap is unchanged in
    // both shapes — see navigate('family') and navigate('issuefile').
    function issueFileHref(key) {
      var k = String(key == null ? '' : key).trim();
      if (!k) return '';
      try {
        var IM = window.ISSUE_MAP || {};
        if (!IM[k] || !IM[k].label) return '';
      } catch (e) { return ''; }
      if (isCoreKey(k)) return '';
      var u = issueFileUrl(k);
      return (u && u !== '#') ? u : '';
    }
    // One of the thirteen? The family table owns the answer; the array scan is
    // the fallback for a document served without it, and it reads the same array
    // that table is built from.
    function isCoreKey(k) {
      try {
        var F = window.PDXIssueFamily;
        if (F && typeof F.isCore === 'function') return !!F.isCore(k);
      } catch (e) {}
      try {
        var core = window.CORE_NATIONAL_ISSUES || [];
        for (var i = 0; i < core.length; i++) if (core[i] && core[i].key === k) return true;
      } catch (e) {}
      return false;
    }
    var keyIsBundle = false;
    function issueKeyBlock(q) {
      keyIsBundle = false;
      var D = window.PDXDoor1;
      if (!D || typeof D.issueKeyFor !== 'function') return '';
      var key = '';
      try { key = D.issueKeyFor(q) || ''; } catch (e) { return ''; }
      if (!key) return '';
      var label = key;
      try { if (typeof D.issueLabelFor === 'function') label = D.issueLabelFor(key) || key; } catch (e) {}
      // Which bundle carries it, said honestly in all three cases: the key IS one
      // of the thirteen, the key sits inside one of them, or the key sits inside
      // none — and the last of those is not a gap in the record.
      var parent = '', inside = 0;
      try {
        (window.CORE_NATIONAL_ISSUES || []).forEach(function (c) {
          if (!c) return;
          if (c.key === key) { keyIsBundle = true; inside = (c.keys || []).length; }
          if (!parent && !keyIsBundle && (c.keys || []).indexOf(key) >= 0) parent = c.label || '';
        });
      } catch (e) {}
      var m = 0;
      try { m = (typeof D.issueMeasures === 'function' ? (D.issueMeasures(key) || []) : []).length; } catch (e) { m = 0; }
      var lens = keyIsBundle
        ? esc(key) + ' · one of the thirteen' + (inside ? ' · ' + inside + ' keys inside it' : '')
        : esc(key) + (parent ? ' · inside ' + esc(parent) : ' · in none of the thirteen bundles');
      var say = keyIsBundle
        ? 'A bundle, not a single key. The desk opens its inventory and the keys ' +
          'filed under it; pick one and the record on it is read out — who advanced ' +
          'it, who cut against it, who ran both ways.'
        : 'Who advanced it, who cut against it, who ran both ways, and who ' +
          'only touched it inside a larger measure — read off the formal record only.' +
          (m ? ' <b>' + m + '</b> measure' + (m === 1 ? '' : 's') + ' on file map here.' : '');
      return '<div class="pdx-eye-ans pdx-eye-key" data-eye-key="' + esc(key) + '">' +
        '<div class="pdx-eye-ans-h">' +
          '<span class="pdx-eye-ans-ico" aria-hidden="true">🏛</span>' +
          '<span class="pdx-eye-ans-ht">' +
            '<span class="pdx-eye-ans-eyebrow">Tracked issue · the formal record</span>' +
            '<span class="pdx-eye-ans-title">' + esc(label) + '</span>' +
            '<span class="pdx-eye-ans-lens">' + lens + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="pdx-eye-key-say">' + say + '</div>' +
        '<div class="pdx-eye-ans-foot">' +
          // ── AND NOW IT HAS AN ADDRESS ────────────────────────────────────
          // An <a> rather than a <button>, on /i/<key>. The TAP is unchanged:
          // the delegated handler still preventDefaults and opens in place
          // through window.pdxDoor1Issue, so nothing about this control got
          // slower or reloaded the page. What the element gains is the thing a
          // button cannot have — a real destination. A reader can copy the
          // link, open it in a new tab, or middle-click it, and the address they
          // get is the issue's own file rather than "wherever the Eye was open".
          // The address is asked of PDXIssueProfile so this file spells no path
          // of its own; the bundle branch gets the same address, because
          // /i/<coreKey> opens the desk's inventory and its key shelf, which is
          // exactly what this button has always promised for one of the thirteen.
          // That last clause is only true because pdx-issue-profile.js's arrival
          // now HANDLES a core id — it mounts no empty file, opens the desk on
          // the family and says it is a family of N keys rather than a file. This
          // control keeps its address for copy, new-tab and middle-click; the
          // family ROW below has no address, because a row is a destination and
          // there is no file at /i/<coreKey> to be one. See WHICH KEYS HAVE A
          // FILE AT THAT ADDRESS, AND WHICH DO NOT.
          '<a class="pdx-eye-ans-btn pdx-eye-ans-btn--primary" href="' +
            esc(issueFileUrl(key)) + '" data-eye-key-go="' + esc(key) + '">' +
            '<span aria-hidden="true">🏛</span>' +
            (keyIsBundle ? 'Open the issue desk' : 'Open the record ledger') +
          '</a>' +
        '</div>' +
      '</div>';
    }

    var lastAnswer = null;
    function answerBlock(q) {
      lastAnswer = null;
      if (!window.PDXIssueView || typeof window.PDXIssueView.answer !== 'function') return '';
      var a = null;
      try { a = window.PDXIssueView.answer(q, 3); } catch (e) { return ''; }
      if (!a) return '';
      lastAnswer = a;

      var lens = a.mode === 'consistent' ? 'Ranked by consistency · who backs their words with action'
        : a.mode === 'contradiction' ? 'Ranked by consistency · documented say-vs-do gaps first'
        : 'Ranked by consistency · who backs up their words first';
      if (a.state) lens += ' · ' + esc(a.state) + ' + national';

      var h = '<div class="pdx-eye-ans" data-ans="1">' +
        '<div class="pdx-eye-ans-h">' +
          '<span class="pdx-eye-ans-ico" aria-hidden="true">' + esc(a.icon || '🎯') + '</span>' +
          '<span class="pdx-eye-ans-ht">' +
            '<span class="pdx-eye-ans-eyebrow">Issue answer</span>' +
            '<span class="pdx-eye-ans-title">' + esc(a.label) +
              (a.parentLabel ? ' <span style="color:#8aa0c0;font-weight:400;">· in ' + esc(a.parentLabel) + '</span>' : '') +
            '</span>' +
            '<span class="pdx-eye-ans-lens">' + lens + '</span>' +
          '</span>' +
        '</div>';

      // Honest coverage first — a thin issue says so before it shows a short list.
      // The note is built (and escaped) by the coverage engine, so it goes in as HTML.
      var note = '';
      try { note = window.PDXIssueView.coverageNote(a.coverage, a.label) || ''; } catch (e) {}
      if (note) h += '<div class="pdx-eye-ans-cov pdx-eye-ans-cov--' + esc(a.coverage.level) + '">' + note + '</div>';
      // When a lens or a local scope found nothing, we widened rather than showing
      // an empty wall — and we say which.
      if (a.scopeFellBack) h += '<div class="pdx-eye-ans-cov">No one from <b>' + esc(a.state || 'your state') + '</b> is documented on this yet — showing everywhere.</div>';
      if (a.modeFellBack) {
        h += '<div class="pdx-eye-ans-cov">' + (a.mode === 'contradiction'
          ? 'No documented contradictions on <b>' + esc(a.label) + '</b> yet — showing the full ranking.'
          : 'Nobody has been checked as backing this up yet — showing the full ranking.') + '</div>';
      }

      a.rows.forEach(function (r, i) {
        // Why this row is here, in the strongest evidence it has: a verified receipt
        // first, then the roll call that decided the verdict, then what they merely
        // said. Vote text is assembled from record fields only.
        var why = r.topHeadline || '';
        if (!why && r.voteCite) {
          var vc = r.voteCite;
          var pos = String(vc.position || '').toLowerCase();
          var isVote = vc.kind !== 'position';
          var verb = pos === 'yea' ? 'Voted yes' : pos === 'nay' ? 'Voted no'
            : pos === 'present' ? 'Voted present' : pos === 'not_voting' ? 'Did not vote'
            : (!isVote && vc.action) ? vc.action : 'Voted';
          // "Voted no ON H.R. 3", but "Cosponsored H.R. 3" — a formal action already
          // carries its own preposition.
          why = verb + (isVote ? ' on ' : ' ') + (vc.number || vc.title || 'a measure') +
            (vc.verdict === 'contradicts' ? ' — against their stated position' : ' — in line with what they said');
        }
        if (!why && r.stanceWord) why = r.stanceWord + ' ' + r.stanceText;
        var hasReceipt = !!(r.topReceiptPid && r.receiptCount);
        var hasVote = !hasReceipt && !!(r.voteCite && r.voteCite.measureId != null);
        h += '<button type="button" class="pdx-eye-ans-row" data-ans-row="' + i + '">' +
          '<span class="pdx-eye-ans-rank" aria-hidden="true">' + (i + 1) + '</span>' +
          '<span class="pdx-eye-ans-body">' +
            '<span class="pdx-eye-ans-name">' + esc(r.name) + (r.party ? ' <span style="color:' + esc(r.party.color) + ';">· ' + esc(r.party.label) + '</span>' : '') + '</span>' +
            '<span class="pdx-eye-ans-v pdx-eye-ans-v--' + esc(r.tierKey) + '">' + esc(r.tier.ico + ' ' + r.tier.label) + '</span>' +
            (why ? '<span class="pdx-eye-ans-why">' + esc(why) + '</span>' : '') +
          '</span>' +
          '<span class="pdx-eye-ans-go">' + (hasReceipt ? '🧾 Receipt' : hasVote ? '🗳 Vote' : 'Profile') + ' →</span>' +
        '</button>';
      });

      h += '<div class="pdx-eye-ans-foot">' +
        '<button type="button" class="pdx-eye-ans-btn pdx-eye-ans-btn--primary" data-ans-act="ranking">' +
          '<span aria-hidden="true">🧭</span>See all ' + a.total + (a.total === 1 ? ' person' : ' people') + ' ranked' +
        '</button>' +
        (a.parentLabel ? '<button type="button" class="pdx-eye-ans-btn" data-ans-act="widen"><span aria-hidden="true">⤢</span>Widen to ' + esc(a.parentLabel) + '</button>' : '') +
        '<button type="button" class="pdx-eye-ans-btn" data-ans-act="link"><span aria-hidden="true">🔗</span>Copy link</button>' +
      '</div>';

      return h + '</div>';
    }
    // Open the ranked issue view, falling back to the Evidence Locker where the
    // issue module hasn't loaded.
    function openRanking(coreKey, opts) {
      close();
      if (window.PDXIssueView && typeof window.PDXIssueView.open === 'function') { window.PDXIssueView.open(coreKey, opts || {}); return; }
      if (typeof window._pdxOpenEvidenceLocker === 'function' && coreKey) { window._pdxOpenEvidenceLocker({ issue: coreKey }); return; }
      var ht = document.getElementById('hot-topics'); if (ht) ht.scrollIntoView({ behavior: 'smooth' });
    }
    // Question starters for the resting state — the eye teaching that it answers
    // questions, not just names. Built from the issues that actually have the most
    // documentation, so a starter never lands on an empty ranking.
    // ── Claim check ───────────────────────────────────────────────────────
    // The eye has always accepted a pasted sentence — there is no maxlength on
    // the field — but it scores one as a name/keyword query, so a claim lands
    // only via whoever it happens to name. This hands paste-shaped input to
    // window.PDXClaimCheck (claim-check.js), which resolves it to a
    // (politician, issue) address and renders the receipt receipt-cards.js
    // already builds.
    //
    // Two properties are load-bearing and both are structural rather than
    // conventional: it returns '' for anything that is not paste-shaped, so a
    // short name or issue search is byte-for-byte what it was; and the whole
    // call is guarded, so the eye behaves exactly as before if claim-check.js
    // is absent or throws.
    function claimBlock(q) {
      try {
        if (!window.PDXClaimCheck || typeof window.PDXClaimCheck.blockHtml !== 'function') return '';
        return window.PDXClaimCheck.blockHtml(q) || '';
      } catch (e) { return ''; }
    }

    function askBlock() {
      if (!window.PDXIssueView || typeof window.PDXIssueView.coverage !== 'function') return '';
      var list = [];
      try {
        (window.CORE_NATIONAL_ISSUES || []).forEach(function (ci) {
          if (!ci || !ci.key) return;
          var cov = window.PDXIssueView.coverage(ci.key);
          if (!cov || !cov.checked) return;
          list.push({ key: ci.key, label: stripEmoji(ci.label) || ci.label, n: cov.checked });
        });
      } catch (e) { return ''; }
      if (!list.length) return '';
      list.sort(function (a, b) { return b.n - a.n; });
      var qs = [];
      if (list[0]) qs.push('Who actually backs ' + list[0].label.toLowerCase() + '?');
      if (list[1]) qs.push("Who's contradictory on " + list[1].label.toLowerCase() + '?');
      if (list[2]) qs.push('Who delivers on ' + list[2].label.toLowerCase() + '?');
      var chips = qs.map(function (q) {
        return '<button type="button" class="pdx-eye-ask-chip" data-ask="' + esc(q) + '">' +
          '<span class="pdx-eye-ask-ico" aria-hidden="true">❓</span>' + esc(q) + '</button>';
      }).join('');
      return '<div class="pdx-eye-cat" data-cat="ask"><div class="pdx-eye-cat-h">' +
        '<span class="pdx-eye-cat-dot" style="background:#f5c842;"></span>Ask a question</div>' +
        '<div class="pdx-eye-ask">' + chips + '</div></div>';
    }
    function runAnswerAction(id) {
      var a = lastAnswer;
      if (!a) return;
      if (id === 'ranking') { openRanking(a.coreKey, { focusKey: a.focusKey, mode: a.mode, scope: a.scope }); return; }
      if (id === 'widen') { openRanking(a.coreKey, { mode: a.mode, scope: a.scope }); return; }
      if (id === 'link') {
        var url = a.link || '';
        if (!url) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              if (typeof window._showToast === 'function') window._showToast('Link copied — it opens this ranking ✓');
            });
            return;
          }
        } catch (e) {}
        if (typeof window._showToast === 'function') window._showToast(url);
      }
    }
    // A row in the answer opens the strongest evidence behind it — the shortest path
    // from a question to the sourced proof: a receipt where one exists, otherwise the
    // measure the deciding vote was cast on, otherwise the profile.
    function openAnswerRow(i) {
      var a = lastAnswer;
      if (!a || !a.rows[i]) return;
      var r = a.rows[i];
      if (r.topReceiptPid && r.receiptCount && window.PDXReceipts && typeof window.PDXReceipts.open === 'function') {
        close();
        window.PDXReceipts.open(r.topReceiptPid, r.topReceiptIssue || a.focusKey || '');
        return;
      }
      if (r.voteCite && r.voteCite.measureId != null && window.PDXBillDetail && typeof window.PDXBillDetail.open === 'function') {
        close();
        window.PDXBillDetail.open(String(r.voteCite.measureId));
        return;
      }
      navigate('pol', { id: r.id });
    }

    function render(q) {
      var data = getIndex();
      curCtx = personalContext();   // who this eye belongs to, refreshed each render
      flat = [];
      var html = '';
      // The claim check gets the text AS TYPED. Everything below runs on the
      // lowercased form, which is right for matching and wrong for a claim: a
      // resolver reads "Mike Lee" better than "mike lee", and the block prints
      // the reader's own words back to them.
      var rawQ = String(q == null ? '' : q).trim();
      q = norm(q).trim();
      // Which lanes have not finished loading. Read ONCE per paint, so the notice,
      // the per-lane rows and the recheck timer cannot disagree about it.
      var warm = warmingLanes();
      // Reset on a NEW QUERY only. Switching lane re-renders the same string, so
      // curQ matches and an expanded category survives the switch — the reader's
      // question did not change, only which lane of it they are reading.
      if (q !== curQ) { expand = { pol: false, stance: false, bill: false, file: false, fam: false, spot: false, mand: false, saved: false, team: false }; curQ = q; }
      var isMandate = (laneMode === 'mandate');

      if (!q) {
        // Empty, focused state — a calm invitation, the visitor's saved
        // collection (retrievable any time the eye opens), then a few Hot Topics.
        var suggest = data.issues.filter(function (x) { return x.kind === 'spotlight'; }).slice(0, 4);
        // THE CONTROL IS PRINTED BEFORE A WORD IS TYPED, because a lane the reader
        // cannot see is a lane they cannot pick, and the Mandate lane is the one
        // most likely to be what they came for. No counts: nothing has been
        // searched yet, and a zero here would be a claim about a query that does
        // not exist.
        html += laneModeBar(null);
        // THE MANDATE LANE'S OWN OPENING SHELF. It does NOT fall through to the
        // shared invitation, and that is deliberate: every block below \u2014 the
        // ask-a-question chips, the personal map, My Saved, From My Team, Explore
        // Hot Topics \u2014 is built out of people, receipts and Spotlights, so
        // showing any of them here would put formal and public rows in the mandate
        // lane on the very first paint. Instead the lane opens with the reforms
        // themselves, or, where the bridge indexed none, with the locked sentence.
        if (isMandate) {
          html += '<div class="pdx-eye-empty">The People\u2019s Mandate, as filed. <b>A mandate is a proposed vehicle</b> \u2014 not a vote and not a quote.</div>';
          html += (data.mandates || []).length
            ? catBlock('mand', 'People\u2019s Mandate \u00b7 proposed vehicles', '#c4b5fd', data.mandates || [], mandateItem, '', [])
            : mandateEmptyHtml();
          html += hintBar();
          panel.innerHTML = html;
          wire();
          scheduleWarmRecheck(warm.length > 0);
          return flat.length;
        }
        html += '<div class="pdx-eye-empty">The eye is open. <b>Ask a question or search politicians, issues &amp; hot topics</b> — then save what matters.</div>';
        html += askBlock();
        html += connectionsBlock();
        html += savedBlock();
        html += teamBlock();
        if (suggest.length) {
          html += '<div class="pdx-eye-cat"><div class="pdx-eye-cat-h"><span class="pdx-eye-cat-dot" style="background:#fb923c;"></span>Explore Hot Topics</div>';
          suggest.forEach(function (e) { var i = flat.length; flat.push(e); html += wrapRes(i, issueItem(e, '', [], i), e, '', []); });
          html += '</div>';
        }
        html += hintBar();
        panel.innerHTML = html;
        wire();
        scheduleWarmRecheck(warm.length > 0);
        return flat.length;
      }

      var terms = q.split(/\s+/).filter(Boolean);
      var LIM = 30; // rank deep enough to power "See more"; the cap of 6 is applied per category
      var pols = rank(data.people, q, terms, LIM, curCtx);
      var sts  = rank(data.stances || [], q, terms, LIM, curCtx);
      var bls  = rank(data.bills || [], q, terms, LIM, curCtx);
      // Three lists where there was one. Both modes are ranked on every paint,
      // because the toggle prints the OTHER lane's count and a number nobody
      // computed is a number that would be wrong.
      var fils = rank(data.files || [], q, terms, LIM, curCtx);
      var fams = rank(data.families || [], q, terms, LIM, curCtx);
      var spots = rank(data.issues || [], q, terms, LIM, curCtx);
      // Four lists now, and the mandate list is ranked on every paint for the same
      // reason the other lanes are: the control prints the other lanes' counts,
      // and a number nobody computed is a number that would be wrong.
      var mands = rank(data.mandates || [], q, terms, LIM, curCtx);
      var formal = (laneMode === 'formal');
      // FORMAL PUTS THE RECORD-HOLDERS FIRST, inside the roster's own relevance
      // order. A stable partition, not a score and not a party term: a person
      // with nothing on file keeps their place relative to the others and stays
      // findable by name, which is why a name search never breaks in this mode.
      if (formal) pols = formalFirst(pols);
      // The issue answer is computed first: a question phrased in words nobody is
      // named after ("who actually backs housing?") can answer even when the
      // name/stance/bill ranking finds nothing at all.
      // The issue key leads where the query names one, and the consistency ranking
      // stands down on that path rather than being relabelled. See the wall above.
      var keyHtml = issueKeyBlock(q);
      // `keyIsBundle` no longer gates anything in the assembly — it decides the
      // key block's OWN lens and door copy, and the ranking it used to keep alive
      // on a bundle query is gone from this lane entirely (see below), so there
      // is nothing left for a "was a key found" flag to stand down for.
      // AN /i/ FILE ROW DOES NOT APPEAR IN PUBLIC MODE, and the lead block is one
      // — the whole block is the issue's file, in the file's own words, with the
      // file's own door. Withheld rather than reworded.
      if (!formal) keyHtml = '';
      // ── THE CONSISTENCY RANKING IS NOT A FORMAL ANSWER ───────────────────
      // WHAT WAS WRONG. Formal led with the Issue Answer — "Climate, Energy &
      // Land · Ranked by consistency · who backs up their words first", party
      // letters down the rows and "See all 882 people ranked" under them — on a
      // query that asked what the record did. That block is the WORD-VS-ACTION
      // lane: a person with no stated position on an issue cannot be inconsistent
      // about it, so ordering an issue by consistency sorts the formal record by
      // whether we happen to hold a quote. It was withheld on a narrow key already
      // and KEPT on a bundle, which is how a family query ended up answered by a
      // ranking of people.
      //
      // It is withheld in this lane outright now. Not relabelled, not reordered,
      // not conditioned on what the query resolved to: the formal lane's order is
      // issue files → the families they sit in → people with a formal row →
      // measures, and a reading of who backs up their words is not one of those
      // four. The ranking still exists and is still one tap away — through the key
      // block's own door, and through the Public lane, where the heading names its
      // ordering honestly and the reader chose that lane.
      //
      // AND NEITHER BLOCK APPEARS IN THE MANDATE LANE AT ALL. The key block is an
      // issue file row; the ranked answer is a word-vs-action reading of the
      // roster. Both are answers about a record, and this lane's document has none.
      var ansHtml = (isMandate || formal) ? '' : answerBlock(q);
      // The claim block goes ABOVE both, and is also the reason the no-match
      // branch is no longer a dead end: a pasted claim frequently ranks nothing
      // (every term-in-hay check fails on a sentence) while still being the one
      // input this surface can now actually answer.
      var claimHtml = claimBlock(rawQ);
      // What each lane holds for THIS query. The toggle prints both, so a reader
      // in the wrong lane is told where their answer is instead of being told
      // there isn't one. People are counted in both because a name is a name in
      // either lane; the number is a reachability figure, not a share of anything.
      // NO MANDATE HEADCOUNT IN A FORMAL DENOMINATOR: the mandate hits are their
      // own slot and are added to neither of the other two, so nothing the formal
      // lane counts \u2014 here, or in formalPatternIndex, Direction Match and Word
      // vs Action \u2014 grows by one because a reform was filed.
      var laneCounts = {
        formal: fils.length + fams.length + pols.length + bls.length,
        'public': spots.length + sts.length + pols.length,
        mandate: mands.length
      };
      // "Nothing else" is now a claim about the VISIBLE lane. It has to be, or the
      // panel would deny a query in public mode because the answer is formal.
      // In the mandate lane the ONLY thing that can answer is a reform, so a
      // person hit does not count as "something": a name that ranks no reform
      // still prints the lane's own empty sentence.
      var nothingElse = isMandate
        ? !mands.length
        : (!keyHtml && !ansHtml && !pols.length &&
            (formal ? (!fils.length && !fams.length && !bls.length)
                    : (!spots.length && !sts.length)));

      // THE ONE PLACE "FINDS NOTHING" IS ALLOWED. Nothing ranked, nothing was
      // asked as a claim, and no lane is still loading: every lane is ready and
      // every lane came back empty, so the record genuinely does not hold this.
      // While ANY lane is warming the same zero is reported as what it actually is.
      if (!claimHtml && nothingElse) {
        // The toggle survives an empty lane, and it is the whole reason this is not
        // a dead end: a bill number typed in public mode lands here with "Formal
        // record 1" printed an inch above the denial.
        // The mandate lane's empty state is its own locked sentence — not the
        // panel's generic denial, and not a warming notice: the mandate list is
        // inline and never fetched, so it is never "still loading". Empty here
        // means the record genuinely holds no reform for this search.
        // AND THE NOTICE NAMES THE CATEGORY, NOT JUST THE WAIT. A reader who
        // typed a measure number wants to know that the MEASURES are still
        // loading; a reader who typed an issue wants to know that about the
        // register. The panel sentence lists the lanes in prose, and under it
        // each warming category this lane prints gets the same titled row it
        // gets when something else ranked — so the group the answer will appear
        // in is already on screen, holding a loading line instead of a zero.
        panel.innerHTML = laneModeBar(laneCounts, warm) + (isMandate
          ? mandateEmptyHtml()
          : (warm.length
            ? warmPanel(warm) + warmStrip(warm, {})
            : '<div class="pdx-eye-empty">The eye finds nothing for “<b>' + esc(q) + '</b>”.<br>Try a name, an office, a state, an issue, or a bill number.</div>'));
        wire();
        scheduleWarmRecheck(warm.length > 0);
        return 0;
      }

      html += laneModeBar(laneCounts, warm);
      html += claimHtml;
      // A claim that ranked nothing still gets the honest note under its block,
      // so the reader is not left wondering whether the search silently failed.
      if (nothingElse) {
        html += isMandate
          ? mandateEmptyHtml()
          : (warm.length
            ? warmPanel(warm)
            : '<div class="pdx-eye-empty">Nothing else matched “<b>' + esc(q) + '</b>” as a search.<br>Try a name, an office, a state, an issue, or a bill number.</div>');
      }
      html += keyHtml;
      html += ansHtml;
      // ── THE GROUPS, IN THE ORDER THE LANE ASKS FOR ──────────────────────
      // Every group is LABELLED for what it is, which is the other half of the
      // fix: "Issues & Hot Topics" was one heading over four kinds of record, so
      // no label in it could be true. Formal reads files, then the families they
      // sit in, then the roster, then the measures. Public reads the
      // investigations, then what people said, then the people.
      // Mandate reads one group and only one, labelled for the document it holds.
      // No people group in it: a person is a formal or a public row, and a reform
      // is neither, so pairing them under one control state would put back the
      // exact confusion this lane exists to end.
      if (isMandate) {
        html += catBlock('mand', 'People\u2019s Mandate \u00b7 proposed vehicles', '#c4b5fd', mands, mandateItem, q, terms);
      } else if (formal) {
        html += catBlock('file', 'Issue files · the formal record', '#7dd3fc', fils, issueFileItem, q, terms);
        html += catBlock('fam', 'Issue families · browse from here', '#fb923c', fams, familyItem, q, terms);
        html += catBlock('pol', 'Politicians · formal record first', '#f5c842', pols, polItem, q, terms);
        html += catBlock('bill', 'Legislation &amp; Bills', '#9ff0bd', bls, billItem, q, terms);
      } else {
        html += catBlock('spot', 'Issue Spotlights · sourced investigations', '#fb923c', spots, issueItem, q, terms);
        html += catBlock('stance', 'Positions, Quotes &amp; Receipts', '#5eead4', sts, stanceItem, q, terms);
        html += catBlock('pol', 'Politicians', '#f5c842', pols, polItem, q, terms);
      }
      // A lane that is still loading AND has nothing to show says so, in the lane's
      // own slot. Without this a half-warm index reads as a complete answer: the one
      // person who matched "6644" would look like the whole of the record's reply.
      // Counted across BOTH modes: the question here is whether the source has
      // arrived, and hiding a Spotlight is not the same as not having loaded one.
      // The warming strip is a formal/public instrument: it reports on the roster,
      // the measures and the issue library, all of which arrive asynchronously.
      // The mandate list is inline and complete on the first paint, so this lane
      // has nothing to be waiting for and prints no notice about it.
      if (!isMandate) {
        html += warmStrip(warm, {
          pol: pols.length, stance: sts.length, bill: bls.length,
          file: fils.length, fam: fams.length, spot: spots.length
        });
      }
      html += hintBar();
      panel.innerHTML = html;
      wire();
      scheduleWarmRecheck(warm.length > 0);
      return flat.length;
    }
    // ── WARMING, IN WORDS ─────────────────────────────────
    // Two shapes, because a cold index shows up two different ways. When NOTHING
    // ranked at all the whole panel is the notice, and it names which lanes are
    // still coming so the reader knows what the wait buys them. When something
    // DID rank — a person matched while the measures list was still paging — the
    // notice is a row inside the lane that has not answered yet, in the same
    // position and the same house style as the results it will be replaced by, so
    // the reader can see that a lane exists and is still working rather than
    // concluding it holds nothing.
    function laneList(lanes) {
      var w = lanes.map(function (l) { return LANE_NOUNS[l] || l; });
      if (w.length <= 1) return w[0] || '';
      return w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1];
    }
    function warmPanel(lanes) {
      return '<div class="pdx-eye-empty pdx-eye-warm" role="status" aria-live="polite">' +
        '<span class="pdx-eye-warm-dot" aria-hidden="true"></span>' +
        '<b>Searching the record…</b>' +
        '<span class="pdx-eye-warm-sub">' + esc(laneList(lanes)) + ' ' +
          (lanes.length === 1 ? 'is' : 'are') + ' still loading. Results appear as they arrive.</span>' +
      '</div>';
    }
    function warmRow(lane) {
      return '<div class="pdx-eye-cat" data-cat="warm" data-warm-lane="' + esc(lane) + '">' +
        '<div class="pdx-eye-cat-h"><span class="pdx-eye-cat-dot" style="background:' + (LANE_DOTS[lane] || '#8aa0c0') + ';"></span>' +
          esc(LANE_TITLES[lane] || lane) + '</div>' +
        '<div class="pdx-eye-warmrow" role="status" aria-live="polite">' +
          '<span class="pdx-eye-warm-dot" aria-hidden="true"></span>Searching the record…' +
        '</div>' +
      '</div>';
    }
    // Which result categories the VISIBLE lane can print. A warming row for a
    // category this lane does not render would report a wait the reader is not
    // on: a cold measures index is no part of what the Public lane answers with.
    var MODE_CATS = {
      formal: ['file', 'fam', 'pol', 'bill'],
      'public': ['spot', 'stance', 'pol'],
      mandate: []
    };
    function laneShown(lane) {
      var cats = MODE_CATS[laneMode] || [];
      for (var i = 0; i < cats.length; i++) { if (CAT_LANE[cats[i]] === lane) return true; }
      return false;
    }
    // The warming rows for the lanes that are BOTH still loading and currently
    // empty. A lane that already produced hits does not get a row: the hits are a
    // better report on that lane than a spinner is. A lane this mode does not
    // print does not get one either.
    function warmStrip(lanes, hits) {
      return lanes.filter(laneShown).filter(function (l) {
        var n = 0;
        for (var cat in CAT_LANE) { if (CAT_LANE[cat] === l) n += (hits[cat] || 0); }
        return n === 0;
      }).map(warmRow).join('');
    }
    // A warming panel has to resolve without being touched. The eye re-renders when
    // a source announces itself, but nothing announces the DEADLINE, and nothing
    // announces a bundle that will never arrive. So a painted warming state checks
    // back on itself, and stops the moment no lane is warming — which laneReady()'s
    // ceiling guarantees will happen, so this poll is bounded by the deadline rather
    // than by the network.
    var warmTimer = 0;
    function scheduleWarmRecheck(isWarm) {
      if (warmTimer) { try { clearTimeout(warmTimer); } catch (e) {} warmTimer = 0; }
      if (!isWarm) return;
      try {
        warmTimer = setTimeout(function () {
          warmTimer = 0;
          if (eye.classList.contains('is-open')) render(input.value);
        }, 420);
      } catch (e) {}
    }
    function hintBar() {
      return '<div class="pdx-eye-hint"><span class="pdx-eye-kbd">↑</span><span class="pdx-eye-kbd">↓</span> move &nbsp;·&nbsp; <span class="pdx-eye-kbd">→</span> actions &nbsp;·&nbsp; <span class="pdx-eye-kbd">↵</span> open &nbsp;·&nbsp; <span class="pdx-eye-kbd">esc</span> close</div>';
    }

    // ── activation / navigation ───────────────────────────────────────
    // Navigate from a related-connection chip (which carries its target in data
    // attributes). Result rows go through activateEntry(flat[i]) instead.
    function activate(el) {
      if (!el) return;
      var kind = el.getAttribute('data-kind');
      if (kind === 'pol') navigate('pol', { id: el.getAttribute('data-id') });
      else if (kind === 'spotlight') navigate('spotlight', { slug: el.getAttribute('data-slug') });
      else if (kind === 'issue') navigate('issue', { key: el.getAttribute('data-key') });
      else if (kind === 'family') navigate('family', { key: el.getAttribute('data-key') });
      else if (kind === 'issuefile') navigate('issuefile', { key: el.getAttribute('data-key') });
    }
    function entryAt(el) {
      var res = el && el.closest ? el.closest('.pdx-eye-res') : null;
      if (!res) return null;
      var i = parseInt(res.getAttribute('data-i'), 10);
      return isNaN(i) ? null : flat[i];
    }
    function wire() {
      // Each result lives in a .pdx-eye-res wrapper: the row opens it, the action
      // strip (revealed on focus/hover) runs a command without leaving the eye.
      panel.querySelectorAll('.pdx-eye-res').forEach(function (res) {
        var i = parseInt(res.getAttribute('data-i'), 10);
        res.addEventListener('mouseenter', function () { setActive(i); });
        var item = res.querySelector('.pdx-eye-item');
        if (item) {
          // Keep input focus — but only for the primary button, so a middle click
          // is left intact for the browser to open in a new tab.
          item.addEventListener('mousedown', function (ev) {
            if (typeof ev.button !== 'number' || ev.button === 0) ev.preventDefault();
          });
          item.addEventListener('click', function (ev) {
            // A person row is now an <a href="/p/<pid>">. A ⌘/Ctrl/Shift-click or a
            // middle click is the reader asking the browser for a new tab: the eye
            // stays open, nothing is activated, and the href does the work. A plain
            // click is the eye's, and preventing the default here is what tells
            // person-link.js's delegated listener that this one is already handled.
            var PL = window.PDXPersonLink;
            if (PL && typeof PL.isBrowserNav === 'function' && PL.isBrowserNav(ev)) return;
            if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
            activateEntry(flat[i]);
          });
        }
        res.querySelectorAll('.pdx-eye-act').forEach(function (btn) {
          btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
          btn.addEventListener('click', function (ev) { ev.stopPropagation(); runAction(flat[i], btn.getAttribute('data-act')); });
        });
      });
      // The issue answer — a row jumps straight to its receipt; the footer opens
      // the full ranking or copies the shareable deep link.
      panel.querySelectorAll('.pdx-eye-ans-row').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openAnswerRow(parseInt(el.getAttribute('data-ans-row'), 10) || 0);
        });
      });
      // The issue-key door: into Door 1's issue mode on that key, through the
      // desk's own entry point so the pick is recorded and the record warmed
      // exactly as it is when the chip is tapped on the desk itself.
      panel.querySelectorAll('[data-eye-key-go]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          // The control is an anchor on /i/<key> now, so the default action is a
          // full navigation to that address. It is a correct destination and a
          // deliberately unused one: the desk is already on this page and
          // pdxDoor1Issue opens the same ledger without a reload. So the tap is
          // consumed here and the href is left for copy, new-tab and middle-click
          // — the three things a button could not offer. A modified click is NOT
          // intercepted, because a reader holding ⌘ or ctrl has asked for the tab.
          if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
          ev.preventDefault();
          var key = el.getAttribute('data-eye-key-go') || '';
          close();
          try { if (typeof window.pdxDoor1Issue === 'function') window.pdxDoor1Issue(key); } catch (e) {}
        });
      });
      panel.querySelectorAll('[data-ans-act]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) { ev.stopPropagation(); runAnswerAction(el.getAttribute('data-ans-act')); });
      });
      // Question starters — fill the box and answer immediately.
      panel.querySelectorAll('[data-ask]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          input.value = el.getAttribute('data-ask') || '';
          try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { render(input.value); }
          try { input.focus(); } catch (e) {}
          setActive(-1);
        });
      });
      // Related connection chips — navigate to the linked person / issue / spotlight.
      panel.querySelectorAll('.pdx-eye-rel-chip').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) { ev.stopPropagation(); activate(el); });
      });
      // ── THE LANE TOGGLE ──────────────────────────────────────────────
      // The query string is NOT touched: input.value is re-rendered as it stands,
      // so curQ matches, `expand` survives, and the box still says what the reader
      // typed. Only laneMode moved.
      panel.querySelectorAll('[data-eye-lane]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var m = el.getAttribute('data-eye-lane') || '';
          if (!isLaneMode(m) || m === laneMode) return;
          laneMode = m;
          render(input.value);
          setActive(-1);
          try { input.focus(); } catch (e) {}
        });
      });
      // "See more" — expand that category in place, keeping the query and focus.
      panel.querySelectorAll('.pdx-eye-more').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var cat = el.getAttribute('data-more');
          if (cat) expand[cat] = true;
          render(input.value);
          setActive(-1);
        });
      });
      // Personal map ("Your Connections") — collapse toggle + its cross-links.
      panel.querySelectorAll('[data-conn-toggle]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) { ev.stopPropagation(); connOpen = !connOpen; render(input.value); setActive(-1); });
      });
      // A cluster theme (or an "overlaps with" chip) → expand it in place. A
      // single open cluster keeps the map calm; re-opening the same one closes it.
      panel.querySelectorAll('[data-conn-cluster]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var id = el.getAttribute('data-conn-cluster') || '';
          connSel = (connSel === id) ? '' : id;
          render(input.value); setActive(-1);
        });
      });
      // A saved receipt inside an expanded cluster → open it.
      panel.querySelectorAll('[data-conn-rcpt]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          connOpenReceipt(connReceiptById(el.getAttribute('data-conn-rcpt') || ''));
        });
      });
      // Quick actions inside an expanded cluster — deep-links out of the map (or,
      // for "Explore related", a jump to the strongest overlapping cluster).
      panel.querySelectorAll('[data-conn-act]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var act = el.getAttribute('data-conn-act');
          if (act === 'related') { connSel = el.getAttribute('data-target') || ''; render(input.value); setActive(-1); return; }
          if (act === 'evidence') {
            var tag = el.getAttribute('data-tag') || '';
            close();
            if (typeof window._pdxOpenMyEvidenceByTag === 'function') window._pdxOpenMyEvidenceByTag(tag);
            return;
          }
          if (act === 'locker') { close(); navigate('issue', { key: el.getAttribute('data-issue') || '' }); return; }
          if (act === 'teammates') {
            var ik = el.getAttribute('data-issue') || '';
            close();
            if (ik && typeof window._pdxOpenEvidenceLocker === 'function') window._pdxOpenEvidenceLocker({ issue: ik });
          }
        });
      });
      // A teammate / sibling chip → open that person, scoped to the theme when known.
      panel.querySelectorAll('.pdx-eye-conn-chip[data-conn-pol]').forEach(function (el) {
        el.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        el.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var pid = el.getAttribute('data-conn-pol'), ik = el.getAttribute('data-conn-issue') || '';
          close();
          if (ik && typeof window._pdxOpenEvidenceLocker === 'function') window._pdxOpenEvidenceLocker({ pol: pid, issue: ik });
          else navigate('pol', { id: pid });
        });
      });
    }

    // ── active-row + action (keyboard) handling ───────────────────────
    function resEls() { return panel.querySelectorAll('.pdx-eye-res'); }
    function activeRes() { var els = resEls(); return (active >= 0 && els[active]) ? els[active] : null; }
    function actBtns(res) { return res ? res.querySelectorAll('.pdx-eye-act') : []; }
    function clearActFocus(res) { actBtns(res).forEach(function (b) { b.classList.remove('is-focus'); }); }
    // Move the roving highlight across the active row's action strip. j = -1 hands
    // focus back to the row itself.
    function setActFocus(j) {
      var res = activeRes(); if (!res) { actIdx = -1; return; }
      var btns = actBtns(res);
      if (!btns.length) { actIdx = -1; return; }
      if (j < 0) { actIdx = -1; clearActFocus(res); return; }
      if (j >= btns.length) j = btns.length - 1;
      actIdx = j;
      btns.forEach(function (b, n) { b.classList.toggle('is-focus', n === j); });
      btns[j].scrollIntoView({ block: 'nearest' });
    }
    function setActive(i) {
      var els = resEls();
      if (!els.length) { active = -1; actIdx = -1; return; }
      if (i < 0) i = els.length - 1;
      if (i >= els.length) i = 0;
      active = i; actIdx = -1;
      els.forEach(function (el, n) {
        var on = n === i;
        el.classList.toggle('is-active', on);
        if (on) { input.setAttribute('aria-activedescendant', ''); el.scrollIntoView({ block: 'nearest' }); }
        else { clearActFocus(el); }
      });
    }
    // Re-render (e.g. after a save toggles a label / the My Saved count) while
    // holding the visitor's place — same active row, same focused action.
    function rerenderKeepFocus() {
      var a = active, ai = actIdx;
      render(input.value);
      if (a >= 0) { setActive(Math.min(a, resEls().length - 1)); if (ai >= 0) setActFocus(ai); }
    }

    // ── open / close ──────────────────────────────────────────────────
    function open() { eye.classList.add('is-open'); input.setAttribute('aria-expanded', 'true'); }
    function close() { eye.classList.remove('is-open'); input.setAttribute('aria-expanded', 'false'); active = -1; actIdx = -1; }

    // ── the field grows for a paste ────────────────────────────────────
    // The field is a one-line-tall <textarea> so a pasted claim is visible
    // instead of scrolled off to the right. It has always ACCEPTED long text;
    // it just used to hide it, which read as "the box ate my paste".
    //
    // At rest the height is exactly one line, so the resting shape of the eye is
    // unchanged. It grows to at most GROW_MAX_LINES and then scrolls — a cap
    // rather than unbounded growth, because this is a search field that tolerates
    // a paste, not a composer.
    var GROW_MAX_LINES = 4;
    function growField() {
      try {
        if (!input || input.tagName !== 'TEXTAREA') return;
        input.style.height = 'auto';
        var line = parseFloat(window.getComputedStyle(input).lineHeight) || 22;
        var want = Math.max(line, input.scrollHeight);
        var cap = line * GROW_MAX_LINES;
        input.style.height = Math.min(want, cap) + 'px';
        // Only past the cap does a scrollbar appear; below it the textarea is
        // exactly as tall as its text and nothing can scroll.
        input.classList.toggle('is-multiline', want > cap + 1);
      } catch (e) {}
    }

    // Enter must never insert a newline in a textarea that is really a search
    // field. When a paste-shaped claim is sitting in the offer state, Enter runs
    // the check — that is what the visitor came to do. Otherwise it falls through
    // to the row/action behaviour Enter has always had.
    function claimOffered() {
      try {
        if (!document.getElementById('pdx-claim-check')) return false;
        if (!window.PDXClaimCheck || typeof window.PDXClaimCheck.check !== 'function') return false;
        var st = window.PDXClaimCheck.state && window.PDXClaimCheck.state();
        return !!(st && st.phase === 'offer');
      } catch (e) { return false; }
    }

    // ── events ────────────────────────────────────────────────────────
    var t = null;
    input.addEventListener('input', function () {
      var has = input.value.length > 0;
      eye.classList.toggle('has-text', has);
      growField(); // immediate, not debounced — the box must track the paste
      clearTimeout(t);
      t = setTimeout(function () { render(input.value); setActive(input.value.trim() ? 0 : -1); open(); }, 60);
    });
    input.addEventListener('focus', function () {
      eye.classList.add('is-focus');
      growField();
      render(input.value); open();
      setActive(input.value.trim() ? 0 : -1);
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (!eye.classList.contains('is-open')) { render(input.value); open(); } setActFocus(-1); setActive(active + 1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActFocus(-1); setActive(active - 1); }
      else if (ev.key === 'ArrowRight') {
        // Reveal / step into the active row's action strip (command-palette move).
        if (active >= 0 && actBtns(activeRes()).length) { ev.preventDefault(); setActFocus(actIdx + 1); }
      } else if (ev.key === 'ArrowLeft') {
        if (actIdx >= 0) { ev.preventDefault(); setActFocus(actIdx - 1); }
      } else if (ev.key === 'Tab') {
        // Once inside the action strip, Tab/Shift+Tab roves across it. Before
        // entering (actIdx === -1) Tab keeps its normal behaviour, so keyboard
        // users can still tab out of the search.
        if (actIdx >= 0) { ev.preventDefault(); setActFocus(ev.shiftKey ? actIdx - 1 : actIdx + 1); }
      } else if (ev.key === 'Enter') {
        // preventDefault first and unconditionally: the field is a <textarea>,
        // so an unhandled Enter would insert a newline into a search box.
        ev.preventDefault();
        if (actIdx >= 0) {
          var res = activeRes(), btns = actBtns(res);
          if (res && btns[actIdx]) { runAction(flat[parseInt(res.getAttribute('data-i'), 10)], btns[actIdx].getAttribute('data-act')); }
        } else if (claimOffered()) {
          // A 40-character, six-word paste is not somebody trying to open a
          // profile. Checking it takes precedence over the auto-highlighted row.
          try { window.PDXClaimCheck.check(input.value); } catch (e) {}
        } else if (active >= 0 && flat[active]) { activateEntry(flat[active]); }
      } else if (ev.key === 'Escape') {
        if (actIdx >= 0) { setActFocus(-1); }
        else if (input.value) { input.value = ''; eye.classList.remove('has-text'); growField(); render(''); }
        else { close(); input.blur(); }
      }
    });
    clear.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    clear.addEventListener('click', function () {
      input.value = ''; eye.classList.remove('has-text'); growField(); input.focus(); render(''); open();
    });

    // click / focus outside closes
    document.addEventListener('mousedown', function (ev) {
      if (!eye.contains(ev.target)) { close(); eye.classList.remove('is-focus'); }
    });
    input.addEventListener('blur', function () {
      // defer so an item click (which blurs the input) can still fire
      setTimeout(function () { if (!eye.contains(document.activeElement)) { eye.classList.remove('is-focus'); if (!eye.matches(':hover')) close(); } }, 120);
    });

    // Global "/" to focus search (nice-to-have) — ignored while typing elsewhere.
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var a = document.activeElement, tag = a && a.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (a && a.isContentEditable)) return;
      ev.preventDefault();
      input.focus();
      input.scrollIntoView({ block: 'nearest' });
    });

    // When anything changes the saved collection (a Save action here, or a future
    // My Saved page), keep the open panel truthful: flip Save→Saved labels and
    // refresh the My Saved count/list without losing the visitor's place.
    window.addEventListener('pdx-saved-change', function () {
      if (eye.classList.contains('is-open')) rerenderKeepFocus();
    });

    // An issue answer is computed the moment the question is typed, before the roll-call
    // batch for that issue can land. When it does, re-answer in place: the ordering, the
    // badges and the coverage note are all richer with votes counted, and the visitor
    // never has to retype to see it. Only fires while the panel is open.
    window.addEventListener('pdx-issue-votes', function () {
      if (eye.classList.contains('is-open') && input.value.trim()) rerenderKeepFocus();
    });

    // Signal the eye is alive (subtle idle blink), once data can resolve.
    eye.classList.add('is-loaded');
    window.PDXEye = {
      focus: function () { input.focus(); },
      rebuild: function () { index = null; },
      render: render,
      // The lane, read or set. Set does NOT re-render and does not touch the
      // query: the caller decides when to paint, exactly as the toggle does.
      lane: function (m) {
        if (isLaneMode(m)) laneMode = m;
        return laneMode;
      },
      // Open the eye pre-filled with a query and run it — used by other panels
      // (e.g. the bill detail) to "link back" into the central discovery hub.
      search: function (q) {
        try {
          input.value = q == null ? '' : String(q);
          eye.classList.toggle('has-text', input.value.length > 0);
          growField();
          open();
          eye.classList.add('is-focus');
          render(input.value);
          setActive(input.value.trim() ? 0 : -1);
          input.focus();
          try { eye.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        } catch (e) {}
      }
    };
  })();
  
