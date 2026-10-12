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

   ONE EXCEPTION, WRITTEN DOWN AND NOT WORKED OUT. The holdings timeline may show
   a DISCLOSED POINT beside a filed box: the arithmetic midpoint of a closed box,
   or the floor of the open top box, always labelled with how it was made
   ("Midpoint of the filed category" / "Floor of the open-ended category"). Those
   points are a literal table (DISCLOSED_POINTS), one entry per box, pinned by a
   test against the filed ends — this module still computes none, and the band
   stays the finding beside it. A point belongs to one line: nothing adds points
   together, and nothing turns them into a net worth or a change.

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

   That wave now has a table to fill: PDX_FD_HOLDINGS, a third object, read by
   `holdings(pid)` and drawn by the disclosures block as one range band per
   line. A line is two strings — the asset as named and the category box as
   spelled — and its place on the graph is the rung that box occupies on the
   form's own ladder, found by literal lookup. It ships EMPTY: no line is typed
   in until a reviewed transcription reads it off the PDF.

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
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/9116274.pdf' },
    // The House leadership batch, resolved through the same yearly index. Each
    // is the member's 2025 annual report. Ocasio-Cortez's is the amendment the
    // index lists after her original, because it is the latest version filed.
    mike_johnson: { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10081199.pdf' },
    jeffries: { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10076550.pdf' },
    scalise: { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10075779.pdf' },
    jim_jordan: { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10076961.pdf' },
    aoc:     { kind: 'FD', year: 2025,
               formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10081499.pdf' }
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

  // ── THE HOLDINGS TABLE: LINES AS FILED, YEAR BY YEAR ───────────────────────
  // The third table, and the one the disclosures block draws. Keyed by pid, one
  // row per person, and the row is a TIMELINE OF FORMS — one per filing year,
  // oldest first — each carrying the Schedule A lines off that year's document:
  //
  //   'someone': { forms: [
  //     { year: 2024, formUrl: 'https://disclosures-clerk…/2024/x.pdf', lines: [ … ] },
  //     { year: 2025, formUrl: 'https://disclosures-clerk…/2025/y.pdf',  // = the
  //       lines: [                                                        // pill's
  //         { asset: 'Name of the asset as printed',
  //           band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 }
  //       ] }
  //   ] }
  //
  // THE NEWEST FORM IS THE PILL'S FORM. Its year and formUrl must equal the
  // PDX_FD_DOCUMENTS row for that pid, so the most recent year the graph draws is
  // always the document the disclosure pill names. Older forms are that member's
  // earlier reports — the new-filer (candidate) report where one exists, then the
  // annual reports — each an https .gov document whose path carries its own year.
  // The window differs per person because service differs: it runs from the
  // earliest form transcribed to the pill's form.
  //
  // TRANSCRIBED, NOT ESTIMATED. Every line was read off the House Clerk PDF named
  // beside it, Schedule A only: the asset name as printed (the grey parent chain
  // joined with ⇒, the bracketed asset-type code kept) and the value box as
  // ticked, in the clerk's spaced-hyphen spelling. Each form is the latest filed
  // version for its year (an amendment where the clerk's index lists one, unless
  // the amendment adds no line on the ladder). Liabilities, income and
  // transactions are not assets and are not here. A line filed in a box off the
  // ladder ('None', 'Undetermined', '$1 - $1,000', a spouse 'Over $1,000,000') is
  // left OUT rather than squeezed onto a rung, and each form says what it left
  // out. Forms the clerk filed before the 2021 electronic layout are not here: the
  // older layout does not keep wrapped asset names in reading order, and a name
  // that cannot be quoted exactly is not quoted.
  //
  // A LINE IS THE BAND, AND OPTIONALLY ONE DISCLOSED POINT. `band` is the box
  // as filed and is the finding. Beside it a line may carry `midpoint` (a closed
  // box) or `floor` (the open top box) — and that number is not typed freehand:
  // the gate refuses it unless it equals DISCLOSED_POINTS' literal entry for the
  // same box. So the only figures this table can hold are the ones a filed box
  // already determines. Lines with no point still draw as bands, as before.
  //
  // WHO IS NOT HERE. Owens: his 2025 form is a handwritten paper Form A with no
  // line on the ladder. Mike Johnson: every annual report 2021–2025 says "None
  // disclosed" under Schedule A, so there is no line to draw; his document row
  // stands on its own.
  var PDX_FD_HOLDINGS = {
      bmoore: { forms: [
          // 2021 annual report, Filing ID #10046400. Left out (off the ladder): 2 filed '$1 - $1,000', 7 filed 'None', 2 filed 'Spouse/DC Over $1,000,000'.
          { year: 2021,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2021/10046400.pdf',
            lines: [
            { asset: 'Blue Crimson, LLC [OL]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ AAPL - Apple Inc. [OP]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ AAPL - Apple Inc. [OP]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Alphabet Inc. - Class A (GOOGL) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Amazon.com, Inc. (AMZN) [ST]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ American Express Company (AXP) [ST]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Apple Inc. (AAPL) [ST]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Boeing Company (BA) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Facebook, Inc. - Class A (FB) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ HealthEquity, Inc. (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IWM - iShares Russell 2000 ETF [OP]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Johnson & Johnson (JNJ) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Raytheon Technologies Corporation (RTX) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ SPY - SPDR S&P 500 ETF Trust [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ TD Ameritrade Money Market Fund/MMDA12 [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Vanguard S&P 500 ETF (VOO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ Walt Disney Company (DIS) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alphabet Inc. - Class C Capital Stock (GOOG) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Amazon.com, Inc. (AMZN) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ American Express Company (AXP) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Boeing Company (BA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ HealthEquity, Inc. (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Johnson & Johnson (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Raytheon Technologies Corporation (RTX) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Amazon.com, Inc. (AMZN) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ American Express Company (AXP) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ HealthEquity, Inc. (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Johnson & Johnson (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Lending Club ⇒ Lending Club [OT]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Medica Santa Carmen Impact Investment [OL]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ 529 Account - DC3 [5P]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ 529 Account - DC1 [5P]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ 529 Account - DC2 [5P]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ UTAJX - Target Enrollment 2032/2033 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Residential Rental Property [RP]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ ARTMX - ARTISAN MID CAP [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ BHYIX - BLACKROCK HIGH YIELD BOND INSTITUTIONAL [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ CSRSX - COHEN & STEERS REALTY SHARES [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ EGFFX - EDGEWOOD GROWTH FUND RETAIL CLASS [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ FCTR - FIRST TR EXCHANGE-TRADED FD LUNT US FACTOR [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ FDRXX - FIDELITY GOVERNMENT CASH RESERVES [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ GGSYX - GRANDEUR PEAK GLOBAL STALWARTS INVESTOR [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ GPRIX - GRANDEUR PEAK GLBL REACH FD INSTL [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ IJH - ISHARES S&P MIDCAP 400 INDEX FUND [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ iShares TIPS Bond (TIP [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ JP Morgan Ultra-Short Income Exchange-Traded Fund (JPST) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ MWTTX - METROPOLITAN WEST TOT RETURN BOND CL I-2 [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ OAYIX - OAKMARK INTL ADVISOR FUND [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ OAYMX - OAKMARK FUND ADVISOR CLASS [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ PIPNX - PIMCO INCOME CL I3 [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ PRZIX - T ROWE PRICE EMERG MARKETS STOCK FUND I [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ T Rowe Price Floating Rate Investment (PRFRX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ Wasatch Small Cap Value Instl (WICVX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis Brokerage Portfolio ⇒ WIAEX - WASATCH SMALL CAP GROWTH INSTL FD [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ EGFIX - EDGEWOOD GROWTH FUND INSTL CL [MF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Soltis IRA ⇒ FDRXX - FIDELITY GOVERNMENT CASH RESERVES [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis IRA ⇒ First Trust Lunt U.S. Factor Rotation ETF (FCTR) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ GGSYX - GRANDEUR PEAK GLOBAL STALWARTS INSTL [MF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Soltis IRA ⇒ OAYMX - OAKMARK FUND ADVISOR CLASS [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ Pacer Lunt Large Cap Alternator ETF (ALTL) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Soltis IRA ⇒ WIAEX - WASATCH SMALL CAP GROWTH INSTL FD [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Wells Fargo Personal Savings Account [BA]',
              band: '$250,001 - $500,000', midpoint: 375000.5 }
            ] },
          // 2022 annual report, Filing ID #10051783. Left out (off the ladder): 41 filed 'None', 2 filed 'Spouse/DC Over $1,000,000'.
          { year: 2022,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2022/10051783.pdf',
            lines: [
            { asset: 'Blue Crimson, LLC ⇒ Cash Account [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Cicero Impact Capital - Impact Investment Fund ⇒ Medica Santa Carmen Impact Investment [OL]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alphabet Inc. - Class C Capital Stock (GOOG) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Amazon.com, Inc. (AMZN) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ American Express Company (AXP) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Boeing Company (BA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ HealthEquity, Inc. (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Johnson & Johnson (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Raytheon Technologies Corporation (RTX) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Amazon.com, Inc. (AMZN) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ American Express Company (AXP) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ HealthEquity, Inc. (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Johnson & Johnson (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Raytheon Technologies Corporation (RTX) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Apple Inc. (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Bank of America Corporation (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Berkshire Hathaway Inc. New (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Meta Platforms, Inc. - Class A (FB) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Microsoft Corporation (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Lending Club ⇒ Lending Club Loan Portfolio [OT]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ UTAJX - Target Enrollment 2032/2033 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC4 ⇒ UTANX - Target Enrollment 2040/2041 [5P]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Residential Rental Property [RP]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Soltis IRA ⇒ EGFIX - EDGEWOOD GROWTH FUND INSTL CL [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Soltis IRA ⇒ FDRXX - FIDELITY GOVERNMENT CASH RESERVES [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Soltis IRA ⇒ First Trust Lunt U.S. Factor Rotation ETF (FCTR) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ GGSYX - GRANDEUR PEAK GLOBAL STALWARTS INSTL [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Soltis IRA ⇒ OAYMX - OAKMARK FUND ADVISOR CLASS [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ Pacer Lunt Large Cap Alternator ETF (ALTL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Soltis IRA ⇒ WIAEX - WASATCH SMALL CAP GROWTH INSTL FD [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'THE BLAKE D. MOORE BLIND TRUST U/A 06/07/22 [EQ]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'Wells Fargo Personal Savings Account [BA]',
              band: '$500,001 - $1,000,000', midpoint: 750000.5 }
            ] },
          // 2023 amendment, Filing ID #10071732. Left out (off the ladder): 1 filed 'None', 2 filed 'Spouse/DC Over $1,000,000'.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10071732.pdf',
            lines: [
            { asset: 'Hawkins Development [OT]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'THE BLAKE D. MOORE BLIND TRUST U/A 06/07/22 [EQ]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'Wells Fargo Personal Savings Account [BA]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Blue Crimson, LLC ⇒ Cash Account [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Cicero Impact Capital - Impact Investment Fund ⇒ Medica Santa Carmen Impact Investment [OL]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alibaba Group Holding Limited American Depositary Shares each representing eight Ordinary share (BABA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Alphabet Inc. - Class C Capital Stock (GOOG) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Amazon.com, Inc. - Common Stock (AMZN) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ American Express Company Common Stock (AXP) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Bank of America Corporation Common Stock (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Berkshire Hathaway Inc. New Common Stock (BRK.B) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Boeing Company (BA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ HealthEquity, Inc. - Common Stock (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Johnson & Johnson Common Stock (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Meta Platforms, Inc. - Class A Common Stock (META) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Microsoft Corporation - Common Stock (MSFT) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ RTX Corporation Common Stock (RTX) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Amazon.com, Inc. - Common Stock (AMZN) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ American Express Company Common Stock (AXP) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Bank of America Corporation Common Stock (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Berkshire Hathaway Inc. New Common Stock (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ HealthEquity, Inc. - Common Stock (HQY) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Johnson & Johnson Common Stock (JNJ) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Meta Platforms, Inc. - Class A Common Stock (META) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Microsoft Corporation - Common Stock (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ RTX Corporation Common Stock (RTX) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Walt Disney Company (DIS) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Alphabet Inc. - Class C Capital Stock (GOOG) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Amazon.com, Inc. - Common Stock (AMZN) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ American Express Company Common Stock (AXP) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Bank of America Corporation Common Stock (BAC) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Berkshire Hathaway Inc. New Common Stock (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Meta Platforms, Inc. - Class A Common Stock (META) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Microsoft Corporation - Common Stock (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Lending Club ⇒ Lending Club Loan Portfolio [OT]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ UTAJX - Target Enrollment 2032/2033 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC4 ⇒ Target Enrollment 2040/2041 Investment Option (UTANX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2024 annual report, Filing ID #10066531. Left out (off the ladder): 22 filed 'None', 2 filed 'Spouse/DC Over $1,000,000'.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10066531.pdf',
            lines: [
            { asset: 'Hawkins Development [OT]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Residential Rental Property [RP]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'THE BLAKE D. MOORE BLIND TRUST U/A 06/07/22 [EQ]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'Wells Fargo Personal Savings Account [BA]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Zion’s Bank Checking Account [BA]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Blue Crimson, LLC ⇒ Cash Account - Wells Fargo [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Cicero Impact Capital - Impact Investment Fund ⇒ Medica Santa Carmen Impact Investment [OL]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ UTAJX - Target Enrollment 2032/2033 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC4 ⇒ Target Enrollment 2040/2041 Investment Option (UTANX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2025 annual report, Filing ID #10074823. Left out (off the ladder): 2 filed 'Spouse/DC Over $1,000,000'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074823.pdf',
            lines: [
            { asset: 'Hawkins Development [OT]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Residential Rental Property [RP]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'THE BLAKE D. MOORE BLIND TRUST U/A 06/07/22 [EQ]',
              band: '$1,000,001 - $5,000,000', midpoint: 3000000.5 },
            { asset: 'Wells Fargo Personal Savings Account [BA]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Zion’s Bank Checking Account [BA]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Blue Crimson, LLC ⇒ Cash Account - Wells Fargo [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA IRA (BM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (BM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ SPDR S&P 500 (SPY) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Iron Gate GA Brokerage Portfolio ⇒ IGGA ROTH IRA (JM) ⇒ Vanguard Growth ETF (VUG) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'my529 ⇒ 529 Account - DC3 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC1 ⇒ UTALX - Target Enrollment 2036/2037 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC2 ⇒ UTAJX - Target Enrollment 2032/2033 [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'my529 ⇒ 529 Account - DC4 ⇒ Target Enrollment 2040/2041 Investment Option (UTANX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] }
      ] },
      maloy: { forms: [
          // 2023 new filer report, Filing ID #10061120. Left out (off the ladder): nothing.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10061120.pdf',
            lines: [
            { asset: 'Invesco Gov Money Market Cash Reserves A ⇒ Invesco Government Money Market Fund Cash Reserve Shares (AIMXX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Invesco Select Risk Growth Investor A ⇒ Invesco Select Risk: Growth Investor Fund Class A (AADAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Utah Retirement Systems ⇒ Utah Retirement System [PE]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2024 annual report, Filing ID #10069198. Left out (off the ladder): nothing.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10069198.pdf',
            lines: [
            { asset: 'Invesco Gov Money Market Cash Reserves A ⇒ Invesco Government Money Market Fund Cash Reserve Shares (AIMXX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Invesco Select Risk Growth Investor A ⇒ Invesco Select Risk: Growth Investor Fund Class A (AADAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Utah Retirement Systems ⇒ Utah Retirement System [PE]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2025 annual report, Filing ID #10081600. Left out (off the ladder): nothing.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10081600.pdf',
            lines: [
            { asset: 'Invesco Gov Money Market Cash Reserves A ⇒ Invesco Government Money Market Fund Cash Reserve Shares (AIMXX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Invesco Select Risk Growth Investor A ⇒ Invesco Select Risk: Growth Investor Fund Class A (AADAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Utah Retirement Systems ⇒ Utah Retirement System [PE]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] }
      ] },
      kennedy: { forms: [
          // 2024 new filer report, Filing ID #10066533. Left out (off the ladder): 2 filed '$1 - $1,000', 2 filed 'None'.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10066533.pdf',
            lines: [
            { asset: 'Alta CDs [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Alta Checking Account [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Cash Account - Schwab [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Kennedy for US Senate [DO]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Mike Kennedy for Utah [DO]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Azova, Inc. ⇒ Azova, Inc. [PS]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Bank 1 ⇒ Savings [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Bank 2 ⇒ Savings [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank 3 ⇒ Savings [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 401A ⇒ FID FRDM BLND 2035 [OT]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ DFA U.S. Targeted Value Portfolio (DFFVX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ Fidelity Diversified International Fund Class K (FDIKX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ Fidelity Freedom Blend 2035 Fund Class K6 (FHJDX) [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ DFA U.S. Targeted Value Portfolio (DFFVX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ Fidelity Diversified International Fund Class K (FDIKX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ Fidelity Freedom Blend 2035 Fund Class K6 (FHJDX) [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Michael Kennedy, MD, Inc. ⇒ Premier Family Medical, LLC [OL]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Schwab accounts ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ ASML Holding N.V. - New York Registry Shares (ASML) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Cloudflare, Inc. Class A Common Stock (NET) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ EA Series Trust Strive U.S. Energy ETF (DRLL) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Microsoft Corporation - Common Stock (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Schwab S&P 500 Index Fund- Select Shares (SWPPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'State Retirement ⇒ URS Retirement Plan-401(k) Target Date 2035, 100% Interest [OT]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2025 annual report, Filing ID #10074834. Left out (off the ladder): 1 filed '$1 - $1,000'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074834.pdf',
            lines: [
            { asset: 'Alta CDs [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Alta Checking Account [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Cash Account - Schwab [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Kennedy for US Senate [DO]',
              band: '$250,001 - $500,000', midpoint: 375000.5 },
            { asset: 'Mike Kennedy for Utah [DO]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Azova, Inc. ⇒ Azova, Inc. [PS]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Bank 1 ⇒ Savings [BA]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Bank 2 ⇒ Savings [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank 3 ⇒ Savings [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 401A ⇒ FID FRDM BLND 2035 [OT]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ DFA U.S. Targeted Value Portfolio (DFFVX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ Fidelity Diversified International Fund Class K (FDIKX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 403b ⇒ Fidelity Freedom Blend 2035 Fund Class K6 (FHJDX) [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ DFA U.S. Targeted Value Portfolio (DFFVX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ Fidelity Diversified International Fund Class K (FDIKX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Fidelity Investments ⇒ UUHC 457B ⇒ Fidelity Freedom Blend 2035 Fund Class K6 (FHJDX) [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Michael Kennedy, MD, Inc. ⇒ Premier Family Medical, LLC [OL]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Schwab accounts ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Schwab accounts ⇒ ASML Holding N.V. - New York Registry Shares (ASML) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Berkshire Hathaway Inc. New Common Stock (BRK.B) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Cloudflare, Inc. Class A Common Stock (NET) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ EA Series Trust Strive U.S. Energy ETF (DRLL) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Invesco QQQ Trust, Series 1 (QQQ) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Microsoft Corporation - Common Stock (MSFT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Schwab S&P 500 Index Fund- Select Shares (SWPPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Tesla, Inc. - Common Stock (TSLA) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Schwab accounts ⇒ Vanguard S&P 500 ETF (VOO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'State Retirement ⇒ URS Retirement Plan-401(k) Target Date 2035, 100% Interest [OT]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] }
      ] },
      jeffries: { forms: [
          // 2021 annual report, Filing ID #10046507. Left out (off the ladder): 3 filed 'None', 1 filed 'Undetermined'.
          { year: 2021,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2021/10046507.pdf',
            lines: [
            { asset: 'Acorn Securities, LLC ⇒ Vanguard 500 Index Fund EFT (VOO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank of America Accounts [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Accounts [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Floating Rate Fund Class C (LARCX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Island Federal Credit Union Account [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ VALIC Fixed Interest Option [PE]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Equity Income Adm (VEIRX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Inst Tg Rtm 35 Inst (VITFX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Total Bond Market Index Ins Plus Shares (VBMPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Growth ETF (IUSG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Value ETF (IUSV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Developed Markets ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Emerging Markets ETF (VWO) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard Russell 2000 (VTWO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ ProShares S&P MidCap 400 Dividend Aristocrats ETF (REGL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ SPDR US DVDND ARISTOCRAT ETF (SDY) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Vanguard REIT ETF (VNQ) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Schwab US Dividend EQTY (SCHD) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Vanguard FTSE Developed ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'New York State Pension [PE]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 1) ⇒ Aggressive Age-Based Option: Conservative Portfolio [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'NY 529 Direct Plan (DC 1) ⇒ Moderate Age-Based Option: Income Portfolio [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'NY 529 Direct Plan (DC 1) ⇒ Moderate Growth Portfolio [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Aggressive Age-Based Option: Conservative Growth Portfolio [MF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Conservative Age-Based Option: Conservative Income Portfolio [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Moderate Age-Based Option: Income Portfolio [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Principal Trust Company 401K ⇒ BlackRock Lifepath Index Fund 2035 K Fund [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2022 annual report, Filing ID #10052944. Left out (off the ladder): 4 filed '$1 - $1,000', 3 filed 'None', 1 filed 'Undetermined'.
          { year: 2022,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2022/10052944.pdf',
            lines: [
            { asset: 'Acorn Securities, LLC ⇒ Vanguard 500 Index Fund EFT (VOO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank of America Accounts [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Accounts [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Floating Rate Fund Class C (LARCX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Island Federal Credit Union Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Equity Income Adm (VEIRX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Target Retirement 2035 Fund (VTTHX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Total Bond Market Index Ins Plus Shares (VBMPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Growth ETF (IUSG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Value ETF (IUSV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Developed Markets ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Emerging Markets ETF (VWO) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ ProShares S&P MidCap 400 Dividend Aristocrats ETF (REGL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ SPDR US DVDND ARISTOCRAT ETF (SDY) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Vanguard REIT ETF (VNQ) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Schwab US Dividend EQTY (SCHD) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Vanguard FTSE Developed ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'New York State Pension [PE]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Aggressive Age-Based Option: Conservative Growth Portfolio [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Conservative Age-Based Option: Conservative Income Portfolio [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Moderate Age-Based Option: Income Portfolio [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Principal Trust Company 401K ⇒ BlackRock Lifepath Index Fund 2035 K Fund [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2023 annual report, Filing ID #10059158. Left out (off the ladder): 4 filed 'None', 1 filed 'Undetermined'.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10059158.pdf',
            lines: [
            { asset: 'Bank of America Accounts [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Accounts [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Inv Tr, Lord Abbett Floating Rate Fd -- Cl C (LARCX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Island Federal Credit Union Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Equity Income Fund Admiral Shares (VEIRX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Target Retirement 2035 Fund (VTTHX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Total Bond Market Insti Plus Shares (VBMPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ iShares Core S&P U.S. Growth ETF (IUSG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Value ETF (IUSV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Developed Markets ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Emerging Markets ETF (VWO) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard Russell 2000 ETF (VTWO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Merrill Lynch Direct Deposit Program [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ ProShares S&P MidCap 400 Dividend Aristocrats ETF (REGL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ SPDR S&P Dividend ETF (SDY) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Vanguard Real Estate ETF (VNQ) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Merrill Lynch Direct Deposit Program [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'New York State Pension [PE]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Interest Accumulation Portfolio [5F]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Principal Trust Company 401K ⇒ BlackRock Lifepath Index Fund 2035 K Fund [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2024 annual report, Filing ID #10066511. Left out (off the ladder): 2 filed '$1 - $1,000', 2 filed 'Undetermined'.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10066511.pdf',
            lines: [
            { asset: 'Bank of America Accounts [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Accounts [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Island Federal Credit Union Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'New York State Pension [PE]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ EuroPacific Growth Fund Cl R-6 (RERGX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Fidelity Total Bond K6 Fund (FTKFX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Guaranteed Income Fund [OT]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Inv Tr, Lord Abbett Floating Rate Fd -- Cl C (LARCX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Equity Income Fund Admiral Shares (VEIRX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Target Retirement 2035 Fund (VTTHX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Total Bond Market Insti Plus Shares (VBMPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ iShares Core S&P U.S. Growth ETF (IUSG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ ISHARES Core S&P U.S. Value ETF (IUSV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Developed Markets ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Emerging Markets ETF (VWO) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard Russell 2000 ETF (VTWO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ ProShares S&P MidCap 400 Dividend Aristocrats ETF (REGL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ SPDR S&P Dividend ETF (SDY) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Vanguard Real Estate ETF (VNQ) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement - CMA ⇒ Merrill Lynch Direct Deposit Program [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Principal Trust Company 401K ⇒ BlackRock Lifepath Index Fund 2035 K Fund [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Vanguard Brokerage (DC 2) ⇒ Vanguard 500 Index Fd Admiral Shs (VFIAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2025 annual report, Filing ID #10076550. Left out (off the ladder): 1 filed '$1 - $1,000', 2 filed 'None', 2 filed 'Undetermined'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10076550.pdf',
            lines: [
            { asset: 'Bank of America [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank of America [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank of America [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Bank of America Accounts [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Accounts [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Island Federal Credit Union Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'New York State Pension [PE]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Northwestern Mutual Whole Life Insurance Policy [WU]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ EuroPacific Growth Fund Cl R-6 (RERGX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Fidelity Large Cap Growth Index Fund (FSPGX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Fidelity Total Bond K6 Fund (FTKFX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Guaranteed Income Fund [OT]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Janus Henderson Enterprise Fund - N Shares (JDMNX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ MFS Mid Cap Value Fund Class R6 (MVCKX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Empower - Legal Services 403b Plan ⇒ Vanguard Equity Income Fund Admiral Shares (VEIRX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Inv Tr, Lord Abbett Floating Rate Fd - Cl A (LFRAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'HSBC Brokerage Account ⇒ Lord Abbett Inv Tr, Lord Abbett Floating Rate Fd -- Cl C (LARCX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Equity Income Fund Admiral Shares (VEIRX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Target Retirement 2035 Fund (VTTHX) [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Lutheran Medical Center 401K ⇒ Vanguard Total Bond Market Insti Plus Shares (VBMPX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ iShares Core S&P U.S. Growth ETF (IUSG) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ iShares Core S&P U.S. Value ETF (IUSV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Developed Markets ETF (VEA) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard FTSE Emerging Markets ETF (VWO) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Guided Investing Traditional IRA ⇒ Vanguard Russell 2000 ETF (VTWO) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ ProShares S&P MidCap 400 Dividend Aristocrats ETF (REGL) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ SPDR S&P Dividend ETF (SDY) [EF]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Merrill Edge Investment Account-Non Retirement ⇒ Vanguard Real Estate ETF (VNQ) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'NY 529 Direct Plan (DC 2) ⇒ Target Enrollment 2025 [5F]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Principal Trust Company 401K ⇒ BlackRock Lifepath Index Fund 2035 K Fund [MF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Vanguard Brokerage (DC 2) ⇒ Vanguard 500 Index Fd Admiral Shs (VFIAX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] }
      ] },
      scalise: { forms: [
          // 2021 annual report, Filing ID #10046343. Left out (off the ladder): nothing.
          { year: 2021,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2021/10046343.pdf',
            lines: [
            { asset: 'Trust Bank Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2022 annual report, Filing ID #10051856. Left out (off the ladder): nothing.
          { year: 2022,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2022/10051856.pdf',
            lines: [
            { asset: 'Trust Bank Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2023 annual report, Filing ID #10057111. Left out (off the ladder): nothing.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10057111.pdf',
            lines: [
            { asset: 'Trust Bank Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2024 annual report, Filing ID #10067107. Left out (off the ladder): nothing.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10067107.pdf',
            lines: [
            { asset: 'Trust Bank Account [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2025 annual report, Filing ID #10075779. Left out (off the ladder): 1 filed 'Undetermined'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10075779.pdf',
            lines: [] }
      ] },
      jim_jordan: { forms: [
          // 2021 annual report, Filing ID #10046901. Left out (off the ladder): 2 filed '$1 - $1,000', 2 filed 'Undetermined'.
          { year: 2021,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2021/10046901.pdf',
            lines: [
            { asset: 'Ohio Public Employees Retirement System Defined Benefit Plan [DB]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Ohio State Teachers Retirement System Defined Benefit Plan [DB]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Security National Bank [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Security National Bank [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Universal Guaranty Life [WU]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2022 annual report, Filing ID #10053666. Left out (off the ladder): 2 filed 'None', 5 filed 'Undetermined'.
          { year: 2022,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2022/10053666.pdf',
            lines: [
            { asset: 'Ohio Public Employees Retirement System Defined Benefit Plan [DB]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Security National Bank [BA]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Security National Bank [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2023 annual report, Filing ID #10058918. Left out (off the ladder): 2 filed 'None', 5 filed 'Undetermined'.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10058918.pdf',
            lines: [
            { asset: 'Ohio Public Employees Retirement System Defined Benefit Plan [DB]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Security National Bank [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Security National Bank [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2024 annual report, Filing ID #10067361. Left out (off the ladder): 5 filed 'Undetermined'.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10067361.pdf',
            lines: [
            { asset: 'Ohio Public Employees Retirement System Defined Benefit Plan [DB]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Park National Bank [BA]',
              band: '$50,001 - $100,000', midpoint: 75000.5 },
            { asset: 'Park National Bank [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 }
            ] },
          // 2025 annual report, Filing ID #10076961. Left out (off the ladder): 1 filed 'None', 5 filed 'Undetermined'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10076961.pdf',
            lines: [
            { asset: 'Ohio Public Employees Retirement System Defined Benefit Plan [DB]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Park National Bank [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Park National Bank [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Stickley Farm [RP]',
              band: '$100,001 - $250,000', midpoint: 175000.5 },
            { asset: 'Inherited IRA ⇒ Apple Inc. - Common Stock (AAPL) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Capital Group Core Balanced ETF (CGBL) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Capital Group Dividend Value ETF (CGDV) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Edward Jones Single Account [IH]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Hartford Total Return Bond ETF (HTRB) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Invesco NASDAQ 100 ETF (QQQM) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ iShares Russell 2000 Index Fund (IWM) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ MFS Active International ETF (MFSI) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Park National Corporation Common Stock (PRK) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ PGIM Total Return Bond Fund Class R6 (PTRQX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ T. Rowe Price Blue Chip Growth ETF (TCHP) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Vanguard S&P 500 ETF (VOO) [EF]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Inherited IRA ⇒ Vanguard Total Bond Market ETF (BND) [EF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Inherited IRA ⇒ Walmart Inc. - Common Stock (WMT) [ST]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] }
      ] },
      aoc: { forms: [
          // 2021 annual report, Filing ID #10046833. Left out (off the ladder): nothing.
          { year: 2021,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2021/10046833.pdf',
            lines: [
            { asset: 'Allied Bank Savings Account [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Charles Schwab Bank Checking [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Charles Schwab One Brokerage [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'National Hispanic Institute Inc 401k Plan ⇒ PRUDENTIAL HIGH YIELD Z [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2022 annual report, Filing ID #10052480. Left out (off the ladder): nothing.
          { year: 2022,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2022/10052480.pdf',
            lines: [
            { asset: 'Allied Bank Savings Account [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Charles Schwab Bank Checking [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Charles Schwab One Brokerage [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'National Hispanic Institute Inc 401k Plan ⇒ PRUDENTIAL HIGH YIELD Z [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2023 annual report, Filing ID #10060351. Left out (off the ladder): 1 filed '$1 - $1,000'.
          { year: 2023,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2023/10060351.pdf',
            lines: [
            { asset: 'Allied Bank Savings Account [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'Charles Schwab Bank Checking [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'National Hispanic Institute Inc 401k Plan ⇒ PRUDENTIAL HIGH YIELD Z [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2024 annual report, Filing ID #10066093. Left out (off the ladder): 1 filed '$1 - $1,000'.
          { year: 2024,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10066093.pdf',
            lines: [
            { asset: 'Allied Bank Savings Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Charles Schwab Bank Checking [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'National Hispanic Institute Inc 401k Plan ⇒ PRUDENTIAL HIGH YIELD Z [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] },
          // 2025 amendment, Filing ID #10081499. Left out (off the ladder): 1 filed '$1 - $1,000'.
          { year: 2025,
            formUrl: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10081499.pdf',
            lines: [
            { asset: 'Allied Bank Savings Account [BA]',
              band: '$15,001 - $50,000', midpoint: 32500.5 },
            { asset: 'Charles Schwab Bank Checking [BA]',
              band: '$1,001 - $15,000', midpoint: 8000.5 },
            { asset: 'National Hispanic Institute Inc 401k Plan ⇒ T. Rowe Price Spectrum Income Fund (RPSIX) [MF]',
              band: '$1,001 - $15,000', midpoint: 8000.5 }
            ] }
      ] }
  };

  // THE FORM'S OWN LADDER OF CATEGORIES, IN THE ORDER THE FORM PRINTS THEM.
  // Each rung is one filed category, written as the short label bandLabel()
  // already maps every filed spelling onto. A bar's place is its rung: its left
  // edge is the boundary where that category begins on the form, its right edge
  // the boundary where it ends. Position comes from WHICH BOX WAS TICKED, looked
  // up by literal key — no digit is read and no bound is parsed. The top rung has
  // no ceiling on the form, and the graph draws it open-ended rather than
  // inventing one.
  var BAND_LADDER = ['$1–15K', '$15–50K', '$50–100K', '$100–250K', '$250–500K',
                     '$500K–1M', '$1–5M', '$5–25M', '$25–50M', 'over $50M'];
  function bandRung(filed) {
    if (filed == null) return -1;
    var raw = String(filed).trim();
    if (!Object.prototype.hasOwnProperty.call(FILED_BAND_LABELS, raw)) return -1;
    return BAND_LADDER.indexOf(FILED_BAND_LABELS[raw]);
  }

  // ── THE DISCLOSED POINTS: ONE PER BOX, WRITTEN DOWN, NOT WORKED OUT ───────
  // NO MIDPOINT MATH happens in this module, still. What changed is that a
  // midpoint may now be SHOWN, and the only midpoints that can be shown are
  // these: one literal entry per rung, typed once, pinned value for value by
  // scripts/test-wealth-bands.mjs against the filed box's own two ends.
  //   CLOSED BOX → the arithmetic midpoint of its two ends, basis 'midpoint'.
  //   OPEN TOP BOX ('Over $50,000,000') → its floor, basis 'floor'. The form
  //   gives it no ceiling, so it has no middle; it is labelled a floor.
  // `label` is the compact display of `value` (rounded to the label's unit — a
  // signal, not a dollar count). `value` is what the graph places by.
  //   NEVER SUMMED. A point belongs to one line. Nothing here or in the lane
  // adds points together, averages them across lines, or turns them into a net
  // worth, a per-year figure or a percent change.
  var DISCLOSED_POINTS = {
    '$1–15K':    { basis: 'midpoint', value: 8000.5,     label: '$8K' },
    '$15–50K':   { basis: 'midpoint', value: 32500.5,    label: '$32.5K' },
    '$50–100K':  { basis: 'midpoint', value: 75000.5,    label: '$75K' },
    '$100–250K': { basis: 'midpoint', value: 175000.5,   label: '$175K' },
    '$250–500K': { basis: 'midpoint', value: 375000.5,   label: '$375K' },
    '$500K–1M':  { basis: 'midpoint', value: 750000.5,   label: '$750K' },
    '$1–5M':     { basis: 'midpoint', value: 3000000.5,  label: '$3M' },
    '$5–25M':    { basis: 'midpoint', value: 15000000.5, label: '$15M' },
    '$25–50M':   { basis: 'midpoint', value: 37500000.5, label: '$37.5M' },
    'over $50M': { basis: 'floor',    value: 50000000,   label: '$50M' }
  };
  // THE DISCLOSURE SENTENCE, ONE PER BASIS. Every surface that prints a point
  // prints the sentence for its basis beside it, in these exact words.
  var POINT_METHOD = {
    midpoint: 'Midpoint of the filed category',
    floor: 'Floor of the open-ended category'
  };
  function pointFor(filed) {
    var r = bandRung(filed);
    if (r < 0) return null;
    var p = DISCLOSED_POINTS[BAND_LADDER[r]];
    return p ? { basis: p.basis, value: p.value, label: p.label, method: POINT_METHOD[p.basis] } : null;
  }

  // THE HOLDINGS GATE. Same posture as the two above: it names the pid and the
  // rule, never repairs, never drops silently.
  //   SHAPE     { forms: [ … ] }, or the single-form shape { year, formUrl,
  //             lines } a row could carry before the timeline existed.
  //   DOCUMENT  the newest form's year and formUrl equal the document row the
  //             pill names. No document row, no holdings row.
  //   EACH FORM a four-digit year, no year twice, an https .gov formUrl, no URL
  //             twice, and on the House Clerk's archive a path that carries the
  //             form's own year. A form may have no line on the ladder (it is
  //             still a year on file); the row as a whole must have one.
  //   LINES     exactly { asset, band } plus at most one disclosed point: a
  //             non-empty asset name, a band on the ladder, and `midpoint` (closed
  //             box) or `floor` (open box) equal to DISCLOSED_POINTS for it.
  //   NO FIGURE, NO TENURE, NOTHING ELSE — on the row, a form, or a line.
  var HOLDING_FIELDS = ['year', 'formUrl', 'lines'];
  var ROW_SHAPE_FIELDS = ['forms'];
  var LINE_FIELDS = ['asset', 'band', 'midpoint', 'floor'];
  function formsOf(row) {
    if (row && Array.isArray(row.forms)) return row.forms;
    return row ? [row] : [];
  }
  function lineDefects(tag, ln) {
    var out = [];
    if (!ln || typeof ln !== 'object') return [tag + ' is not an object'];
    var asset = (ln.asset == null) ? '' : String(ln.asset).trim();
    if (!asset) out.push(tag + ' has no asset name');
    var p = pointFor(ln.band);
    if (!p) out.push(tag + ' band is not a filed category on the ladder');
    var hasMid = Object.prototype.hasOwnProperty.call(ln, 'midpoint');
    var hasFloor = Object.prototype.hasOwnProperty.call(ln, 'floor');
    if (hasMid && hasFloor) out.push(tag + ' carries both a midpoint and a floor');
    if (p && hasMid && (p.basis !== 'midpoint' || ln.midpoint !== p.value)) {
      out.push(tag + ' midpoint is not the disclosed midpoint of its filed category');
    }
    if (p && hasFloor && (p.basis !== 'floor' || ln.floor !== p.value)) {
      out.push(tag + ' floor is not the floor of an open-ended filed category');
    }
    for (var lk in ln) {
      if (!Object.prototype.hasOwnProperty.call(ln, lk)) continue;
      if (LINE_FIELDS.indexOf(lk) < 0) out.push(tag + ' carries unrecognised field ' + lk);
    }
    return out;
  }
  function holdingsRowDefects(pid, row, docs) {
    var out = [];
    if (!row || typeof row !== 'object') return [pid + ': row is not an object'];
    var doc = docs && Object.prototype.hasOwnProperty.call(docs, pid) ? docs[pid] : null;
    var timeline = Array.isArray(row.forms);
    if (Object.prototype.hasOwnProperty.call(row, 'forms') && !timeline) {
      out.push(pid + ': forms is not a list');
    }
    var forms = formsOf(row);
    if (!forms.length) out.push(pid + ': forms is not a non-empty list');
    var seenYear = {}, seenUrl = {}, newest = null, anyLine = false;
    for (var f = 0; f < forms.length; f++) {
      var form = forms[f], ftag = timeline ? pid + ': form ' + (f + 1) : pid;
      if (!form || typeof form !== 'object') { out.push(ftag + ' is not an object'); continue; }
      var yr = (form.year == null) ? '' : String(form.year).trim();
      var url = (form.formUrl == null) ? '' : String(form.formUrl).trim();
      if (!/^[12][0-9]{3}$/.test(yr)) out.push(ftag + ': year is not a four-digit form year');
      else if (seenYear[yr]) out.push(ftag + ': year ' + yr + ' appears twice');
      seenYear[yr] = true;
      if (!url) {
        out.push(ftag + ': formUrl is empty — no lines without the document they came off');
      } else if (!/^https:\/\/[^\/?#]*\.gov(?:[:\/?#]|$)/i.test(url)) {
        out.push(ftag + ': formUrl is not an https link to a .gov document (' + urlForMessage(url) + ')');
      } else {
        if (seenUrl[url]) out.push(ftag + ': formUrl appears twice');
        seenUrl[url] = true;
        if (hostOf(url) === 'disclosures-clerk.house.gov' && yr &&
            url.indexOf('/' + yr + '/') < 0) {
          out.push(ftag + ': formUrl is not filed under the form’s own year');
        }
      }
      if (/^[12][0-9]{3}$/.test(yr) && (!newest || yr > newest.yr)) newest = { yr: yr, url: url };
      var lines = form.lines;
      if (!Array.isArray(lines) || (!timeline && !lines.length)) {
        out.push(ftag + ': lines is not a non-empty list');
        lines = Array.isArray(lines) ? lines : [];
      }
      if (lines.length) anyLine = true;
      for (var i = 0; i < lines.length; i++) {
        out = out.concat(lineDefects(ftag + ': line ' + (i + 1), lines[i]));
      }
      for (var fk in form) {
        if (!Object.prototype.hasOwnProperty.call(form, fk)) continue;
        if (HOLDING_FIELDS.indexOf(fk) >= 0) continue;
        if (!timeline && (ROW_SHAPE_FIELDS.indexOf(fk) >= 0 || TENURE_FIELDS.indexOf(fk) >= 0)) continue;
        out.push(ftag + ': unrecognised field ' + fk);
      }
    }
    if (timeline && forms.length && !anyLine) out.push(pid + ': no form carries a line on the ladder');
    if (!doc) {
      out.push(pid + ': no document row — lines can only come off the form the pill names');
    } else if (!newest || String(doc.formUrl || '').trim() !== newest.url ||
               String(doc.year == null ? '' : doc.year).trim() !== newest.yr) {
      out.push(pid + ': year or formUrl does not match the document row — the newest form must be the form the pill names');
    }
    for (var t = 0; t < TENURE_FIELDS.length; t++) {
      if (Object.prototype.hasOwnProperty.call(row, TENURE_FIELDS[t])) {
        out.push(pid + ': carries ' + TENURE_FIELDS[t] + ' — tenure comes only from _pdxTenure');
      }
    }
    if (timeline) {
      for (var key in row) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
        if (ROW_SHAPE_FIELDS.indexOf(key) >= 0) continue;
        if (TENURE_FIELDS.indexOf(key) >= 0) continue;
        out.push(pid + ': unrecognised field ' + key);
      }
    }
    return out;
  }
  function holdingsDefects(table) {
    var t = (table && typeof table === 'object') ? table : PDX_FD_HOLDINGS;
    var out = [];
    for (var pid in t) {
      if (!Object.prototype.hasOwnProperty.call(t, pid)) continue;
      out = out.concat(holdingsRowDefects(pid, t[pid], PDX_FD_DOCUMENTS));
    }
    return out;
  }

  // ── HOLDINGS: THE LINES TO DRAW, OR NULL ──────────────────────────────────
  // Null unless the row passes the gate AND the document read answers for the
  // same pid. What comes back:
  //   year, formUrl, lines  the newest form (the pill's), lines ordered top
  //                         category first, filing order within a category
  //   years                 every form, oldest first, lines in the same order
  // Each line carries the band as filed, its short label, its rung, and `point`
  // — { basis, value, label, method } off DISCLOSED_POINTS when the row stored
  // one, or null when it did not. No subtotal, no per-year figure, no change.
  function readLines(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i], filed = String(ln.band).trim();
      var stored = Object.prototype.hasOwnProperty.call(ln, 'midpoint') ||
                   Object.prototype.hasOwnProperty.call(ln, 'floor');
      out.push({ asset: String(ln.asset).trim(), filed: filed, band: bandLabel(filed),
                 rung: bandRung(filed), point: stored ? pointFor(filed) : null, at: i });
    }
    out.sort(function (a, b) { return (b.rung - a.rung) || (a.at - b.at); });
    return out.map(function (l) {
      return { asset: l.asset, filed: l.filed, band: l.band, rung: l.rung, point: l.point };
    });
  }
  function holdings(pid) {
    if (!pid || !Object.prototype.hasOwnProperty.call(PDX_FD_HOLDINGS, pid)) return null;
    var row = PDX_FD_HOLDINGS[pid];
    if (holdingsRowDefects(pid, row, PDX_FD_DOCUMENTS).length) return null;
    if (!wealth(pid, null)) return null;
    var years = formsOf(row).map(function (f) {
      return { year: String(f.year).trim(), formUrl: String(f.formUrl).trim(), lines: readLines(f.lines) };
    }).sort(function (a, b) { return a.year < b.year ? -1 : (a.year > b.year ? 1 : 0); });
    var newest = years[years.length - 1];
    return {
      year: newest.year,
      formUrl: newest.formUrl,
      rungs: BAND_LADDER.slice(),
      lines: newest.lines,
      years: years
    };
  }

  // ── COMMITTEE OVERLAP: A FILED HOLDING BESIDE A DEFENSE COMMITTEE SEAT ─────
  // Under the wealth graph, one plain sentence per overlap — "Holds BA while on
  // House Armed Services." — and the largest public contract award signed with
  // that company in each year the graph covers. Three tables, and the overlap
  // itself is NOT one of them: it is DERIVED, so it cannot be typed in.
  //
  //   DEFENSE_CONTRACTORS  which tickers count, by literal key. The large prime
  //                        Department of Defense contractors; a holding is
  //                        matched only where a stored holdings line names the
  //                        ticker in parentheses, as the clerk prints it.
  //   PDX_COMMITTEE_SEATS  per pid, each seat on a covered committee: which
  //                        committee, which Congress, the calendar years it
  //                        spans, and the .gov roster record that seated them.
  //   PDX_CONTRACT_AWARDS  per ticker, per calendar year, the single largest
  //                        contract signed that year with the company, as
  //                        USASpending.gov publishes it: the award id, recipient,
  //                        awarding agency, description and the amount obligated
  //                        on that award to date — each with its award page.
  //
  // AN OVERLAP EXISTS ONLY WHERE THREE THINGS MEET: a stored line on a filed form
  // names a covered ticker, that form's year is a year the member held a
  // covered seat, and the seat's roster is linked. Holding the company in a year
  // off the committee is not an overlap and prints nothing.
  //
  // THE FIGURES ARE PUBLISHED ONES AND STAY SEPARATE. Each award amount is the
  // obligation USASpending prints on the award page it links to, quoted as
  // published. Nothing adds awards together, divides them by anything, or puts
  // them beside the member's own bands as if they were the member's money: an
  // award is federal money to a company, not a figure about this person, and
  // there is no "profit", no share of anything and no combined line.
  //
  //   NEVER_FEEDS, as everywhere on this lane. Not an input to any score,
  // match, tier, floor, count or sort.
  var DEFENSE_CONTRACTORS = {
    LMT: 'Lockheed Martin Corporation',
    RTX: 'RTX Corporation',
    BA:  'The Boeing Company',
    GD:  'General Dynamics Corporation',
    NOC: 'Northrop Grumman Corporation',
    HII: 'Huntington Ingalls Industries',
    LHX: 'L3Harris Technologies'
  };
  var COVERED_COMMITTEES = {
    HASC: 'House Armed Services',
    SASC: 'Senate Armed Services',
    HACD: 'House Appropriations, Subcommittee on Defense',
    SACD: 'Senate Appropriations, Subcommittee on Defense'
  };
  // Moore: elected to the Committee on Armed Services for the 117th Congress by
  // H.Res. 63 ("Mr. Moore of Utah"), agreed to January 28, 2021. H.Res. 80 of
  // the 118th Congress, which elected the Republican members of Armed Services
  // on January 31, 2023, does not name him, so the seat spans 2021 and 2022
  // only. No other member in the wealth timeline holds a covered ticker on a
  // stored line.
  var PDX_COMMITTEE_SEATS = {
    bmoore: [
      { committee: 'HASC', congress: 117, years: [2021, 2022],
        rosterUrl: 'https://www.govinfo.gov/content/pkg/BILLS-117hres63eh/html/BILLS-117hres63eh.htm',
        rosterLabel: 'H.Res. 63, 117th Congress' }
    ]
  };
  // Pulled from the USASpending.gov award search on AWARDS_AS_OF: contract
  // award types A–D, date signed within the calendar year, recipient search on
  // the company name, sorted by amount obligated on the award, first result.
  // The amount is cumulative on that award as of the pull, so it can move.
  var AWARDS_AS_OF = '2026-10-12';
  var PDX_CONTRACT_AWARDS = {
    BA: [
      { year: 2021, awardId: 'W58RGZ21C0015', recipient: 'THE BOEING COMPANY',
        agency: 'Department of the Army',
        description: 'APACHE ADVANCED PROCUREMENT AWARD FOR LOT 12 FULL RATE PRODUCTION.',
        obligated: 3482391743.05,
        url: 'https://www.usaspending.gov/award/CONT_AWD_W58RGZ21C0015_9700_-NONE-_-NONE-' },
      { year: 2022, awardId: 'FA863422F0035', recipient: 'THE BOEING COMPANY',
        agency: 'Department of the Air Force',
        description: 'F-15EX - LOT 4 ADVANCED PROCUREMENT',
        obligated: 2054679197.38,
        url: 'https://www.usaspending.gov/award/CONT_AWD_FA863422F0035_9700_FA863420D2704_9700' },
      { year: 2023, awardId: 'FA863423F0048', recipient: 'THE BOEING COMPANY',
        agency: 'Department of the Air Force',
        description: 'F-15EX LOT 5 ADVANCED PROCUREMENT',
        obligated: 3930670910.97,
        url: 'https://www.usaspending.gov/award/CONT_AWD_FA863423F0048_9700_FA863420D2704_9700' },
      { year: 2024, awardId: 'N0001924C0025', recipient: 'THE BOEING COMPANY',
        agency: 'Defense Contract Management Agency',
        description: 'CANADA AND GERMANY LOT 13 P-8A AIRCRAFT',
        obligated: 5765643148,
        url: 'https://www.usaspending.gov/award/CONT_AWD_N0001924C0025_9700_-NONE-_-NONE-' },
      { year: 2025, awardId: 'W58RGZ26C0002', recipient: 'THE BOEING COMPANY',
        agency: 'Department of the Army',
        description: 'APACHE NEW BUILD ATTACK HELICOPTERS (AH)-64E FOR FOREIGN MILITARY SALE CUSTOMERS POLAND (QTY OF 96), EGYPT (QTY OF 2) AND KUWAIT (QTY OF 8).  THIS INCLUDES ASSOCIATED COMPONENTS AND ACCESSORIES AND LONGBOW CREW TRAINERS (LCTS)',
        obligated: 2295831204,
        url: 'https://www.usaspending.gov/award/CONT_AWD_W58RGZ26C0002_9700_-NONE-_-NONE-' }
    ],
    RTX: [
      { year: 2021, awardId: 'FA867521C0034', recipient: 'RAYTHEON COMPANY',
        agency: 'Department of the Air Force',
        description: 'ADVANCED MEDIUM RANGE AIR TO AIR MISSILE (AMRAAM) PRODUCTION LOTS 34-36',
        obligated: 2177560015.51,
        url: 'https://www.usaspending.gov/award/CONT_AWD_FA867521C0034_9700_-NONE-_-NONE-' },
      { year: 2022, awardId: 'N0002422C5500', recipient: 'RAYTHEON COMPANY',
        agency: 'Department of the Navy',
        description: 'AN/SPY-6(V) HARDWARE PRODUCTION',
        obligated: 3265755418.12,
        url: 'https://www.usaspending.gov/award/CONT_AWD_N0002422C5500_9700_-NONE-_-NONE-' },
      { year: 2023, awardId: 'FA867523C0037', recipient: 'RAYTHEON COMPANY',
        agency: 'Department of the Air Force',
        description: 'ADVANCED MEDIUM RANGE AIR TO AIR MISSILE (AMRAAM) PRODUCTION LOT 37',
        obligated: 2516360351.4,
        url: 'https://www.usaspending.gov/award/CONT_AWD_FA867523C0037_9700_-NONE-_-NONE-' },
      { year: 2024, awardId: 'N0001924C0032', recipient: 'RAYTHEON COMPANY',
        agency: 'Department of the Navy',
        description: 'LOT 24-26 PRODUCTION - FMS',
        obligated: 3145330978,
        url: 'https://www.usaspending.gov/award/CONT_AWD_N0001924C0032_9700_-NONE-_-NONE-' },
      { year: 2025, awardId: 'FA865925CB003', recipient: 'RAYTHEON COMPANY',
        agency: 'Department of the Air Force',
        description: 'ADVANCED MEDIUM RANGE AIR-TO-AIR MISSILE (AMRAAM)LOTS 39-40',
        obligated: 3381835581.16,
        url: 'https://www.usaspending.gov/award/CONT_AWD_FA865925CB003_9700_-NONE-_-NONE-' }
    ]
  };

  var SEAT_FIELDS = ['committee', 'congress', 'years', 'rosterUrl', 'rosterLabel'];
  var AWARD_FIELDS = ['year', 'awardId', 'recipient', 'agency', 'description', 'obligated', 'url'];
  function overlapDefects() {
    var out = [];
    for (var pid in PDX_COMMITTEE_SEATS) {
      if (!Object.prototype.hasOwnProperty.call(PDX_COMMITTEE_SEATS, pid)) continue;
      var seats = PDX_COMMITTEE_SEATS[pid];
      if (!Array.isArray(seats) || !seats.length) { out.push(pid + ': seats is not a non-empty list'); continue; }
      for (var i = 0; i < seats.length; i++) {
        var st = seats[i], tag = pid + ': seat ' + (i + 1);
        if (!st || typeof st !== 'object') { out.push(tag + ' is not an object'); continue; }
        if (!Object.prototype.hasOwnProperty.call(COVERED_COMMITTEES, st.committee)) {
          out.push(tag + ' committee is not a covered committee');
        }
        if (typeof st.congress !== 'number' || st.congress < 1) out.push(tag + ' congress is not a number');
        if (!Array.isArray(st.years) || !st.years.length ||
            st.years.some(function (y) { return !/^[12][0-9]{3}$/.test(String(y)); })) {
          out.push(tag + ' years is not a list of four-digit years');
        }
        if (!/^https:\/\/[^\/?#]*\.gov(?:[:\/?#]|$)/i.test(String(st.rosterUrl || ''))) {
          out.push(tag + ' rosterUrl is not an https .gov roster record');
        }
        if (!st.rosterLabel || !String(st.rosterLabel).trim()) out.push(tag + ' has no rosterLabel');
        for (var k in st) {
          if (Object.prototype.hasOwnProperty.call(st, k) && SEAT_FIELDS.indexOf(k) < 0) {
            out.push(tag + ' carries unrecognised field ' + k);
          }
        }
      }
    }
    for (var t in PDX_CONTRACT_AWARDS) {
      if (!Object.prototype.hasOwnProperty.call(PDX_CONTRACT_AWARDS, t)) continue;
      if (!Object.prototype.hasOwnProperty.call(DEFENSE_CONTRACTORS, t)) out.push(t + ': awards for a ticker not on the list');
      var list = PDX_CONTRACT_AWARDS[t], seen = {};
      for (var j = 0; j < (list || []).length; j++) {
        var a = list[j], atag = t + ': award ' + (j + 1);
        if (!a || typeof a !== 'object') { out.push(atag + ' is not an object'); continue; }
        if (!/^[12][0-9]{3}$/.test(String(a.year))) out.push(atag + ' year is not a four-digit year');
        else if (seen[a.year]) out.push(atag + ' is a second award for ' + a.year);
        seen[a.year] = true;
        if (!a.awardId || !a.recipient || !a.agency || !a.description) out.push(atag + ' is missing a published field');
        if (typeof a.obligated !== 'number' || !(a.obligated > 0)) out.push(atag + ' obligated is not a published positive amount');
        if (!/^https:\/\/(?:www\.usaspending\.gov\/award\/|sam\.gov\/)/.test(String(a.url || ''))) {
          out.push(atag + ' url is not a USASpending or SAM.gov award page');
        } else if (String(a.url).indexOf(String(a.awardId)) < 0) {
          out.push(atag + ' url does not name its own award id');
        }
        for (var ak in a) {
          if (Object.prototype.hasOwnProperty.call(a, ak) && AWARD_FIELDS.indexOf(ak) < 0) {
            out.push(atag + ' carries unrecognised field ' + ak);
          }
        }
      }
    }
    return out;
  }

  // ── OVERLAP: WHAT THE SECTION PRINTS, OR NULL ─────────────────────────────
  // Null unless the gate is clean, the member's holdings timeline reads, and at
  // least one overlap AND at least one award for an overlapping company inside
  // the graph's years are on file. Overlaps are found here, never stored.
  function overlap(pid) {
    if (!pid || overlapDefects().length) return null;
    var seats = PDX_COMMITTEE_SEATS[pid];
    var h = holdings(pid);
    if (!seats || !h || !h.years) return null;
    var graphYears = h.years.map(function (y) { return y.year; });
    var items = [], tickers = {};
    for (var s = 0; s < seats.length; s++) {
      var st = seats[s];
      for (var t in DEFENSE_CONTRACTORS) {
        if (!Object.prototype.hasOwnProperty.call(DEFENSE_CONTRACTORS, t)) continue;
        var forms = [];
        for (var y = 0; y < h.years.length; y++) {
          var yr = h.years[y];
          if (st.years.map(String).indexOf(yr.year) < 0) continue;
          var held = yr.lines.some(function (l) { return l.asset.indexOf('(' + t + ')') >= 0; });
          if (held) forms.push({ year: yr.year, formUrl: yr.formUrl });
        }
        if (!forms.length) continue;
        tickers[t] = true;
        items.push({ ticker: t, company: DEFENSE_CONTRACTORS[t], committee: st.committee,
                     committeeName: COVERED_COMMITTEES[st.committee], congress: st.congress,
                     forms: forms, roster: { url: st.rosterUrl, label: st.rosterLabel } });
      }
    }
    if (!items.length) return null;
    var awards = [];
    for (var tk in tickers) {
      (PDX_CONTRACT_AWARDS[tk] || []).forEach(function (a) {
        if (graphYears.indexOf(String(a.year)) < 0) return;
        awards.push({ ticker: tk, year: String(a.year), awardId: a.awardId, recipient: a.recipient,
                      agency: a.agency, description: a.description, obligated: a.obligated, url: a.url });
      });
    }
    if (!awards.length) return null;
    awards.sort(function (a, b) {
      return (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0) || (a.year < b.year ? -1 : a.year > b.year ? 1 : 0);
    });
    return { items: items, awards: awards, asOf: AWARDS_AS_OF };
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
    // The holdings lines the disclosures block draws as range bands, the
    // ladder their place is looked up on, and the gate a line has to pass.
    // holdings(pid) answers for the transcribed House FD timelines and null elsewhere.
    holdings: holdings,
    BAND_LADDER: BAND_LADDER,
    holdingsDefects: holdingsDefects,
    // The one table a shown midpoint (or floor) can come from, and the sentence
    // that names its method. Published so the suite can pin both.
    DISCLOSED_POINTS: DISCLOSED_POINTS,
    POINT_METHOD: POINT_METHOD,
    // The committee-overlap read under the graph, and the gate its three tables
    // pass. overlap(pid) is null unless an overlap and an award are both on file.
    overlap: overlap,
    overlapDefects: overlapDefects,
    DEFENSE_CONTRACTORS: DEFENSE_CONTRACTORS,
    COVERED_COMMITTEES: COVERED_COMMITTEES,
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
    },
    // And for the holdings lines. Overriding it cannot introduce arithmetic:
    // a line is drawn at the rung its filed band looks up to, or not at all.
    // And for the overlap tables. Overriding them cannot make an overlap appear
    // that no stored holdings line supports: overlap() still derives it.
    _setOverlapTables: function (seats, awards) {
      if (seats && typeof seats === 'object') PDX_COMMITTEE_SEATS = seats;
      if (awards && typeof awards === 'object') PDX_CONTRACT_AWARDS = awards;
      return overlapDefects().length;
    },
    _setHoldingsTable: function (table) {
      PDX_FD_HOLDINGS = (table && typeof table === 'object') ? table : {};
      return holdingsDefects().length;
    }
  };
})();
