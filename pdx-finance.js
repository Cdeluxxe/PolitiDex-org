/* ============================================================================
   pdx-finance.js — TWO MONEY ARCHIVES, TWO HELPERS, AND THE WALL BETWEEN THEM
   ============================================================================
   WHY THIS FILE EXISTS

   A person file now carries TWO money chips in its letterhead row, and they are
   not two views of one number. They are two claims out of two archives:

       PDXFinance.filing(pid)   what a CAMPAIGN RAISED. FEC and state disclosure
                                filings. Owned by /ftm-data.js, composed by
                                finance-lane.js.
       PDXFinance.wealth(pid)   WHETHER AN IN-OFFICE DISCLOSURE DOCUMENT IS ON
                                FILE, which form it is, its year and its link.
                                Owned here.

   Before this file the two lookups had no shared door: the campaign filing had
   two seams inside finance-lane.js and personal wealth had no per-person
   accessor at all — wealth-lane.js holds a ten-row board on /money and
   deliberately publishes nothing a profile can read. So a surface that wanted
   to print both had to reach into two private closures and invent the join. It
   is one door now, with two named methods, and the join it does NOT offer is
   the important part.

   ── THE SECOND PILL IS A DOCUMENT CHIP, NOT A DOLLAR CHIP ──────────────────

   IT STOPPED WAITING FOR A TOTAL THE FORMS DO NOT PRINT. The second pill was
   built to carry a filed figure, and the first curation wave established that
   for the people this site carries there is no such figure to carry: Utah's own
   in-office statement (Utah Code 20A-11-1603 / 1604) reports employers,
   entities, income sources and holdings over thresholds — what, never how much —
   and a House or Senate FD reports a CATEGORY OF VALUE per asset with no
   aggregate line anywhere on it. Waiting for a dollar total meant a pill that
   could only ever say nothing, about people who had in fact filed.

   So the pill now reports the thing the document actually establishes:

       FD on file · 2025 · House Clerk          a federal annual disclosure
       COI on file · 2024 · Utah                a Utah conflict-of-interest
                                                statement
       No in-office wealth file on hand         nothing on file here

   That is a claim about PAPERWORK, and it is the only claim the archive can
   support. It is not a net worth, not a band total, not "$0", and not a finding
   that anybody failed to file — and the accessible name says each of those out
   loud, because a money-coloured pill under a 💰 glyph will otherwise be read as
   a figure by a reader who is scanning.

   TWO TABLES, AND THE DOLLAR ONE IS STILL EMPTY. PDX_FD_DISCLOSURES holds dollar
   rows and holds none; PDX_FD_DOCUMENTS holds "a document exists" rows and is
   the table that can actually fill. They are separate objects rather than one
   table with optional fields, because a row shaped like a figure is a row
   somebody will eventually print as one.

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

   ── THE FIRST CURATION WAVE RAN, UTAH-FIRST, AND FOUND NOTHING TO FILE ─────

   The first wave went looking for filed in-office figures for the Utah slice
   PolitiDex already carries — the governor, both US senators, the four US House
   members who represent Utah, and the Utah Legislature's District 3 people. It
   shipped ZERO ROWS, and the reason is a fact about the forms rather than a gap
   in the looking:

     1. UTAH'S OWN IN-OFFICE FORM CARRIES NO VALUE AT ALL. The state's conflict
        -of-interest disclosure (Utah Code 20A-11-1603 / 1604) asks for
        employers, entities held, income sources above a threshold, holdings
        above a fair-market-value threshold, positions and real property. It
        reports WHAT, not HOW MUCH: there is no band, no category ladder, and no
        total anywhere on it. There is no figure on that form to quote.

     2. THE FEDERAL FD HAS NO TOTAL LINE. A House or Senate annual disclosure
        reports a CATEGORY OF VALUE per asset, asset by asset. It prints no
        aggregate, no net worth and no summary band. Turning a page of ticked
        categories into one figure means adding ranges together — which is the
        midpoint arithmetic this file exists to refuse, and the sum would be a
        figure the filer never filed.

     3. THE THIRD-PARTY TOTALS ARE THE THING WE ARE NOT. Forbes, OpenSecrets'
        net-worth estimates and this site's own /money board all publish a
        single number per person. Every one of them is an ESTIMATE somebody
        else computed, which is precisely what a chip reading "disclosed" must
        not be carrying.

   So the wave's finding is that the documents exist and are linkable — the
   clerk's yearly index resolves a member to a document id and a PDF URL — but
   the FIGURE does not exist on them. A row needs both. Where it cannot have
   both, there is no row, and the pill says "No in-office wealth file on hand",
   which for these people is the true sentence.

   What is in place instead of rows is the machinery the next wave needs, both
   pieces tested: the filed-category lookup below, so a ticked box can be shown
   in a pill without being parsed, and the curation gate, so a row that cannot
   point at a form cannot be typed in later without a test going red.

   ROW SHAPE, dollar table, for a wave that ever finds a filed total:

       'someone': {
         rangeOrExact: '$1–5M',                    // AS PUBLISHED. String. Band
                                                   // or exact figure, never a
                                                   // midpoint, never computed.
         year: '2024',                             // the form's own year
         formUrl: 'https://efdsearch.senate.gov/…' // the form a reader can open
       }

   ROW SHAPE, document table, which is what this pass fills:

       'bmoore': {
         kind: 'FD',                               // 'FD' or 'COI'. WHICH FORM,
                                                   // not how much.
         year: 2025,                               // the form's own year
         formUrl: 'https://disclosures-clerk.house.gov/…/10074823.pdf'
       }

   THREE FIELDS. No figure, no band, no tenure, no assets array. If a later wave
   transcribes holdings, they are LINES AS FILED in the long block only — never
   summed, never averaged, and never copied onto the pill.

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

  // ── THE DOCUMENT INDEX: WHICH FORM IS ON FILE, AND WHERE TO READ IT ───────
  // Keyed by the person-file pid. THREE FIELDS AND NO FOURTH: which form, its
  // own year, and the document itself on the archive that published it. No
  // figure, no band, no tenure, no assets array — a field shaped like money is a
  // field somebody prints as money.
  //
  // WHAT IS IN HERE AND WHY ONLY THIS. Every row was resolved through the House
  // Clerk's own yearly index (the year's filing list, member to document id) and
  // then fetched: each URL below returned a real PDF from
  // disclosures-clerk.house.gov, and each is that member's ANNUAL in-office
  // report rather than a candidate report, an extension or a periodic
  // transaction notice. Nothing here was typed from a search page, a news story
  // or a guessed id.
  //
  // WHAT IS DELIBERATELY MISSING, because a URL we could not open is not a row:
  //   · Senators Lee and Curtis — Senate disclosures sit behind efdsearch's
  //     accept-terms session, so this pass holds no document URL for either.
  //     (Curtis's one row in the House index is not an annual in-office report.)
  //   · Governor Cox, Sen. John Johnson (SD 3), Rep. Jason Thompson (HD 3) —
  //     Utah's disclosure site answers a browser challenge rather than a
  //     document URL, so there is no state COI link to point at yet.
  //   · Trump — no OGE document URL in hand this pass. An unsourced row on the
  //     person a reader is most likely to arrive at with a number already in
  //     mind would be the most expensive row on the site.
  // Each of those pids keeps the empty pill, which is the true sentence for them
  // today: we are holding no document, and that is a fact about this archive.
  var PDX_FD_DOCUMENTS = {
    bmoore:  { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074823.pdf' },
    maloy:   { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10081600.pdf' },
    kennedy: { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074834.pdf' },
    owens:   { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/9116274.pdf' }
  };

  // WHICH FORM, AS A LABEL SHORT ENOUGH FOR A PILL. Two kinds, two literal
  // labels, and an unknown kind falls back to the neutral default rather than
  // printing whatever string a row happened to carry onto a letterhead.
  var KIND_LABELS = { FD: 'FD', COI: 'COI' };
  // WHAT EACH FORM ACTUALLY REPORTS, which is the sentence the long block owes a
  // reader who has just been told a document exists. Neither form carries a
  // total, and this is where that is said in words rather than implied by the
  // absence of a figure.
  var KIND_SENTENCE = {
    FD: 'A federal annual financial disclosure reports a category of value for ' +
        'each asset, asset by asset. It carries no total and no net worth.',
    COI: 'A Utah conflict-of-interest statement reports employers, entities, ' +
         'income sources and holdings above a threshold \u2014 what, not how much. ' +
         'It carries no dollar total.'
  };
  function kindLabel(kind) {
    var k = (kind == null) ? '' : String(kind).trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(KIND_LABELS, k) ? KIND_LABELS[k] : FORM_LABEL;
  }
  function kindSentence(kind) {
    var k = (kind == null) ? '' : String(kind).trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(KIND_SENTENCE, k) ? KIND_SENTENCE[k] : '';
  }

  // ── THE ARCHIVE COMES OFF THE URL HOST AND NOWHERE ELSE ───────────────────
  // The pill names the authority that published the document. That name is read
  // off the LINK, never typed at a call site and never inferred from the office,
  // so the label and the anchor beside it cannot disagree — a chip that says
  // "House Clerk" over a link to somewhere else is worse than a chip that says
  // nothing.
  //   LITERAL HOSTS, like the band ladder: exact keys, exact labels, no pattern
  // matching on a hostname. A host that is not in the list PRINTS ITSELF, which
  // is still a name the URL supports — the gate below guarantees every shipped
  // formUrl is an https .gov document, so an unrecognised host is a government
  // archive nobody has written a short name for yet, not an unknown authority.
  var DOC_ARCHIVES = {
    'disclosures-clerk.house.gov': 'House Clerk',
    'clerk.house.gov': 'House Clerk',
    'efdsearch.senate.gov': 'Senate EFD',
    'www.senate.gov': 'Senate',
    'senate.gov': 'Senate',
    'oge.gov': 'OGE',
    'www.oge.gov': 'OGE',
    'extapps2.oge.gov': 'OGE',
    'disclosures.utah.gov': 'Utah',
    'elections.utah.gov': 'Utah'
  };
  // THE HOST, BY REGEX AND NOT BY HAND. One capture of everything between the
  // scheme and the first path, port or query character. No string surgery, so
  // there is no branch here that could hand back part of a path as a hostname.
  function hostOf(url) {
    var m = /^https?:\/\/([^\/?#:]+)/i.exec(String(url || ''));
    return m ? m[1].toLowerCase() : '';
  }
  function archiveFor(url) {
    var host = hostOf(url);
    if (!host) return '';
    return Object.prototype.hasOwnProperty.call(DOC_ARCHIVES, host) ? DOC_ARCHIVES[host] : host;
  }

  // ── THE FILED CATEGORY LADDER, AND THE ONE COMPRESSION ALLOWED ────────────
  // A federal financial disclosure does not print a figure. It prints a TICKED
  // BOX: the filer chooses a category of value for an asset, and that category's
  // printed language IS the disclosure. So a row stores that language the way the
  // form spells it — '$1,000,001 - $5,000,000' — and `wealth()` hands it back
  // unchanged, like every other figure in this file.
  //
  // A letterhead pill cannot hold twenty-three characters of it. This object is
  // the ONE place a filed category may be shortened for display, and it is a
  // LOOKUP, not a formatter: literal key, literal value, one pair per box on the
  // form, typed by hand. Nothing here reads a digit. There is no split on the
  // dash, no strip of the commas, no parse of the bounds, no rounding rule and
  // therefore no way for a mapping to invent a bound the form does not carry —
  // the worst a wrong pair can do is misquote a band that a test is pinning
  // value-for-value. scripts/test-money-two-chips.mjs pins this table entry by
  // entry, which is the condition the wave was allowed under.
  //
  // A FIGURE THAT IS NOT IN HERE PASSES THROUGH VERBATIM. An exact filed number
  // ('$247,003'), a band a jurisdiction spells its own way, the form's own
  // 'None (or less than $1,001)' — none of them are keys, so all of them print as
  // filed. Unknown input is never guessed at, reformatted, or dropped.
  //
  // SPELLING IS PART OF THE KEY. The clerk's forms print a spaced hyphen; the
  // same band is written with an en dash elsewhere. Both spellings get their own
  // literal pair rather than a normaliser, because a normaliser is code that
  // rewrites a filed string before matching it, and the first thing it would have
  // to decide is which characters in somebody's disclosure do not matter. A third
  // spelling gets a third pair.
  var FILED_BAND_LABELS = {
    '$1,001 - $15,000':            '$1–15K',
    '$1,001–$15,000':         '$1–15K',
    '$15,001 - $50,000':           '$15–50K',
    '$15,001–$50,000':        '$15–50K',
    '$50,001 - $100,000':          '$50–100K',
    '$50,001–$100,000':       '$50–100K',
    '$100,001 - $250,000':         '$100–250K',
    '$100,001–$250,000':      '$100–250K',
    '$250,001 - $500,000':         '$250–500K',
    '$250,001–$500,000':      '$250–500K',
    '$500,001 - $1,000,000':       '$500K–1M',
    '$500,001–$1,000,000':    '$500K–1M',
    '$1,000,001 - $5,000,000':     '$1–5M',
    '$1,000,001–$5,000,000':  '$1–5M',
    '$5,000,001 - $25,000,000':    '$5–25M',
    '$5,000,001–$25,000,000': '$5–25M',
    '$25,000,001 - $50,000,000':   '$25–50M',
    '$25,000,001–$50,000,000':'$25–50M',
    'Over $50,000,000':            'over $50M',
    'over $50,000,000':            'over $50M'
  };

  // ONE ANSWER FOR EVERY SURFACE. The pill, the pill's accessible label and the
  // long-form disclosures block all ask this, so the three cannot end up quoting
  // one archive three ways. A band stays a band through it: in and out are both
  // strings, and no arithmetic happens in between.
  function bandLabel(figure) {
    if (figure == null) return '';
    var raw = String(figure).trim();
    if (!raw) return '';
    return Object.prototype.hasOwnProperty.call(FILED_BAND_LABELS, raw)
      ? FILED_BAND_LABELS[raw] : raw;
  }

  // ── THE CURATION GATE: WHAT MAY BE TYPED INTO THE TABLE ───────────────────
  // The table is hand-written, which means the thing to defend against is not a
  // bad parser, it is a tired person at 1am with a news article open. These are
  // the rules a row has to satisfy to be allowed in, expressed as code so the
  // suite can run them rather than as a paragraph somebody has to remember:
  //
  //   FIGURE   a non-empty string, as filed. Never '$0' and never '0' — a zero is
  //            a figure, and the one thing a blank on this lane must never become.
  //   YEAR     the form's own four-digit year. Which document this came off.
  //   FORM URL an https link to the DOCUMENT. No row may point at a news story,
  //            a net-worth estimate or a leaderboard, so the host has to be a
  //            .gov: that is where filed disclosures live, and it is the cheapest
  //            check that excludes Forbes, OpenSecrets and this site's own /money
  //            board by construction rather than by a blocklist somebody has to
  //            keep up to date. An official non-.gov host would be a decision to
  //            make out loud, with a test, not a silent pass.
  //   NO YEARS OF SERVICE. A row may not carry tenure in any spelling. Time in
  //            office has exactly one owner — window._pdxTenure, off the person
  //            file's sworn date — and a second copy stored beside a dollar
  //            figure is how the money chip and the tenure pill start disagreeing
  //            about the same person in the same row.
  //   NOTHING ELSE. Three fields, no fourth. An unrecognised key is a defect and
  //            not a feature, because a field this file does not print is a field
  //            somebody expected to be printed.
  //
  // It reports rather than repairs: a defect names the pid and the broken rule,
  // never the value, and the suite asserts the SHIPPED table has none. Nothing
  // here silently drops a row — a row quietly swallowed is a row nobody fixes.
  var ROW_FIELDS = ['rangeOrExact', 'year', 'formUrl'];
  //   The list names the spellings a person might reach for; it is not the whole
  // defence, because anything it misses lands on "unrecognised field" below. It
  // deliberately does NOT spell the two date fields a person record carries, so
  // that this module still contains no term-date identifier anywhere — the suite
  // sweeps its whole body for them, and a gate that had to name them to forbid
  // them would be the one place tenure arithmetic could grow back.
  var TENURE_FIELDS = ['tenureYears', 'years', 'yearsInOffice', 'tenure',
                       'yearsServed', 'yearsSworn', 'sinceTakingOffice'];
  function rowDefects(pid, row) {
    var out = [];
    if (!row || typeof row !== 'object') return [pid + ': row is not an object'];
    var fig = (row.rangeOrExact == null) ? '' : String(row.rangeOrExact).trim();
    if (!fig) out.push(pid + ': rangeOrExact is empty — a row with no figure is not a row');
    if (fig === '$0' || fig === '0') out.push(pid + ': rangeOrExact is a zero, which is a figure and not a blank');
    var yr = (row.year == null) ? '' : String(row.year).trim();
    if (!/^[12][0-9]{3}$/.test(yr)) out.push(pid + ': year is not a four-digit form year');
    var url = (row.formUrl == null) ? '' : String(row.formUrl).trim();
    if (!url) {
      out.push(pid + ': formUrl is empty — no row without the form it came off');
    } else if (!/^https:\/\/[^\/?#]*\.gov(?:[:\/?#]|$)/i.test(url)) {
      out.push(pid + ': formUrl is not an https link to a .gov document');
    }
    for (var i = 0; i < TENURE_FIELDS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(row, TENURE_FIELDS[i])) {
        out.push(pid + ': carries ' + TENURE_FIELDS[i] + ' — tenure comes only from _pdxTenure');
      }
    }
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      if (ROW_FIELDS.indexOf(k) >= 0) continue;
      if (TENURE_FIELDS.indexOf(k) >= 0) continue;
      out.push(pid + ': unrecognised field ' + k);
    }
    return out;
  }
  function curationDefects(table) {
    var t = (table && typeof table === 'object') ? table : PDX_FD_DISCLOSURES;
    var out = [];
    for (var pid in t) {
      if (!Object.prototype.hasOwnProperty.call(t, pid)) continue;
      out = out.concat(rowDefects(pid, t[pid]));
    }
    return out;
  }

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

  // ── WEALTH: THE DOCUMENT READ, OR NULL ────────────────────────────────────
  // Returns the four fields the consumers were promised and nothing else:
  // { kind, year, formUrl, tenureYears }. `kind` is which form ('FD' or 'COI'),
  // normalised through the label lookup so a surface never prints a row's raw
  // string. `tenureYears` is a number, or null when the person file records no
  // sworn date or the tenure owner is not loaded on this document — a chip with
  // no tenure prints no tenure rather than a guessed span.
  //
  //   NO FIGURE ON THIS OBJECT, THIS PASS. There is no `rangeOrExact` here, and
  // that absence is the design: the consumers of this read print what it
  // contains, so an object that cannot carry a figure is an object that cannot be
  // rendered as one. The dollar table is still consulted by nothing.
  //
  //   NULL, NOT A ZEROED OBJECT. A row with no form link, no year or no
  // recognised kind is not a row. An object whose shape is trusted over its
  // contents is how "$0 disclosed" gets printed by a consumer that checked only
  // whether it got something back.
  function wealth(pid, person) {
    if (!pid) return null;
    var row = PDX_FD_DOCUMENTS[pid];
    if (!row || typeof row !== 'object') return null;
    var kind = kindLabel(row.kind);
    var url = (row.formUrl == null) ? '' : String(row.formUrl).trim();
    var year = (row.year == null) ? '' : String(row.year).trim();
    if (!url || !year) return null;
    if (!Object.prototype.hasOwnProperty.call(KIND_LABELS,
          String(row.kind == null ? '' : row.kind).trim().toUpperCase())) return null;
    return {
      kind: kind,
      year: year,
      formUrl: url,
      tenureYears: tenureYears(person || personFor(pid))
    };
  }

  // ── THE DOCUMENT GATE: WHAT MAY BE TYPED INTO THE DOCUMENT INDEX ──────────
  // Same posture as the dollar gate above, different rules, because the failure
  // it guards against is different: not an invented figure but an invented
  // document. A row here asserts that a named form exists and can be opened, so
  // the rules are about the form and the link.
  //
  //   KIND     'FD' or 'COI'. Nothing else. A third kind is a decision about what
  //            this pill claims, not a string somebody adds in passing.
  //   YEAR     the form's own four-digit year.
  //   FORM URL an https link on a .gov host, for the same reason the dollar gate
  //            demands one: filed disclosures live on .gov, and a Forbes profile,
  //            an OpenSecrets page, a news story about a form and an http link
  //            all fail one rule rather than four.
  //   NO FIGURE. A dollar field on a document row is the exact confusion these
  //            two tables were split apart to prevent, so `rangeOrExact` and its
  //            neighbours are named defects here rather than ignored fields.
  //   NO YEARS OF SERVICE, in any spelling, for the reason the dollar gate gives:
  //            tenure has one owner and a stored copy is a second answer.
  //   NOTHING ELSE. Three fields, no fourth.
  //
  //   A DEFECT NAMES THE PID AND THE RULE, AND NEVER THE VALUE. For a URL it
  // prints host and path only, never the query string: a disclosure search link
  // can carry a session token, and a defect list gets pasted into a terminal, a
  // ticket and a chat window by somebody trying to get help with it.
  var DOC_FIELDS = ['kind', 'year', 'formUrl'];
  var FIGURE_FIELDS = ['rangeOrExact', 'amount', 'total', 'netWorth', 'value',
                       'assets', 'holdings', 'band', 'figure'];
  function urlForMessage(url) {
    var u = String(url || '');
    var m = /^(https?:\/\/[^?#]*)/i.exec(u);
    return m ? m[1] : '(no url)';
  }
  function documentRowDefects(pid, row) {
    var out = [];
    if (!row || typeof row !== 'object') return [pid + ': row is not an object'];
    var k = (row.kind == null) ? '' : String(row.kind).trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(KIND_LABELS, k)) {
      out.push(pid + ': kind is not FD or COI');
    }
    var yr = (row.year == null) ? '' : String(row.year).trim();
    if (!/^[12][0-9]{3}$/.test(yr)) out.push(pid + ': year is not a four-digit form year');
    var url = (row.formUrl == null) ? '' : String(row.formUrl).trim();
    if (!url) {
      out.push(pid + ': formUrl is empty \u2014 no row without the document it names');
    } else if (!/^https:\/\/[^\/?#]*\.gov(?:[:\/?#]|$)/i.test(url)) {
      out.push(pid + ': formUrl is not an https link to a .gov document (' +
        urlForMessage(url) + ')');
    }
    for (var i = 0; i < FIGURE_FIELDS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(row, FIGURE_FIELDS[i])) {
        out.push(pid + ': carries ' + FIGURE_FIELDS[i] +
          ' \u2014 a document row names a form, it does not carry a figure');
      }
    }
    for (var j = 0; j < TENURE_FIELDS.length; j++) {
      if (Object.prototype.hasOwnProperty.call(row, TENURE_FIELDS[j])) {
        out.push(pid + ': carries ' + TENURE_FIELDS[j] + ' \u2014 tenure comes only from _pdxTenure');
      }
    }
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      if (DOC_FIELDS.indexOf(key) >= 0) continue;
      if (FIGURE_FIELDS.indexOf(key) >= 0) continue;
      if (TENURE_FIELDS.indexOf(key) >= 0) continue;
      out.push(pid + ': unrecognised field ' + key);
    }
    return out;
  }
  function documentDefects(table) {
    var t = (table && typeof table === 'object') ? table : PDX_FD_DOCUMENTS;
    var out = [];
    for (var pid in t) {
      if (!Object.prototype.hasOwnProperty.call(t, pid)) continue;
      out = out.concat(documentRowDefects(pid, t[pid]));
    }
    return out;
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
  //   IT COUNTS DOCUMENTS, BECAUSE THAT IS WHAT THE PILL REPORTS. The number
  // beside "on file" has to be the number of people whose pill says something,
  // or the sentence under the pills is describing a different table from the one
  // a reader just looked at. `dollarRows` is reported separately and is zero:
  // it is the count of filed TOTALS, which no form in this roster prints.
  function dollarRowCount() {
    var n = 0;
    for (var k in PDX_FD_DISCLOSURES) {
      if (!Object.prototype.hasOwnProperty.call(PDX_FD_DISCLOSURES, k)) continue;
      var row = PDX_FD_DISCLOSURES[k];
      if (row && row.rangeOrExact) n++;
    }
    return n;
  }
  function onFileCount() {
    var n = 0;
    for (var k in PDX_FD_DOCUMENTS) {
      if (!Object.prototype.hasOwnProperty.call(PDX_FD_DOCUMENTS, k)) continue;
      if (wealth(k, null)) n++;
    }
    return n;
  }
  function coverage() {
    var on = onFileCount(), all = rosterSize();
    var thin = !all || on < all * THIN_AT;
    var sentence;
    if (!on) {
      sentence = 'PolitiDex holds no in-office disclosure documents yet' +
        (all ? (' for the ' + all + ' people it carries') : '') +
        '. Every blank here is missing data on our side — it is not a finding ' +
        'about the person, and nothing on this lane is read as one.';
    } else if (!all) {
      sentence = 'In-office disclosure documents are shown only where the form ' +
        'itself is on file. A blank here is missing data, not a finding.';
    } else {
      sentence = 'The in-office disclosure form itself is on file for ' + on +
        ' of the ' + all + ' people PolitiDex carries. Where it is missing, ' +
        'that is missing data — it is not a finding about the person, it is ' +
        'not a report that they did not file, and nothing on this lane is read ' +
        'as one.';
    }
    return { onFile: on, roster: all, dollarRows: dollarRowCount(),
             thin: thin, sentence: sentence };
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
    // Which form, and which archive published it. Both read off the row and the
    // URL rather than typed at a call site, and published so finance-lane.js
    // asks one owner instead of carrying a second host table.
    kindLabel: kindLabel,
    kindSentence: kindSentence,
    archiveFor: archiveFor,
    KIND_LABELS: KIND_LABELS,
    DOC_ARCHIVES: DOC_ARCHIVES,
    // The one display compression a filed category is allowed, and the table it
    // reads. Published so finance-lane.js has one owner to ask instead of a
    // second copy of the ladder, and so the suite can pin it pair by pair.
    bandLabel: bandLabel,
    FILED_BAND_LABELS: FILED_BAND_LABELS,
    // What a hand-written row has to satisfy to be in the table at all. Empty
    // list means the shipped table is clean; the suite asserts exactly that.
    curationDefects: curationDefects,
    // The same, for the document index: which form, which year, which .gov
    // document, and no figure anywhere on the row.
    documentDefects: documentDefects,
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
      return dollarRowCount();
    },
    // The same seam for the document index. Overriding it cannot introduce a
    // figure: `wealth()` reads three fields and none of them is one.
    _setDocumentTable: function (table) {
      PDX_FD_DOCUMENTS = (table && typeof table === 'object') ? table : {};
      return onFileCount();
    }
  };
})();
