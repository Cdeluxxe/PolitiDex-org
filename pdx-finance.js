/* ============================================================================
   pdx-finance.js — TWO MONEY ARCHIVES, TWO HELPERS, AND THE WALL BETWEEN THEM
   ============================================================================
   WHY THIS FILE EXISTS

   A person file now carries TWO money chips in its letterhead row, and they are
   not two views of one number. They are two claims out of two archives:

       PDXFinance.filing(pid)   what a CAMPAIGN RAISED. FEC and state disclosure
                                filings. Owned by /ftm-data.js, composed by
                                finance-lane.js.
       PDXFinance.wealth(pid)   what a PERSON DISCLOSED WHILE SERVING. Personal
                                financial-disclosure forms. Owned here.

   Before this file the two lookups had no shared door: the campaign filing had
   two seams inside finance-lane.js and personal wealth had no per-person
   accessor at all — wealth-lane.js holds a ten-row board on /money and
   deliberately publishes nothing a profile can read. So a surface that wanted
   to print both had to reach into two private closures and invent the join. It
   is one door now, with two named methods, and the join it does NOT offer is
   the important part.

   ── THE WALL, WHICH IS THE WHOLE REASON THE HELPERS ARE SEPARATE ───────────

   NO SUM. There is no method here that adds, averages or compares a campaign
   receipt figure to a disclosed net worth, and no expression anywhere in this
   file mentions both. "$774M raised" plus "$1–5M disclosed" is not "$775M of
   anything": one is money that passed through a committee under contribution
   limits, the other is what a person told a clerk they own. Adding them would
   invent a figure that no document supports, about a person, on a letterhead.

   NO MIDPOINT MATH. `rangeOrExact` is a STRING from the moment it is typed into
   the table to the moment it is printed, and nothing in this file parses it,
   ranges it, or reduces it. Disclosure forms report BANDS — "$1,000,001 –
   $5,000,000" — because that is the precision the filer was required to give.
   Turning that band into "$3M" publishes a number the filer never filed and the
   form does not contain. A range is the finding. If a jurisdiction publishes an
   exact figure, that exact figure goes in the same field, as published.

   NEVER $0. A person with no disclosure row returns `null`, and every consumer
   renders that as words. Zero is a figure, and a figure printed where nobody
   looked is a reading of a person assembled out of missing data.

   NO PERCENT, NO GRADE, NO CHANGE. This file publishes no ratio, no growth, no
   before/after and no level. It does not read wealth-lane.js's board, which
   carries net-worth-before against net-worth-now and a percentage change — that
   is a /money leaderboard with a sort and a disclaimer, and a per-person chip
   built off it would be printing a percentage about a person in a letterhead
   pill, which is the exact failure the retired Constituents-First score was.

   NEVER_FEEDS. Nothing here is an input to Direction Match / Word vs Action, a
   formal pattern tier, the publication floor, any count of formal acts, ballot
   sort order, Your Match, the personal alignment read or a Door 2 pick. Same
   posture finance-lane.js takes for filings, declared on this object too so a
   later reader can check it without reading the header.

   ── THE DISCLOSURE TABLE IS EMPTY, ON PURPOSE AND VISIBLY ──────────────────

   PDX_FD_DISCLOSURES ships with no rows. That is not a bug and it is not a
   placeholder for invented data: transcribing personal financial disclosures is
   its own wave of hand-verification, and until it runs, `wealth()` answers null
   for everybody and every profile's second chip says so in words. An empty
   shelf that says "empty shelf" is honest. An empty shelf that renders nothing
   would leave "no chip" to be read as "nothing to declare", and to a reader who
   has learned that this site puts a money chip on people with money, "no chip"
   says clean. It is not clean; nobody has looked yet.

   ROW SHAPE, for the wave that fills it:

       'mike_lee': {
         rangeOrExact: '$1–5M',                    // AS PUBLISHED. String. Band
                                                   // or exact figure, never a
                                                   // midpoint, never computed.
         year: '2024',                             // the form's own year
         formUrl: 'https://efdsearch.senate.gov/…' // the form a reader can open
       }

   `tenureYears` is NOT stored: it is read off the person file's own termStart /
   termEnd every time, through window._pdxTenure and through nothing else, so the
   years-in-office figure on a money chip is the same figure the letterhead's 🗓️
   tenure pill prints. Two copies of "how long have they served" is how they come
   to disagree. Where that owner is not loaded, the chip prints its figure with no
   tenure segment rather than deriving one here.
   ========================================================================= */
(function () {
  'use strict';
  var W = (typeof window !== 'undefined') ? window : null;
  if (!W) return;

  // ── THE PERSONAL FINANCIAL DISCLOSURE TABLE ────────────────────────────────
  // Keyed by the person-file pid. Empty until the transcription wave runs; see
  // the header for the row shape and for why an empty table still ships a chip.
  var PDX_FD_DISCLOSURES = {};

  // The form a disclosure came off, as a label short enough for a pill. One
  // constant rather than a per-row field, because every row the first wave will
  // carry is a federal or state annual financial disclosure and a label that
  // varies per row is a label a reader has to learn.
  var FORM_LABEL = 'FD';

  // ── FILINGS: ONE DOOR, AND IT KNOCKS RATHER THAN REACHING IN ──────────────
  // finance-lane.js owns the campaign filing lookup — the two seams, the shipped
  // id alias, the shallow copy — and publishes it as `filingRecord`. That is
  // asked first and, failing that, /ftm-data.js's own published accessor is asked
  // second. Both hand back a record; neither lets this file mutate one.
  //
  //   THIS FILE DELIBERATELY DOES NOT TOUCH `_FTM_BY_ID`, and the restraint is
  // load-bearing rather than tidy. scripts/test-finance-lane.mjs sweeps every
  // shipped module for the filings-index seam and asserts that exactly TWO can
  // see it, named in the test: ftm-data.js, which DEFINES the filings, and
  // finance-lane.js, which READS them. A third name in that list is the event
  // that test exists to catch — widening the set is supposed to be a decision,
  // not a side effect of adding a helper. And this helper has no need of it: it
  // is a door onto a lookup that already exists and is already correct about the
  // two ids stored under short keys. A second copy of that lookup would be a
  // second answer to "does this person have a filing", which is the exact bug
  // (chip saying "no money file" above a section drawing $8.6M) the lane's own
  // header spends forty lines on.
  function filing(pid) {
    if (!pid) return null;
    var L = W.PDXFinanceLane;
    if (L && typeof L.filingRecord === 'function') {
      try { var r = L.filingRecord(pid); if (r) return r; } catch (e) {}
    }
    var get = W._pdxFinanceFiling;
    if (typeof get === 'function') {
      try { var r2 = get(pid); if (r2) return r2; } catch (e) {}
    }
    return null;
  }

  // ── THE ROSTER, for the person record a tenure read needs ─────────────────
  function personFor(pid) {
    var src = W.CMP_DATA || W.PROFILES;
    return (src && typeof src === 'object' && src[pid]) ? src[pid] : null;
  }

  // ── TENURE: SWORN DATE → NOW, OR → LAST DAY IN OFFICE ─────────────────────
  // ONE OWNER, AND IT IS NOT THIS FILE. window._pdxTenure (voter-hub-location.js)
  // parses termStart / termEnd, counts whole completed years, and returns null
  // when no start date is recorded rather than guessing one. This file ASKS it
  // and prints nothing when it cannot — it does not carry a copy of the
  // arithmetic, because two implementations of "how long have they served" is
  // exactly how the money chip and the letterhead's own tenure pill come to
  // disagree about the same person in the same row.
  //   This file used to carry that copy, for documents that do not load the
  // homepage module — person.html is one — and the copy was deleted. The cost is
  // visible and small: where the owner is absent, the disclosure chip prints its
  // figure, its form and its year with NO tenure segment, which is the same thing
  // every other tenure consumer on that document already does (profiles-full.js
  // and compare-hub.js both guard on `typeof window._pdxTenure === 'function'`
  // and render no pill without it). A missing span is a missing span; a second
  // arithmetic that happens to agree today is a second answer tomorrow.
  //   NULL IS NOT ZERO HERE EITHER. No sworn date on file means no span printed,
  // never "0 yrs in office" beside a dollar figure.
  function tenureYears(person) {
    if (!person) return null;
    var T = W._pdxTenure;
    if (typeof T !== 'function') return null;
    try {
      var t = T(person);
      if (t && typeof t.years === 'number' && isFinite(t.years)) return t.years;
    } catch (e) {}
    return null;
  }

  // ── WEALTH: THE DISCLOSURE READ, OR NULL ──────────────────────────────────
  // Returns exactly the four fields the consumers were promised and nothing
  // else: { rangeOrExact, year, formUrl, tenureYears }. `rangeOrExact` is
  // handed back as the string it was filed as. `tenureYears` is a number, or
  // null when the person file records no sworn date — a chip with no tenure
  // prints no tenure rather than a guessed span.
  //   NULL, NOT A ZEROED OBJECT. A row that carries no figure is not a row: an
  // object with an empty range in it is how "$0 disclosed" gets printed by a
  // consumer that trusted its shape over its contents.
  function wealth(pid, person) {
    if (!pid) return null;
    var row = PDX_FD_DISCLOSURES[pid];
    if (!row || typeof row !== 'object') return null;
    var figure = (row.rangeOrExact == null) ? '' : String(row.rangeOrExact).trim();
    if (!figure) return null;
    return {
      rangeOrExact: figure,
      year: (row.year == null) ? '' : String(row.year),
      formUrl: (row.formUrl == null) ? '' : String(row.formUrl),
      tenureYears: tenureYears(person || personFor(pid))
    };
  }

  // ── COVERAGE, ON THE SAME TERMS THE FILING LANE DISCLOSES ITS OWN ─────────
  // How many disclosure rows exist, out of how many people the site carries,
  // and the explicit statement that a blank is missing DATA. Read live off the
  // table and the roster rather than hard-coded, so the sentence cannot drift
  // from the wave that fills either one. It belongs in the SECTION, not on the
  // chip: a pill has no room for a paragraph, and this is a paragraph.
  var THIN_AT = 1 / 3;
  function rosterSize() {
    var src = W.CMP_DATA || W.PROFILES;
    return (src && typeof src === 'object') ? Object.keys(src).length : 0;
  }
  function onFileCount() {
    var n = 0;
    for (var k in PDX_FD_DISCLOSURES) {
      if (!Object.prototype.hasOwnProperty.call(PDX_FD_DISCLOSURES, k)) continue;
      var row = PDX_FD_DISCLOSURES[k];
      if (row && row.rangeOrExact) n++;
    }
    return n;
  }
  function coverage() {
    var on = onFileCount(), all = rosterSize();
    var thin = !all || on < all * THIN_AT;
    var sentence;
    if (!on) {
      sentence = 'PolitiDex holds no personal financial-disclosure forms yet' +
        (all ? (' for the ' + all + ' people it carries') : '') +
        '. Every blank here is missing data on our side — it is not a finding ' +
        'about the person, and nothing on this lane is read as one.';
    } else if (!all) {
      sentence = 'Personal financial disclosures are shown only where a form is ' +
        'on file. A blank here is missing data, not a finding.';
    } else {
      sentence = 'Personal financial-disclosure forms are on file for ' + on +
        ' of the ' + all + ' people PolitiDex carries. Where a form is missing, ' +
        'that is missing data — it is not a finding about the person, and ' +
        'nothing on this lane is read as one.';
    }
    return { onFile: on, roster: all, thin: thin, sentence: sentence };
  }

  W.PDXFinance = {
    // The two helpers, and they are the only two.
    filing: filing,
    wealth: wealth,
    // The section's disclosure counts for the wealth block. The filings block
    // has its own, from PDXFinanceLane.coverage().
    coverage: coverage,
    FORM_LABEL: FORM_LABEL,
    THIN_AT: THIN_AT,
    // Declared, so the wall is readable off the object as well as off the
    // header. Asserted by scripts/test-money-two-chips.mjs.
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking', 'alignment',
                  'door2Picks'],
    // Test / ingest seam. Overriding the table cannot introduce arithmetic —
    // `rangeOrExact` is printed as the string it arrives as, whatever it says.
    _setWealthTable: function (table) {
      PDX_FD_DISCLOSURES = (table && typeof table === 'object') ? table : {};
      return onFileCount();
    }
  };
})();
