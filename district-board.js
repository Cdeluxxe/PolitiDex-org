/* ═══════════════════════════════════════════════════════════════════════════
   district-board.js — THE DISTRICT VOICE READERS, AND THEY ARE READERS
   ───────────────────────────────────────────────────────────────────────────
   SIX SEATS HAVE A BOARD YOU CAN READ AT AN ADDRESS, and ONE module serves all
   six. Each is a row in BOARDS below, and nothing about a board lives anywhere
   but its row:

     /district/ut-sd-3   Utah Senate District 3 — North Ogden and Weber County
     /district/ut-hd-16  Utah House District 16 — Layton and Davis County
     /district/ut-sd-7   Utah Senate District 7 — Layton and Davis County
     /district/ut-cd-2   Utah's 2nd Congressional District
     /district/ut-hd-15  Utah House District 15 — Layton and Davis County
     /district/ut-sd-6   Utah Senate District 6 — Davis County

   THE ALLOW-LIST IS THE PRODUCT, NOT AN OPTIMISATION. There is no /district/*
   splat and no pattern that composes an address out of a seat number, because
   the moment one exists this app has an address for every district in the
   country and a document behind six of them. A seat that is not a row here has
   no board, /voice says so in words, and the endpoint 404s it.

   ADDING A BOARD IS FOUR ROWS AND A DOCUMENT — this table, district-voice.js's
   BOARD_ROUTES, district-board.mts's BOARD_SEATS, three rewrites in
   netlify.toml. It is deliberately NOT a fork of this file: the second
   implementation of a district board is where the first one's honesty rules
   stop being enforced.

   This module is the whole of those pages' behaviour, and each page is three
   bands:

     1 · THE SEAT        who sits in it, where it is, and a link to their file.
     2 · WHO IS IN THE ROOM   four integers, every one of them from a store.
     3 · ON THE TABLE    the measures already in this archive for this seat.

   WHAT THESE PAGES ARE FOR. A district had two addresses before the first of
   them and neither of them was the district. /p/<pid> is a PERSON — the sitting
   member's record, their votes, their positions, their money. /voice is a
   READER — it asks where you saved your location and puts you at whatever seat
   that names. Neither is a thing you can hand to a neighbour and say "this is
   ours". These are: a place, named, with the count of who has actually shown up
   in it and the list of what is actually on its table.

   ── WHO HOLDS THE SEAT, AND THE TWO OWNERS OF THAT ANSWER ──────────────────
   Five of the six boards name their holder with a ROSTER KEY on their own row
   and band 1 reads that row and nothing else. The congressional board has NO
   pid: /district/ut-cd-2's member is resolved through
   window._pdxUsHouseSeat('Utah', 2) — voter-hub-location.js's one owner of
   "which person holds this congressional district", which matches on the
   roster's own district-qualified state string, refuses a candidate, a former
   member and a record that does not say which district it holds, and answers
   NOBODY for a district two rows both claim. When it answers nobody, band 1
   prints the seat and "no member on file". There is no branch in this file that
   can turn an empty join into a name.

   ── THE FOUR RULES, AND THEY ARE WHY THE FILE IS THIS LONG ─────────────────

   RULE 1 · NEVER INVENT A HEADCOUNT. Every number in band 2 comes from
   /api/district-board, which counts rows in Postgres and can do nothing else.
   Not one figure on this page is computed here, inferred from anything in the
   browser, or defaulted to something plausible. A count is a claim about how
   many real people are standing in a room, and it is the single most
   forgeable-looking thing this product prints — a hardcoded "127 verified
   residents" would be indistinguishable, to a reader, from the truth. So there
   is no literal integer anywhere in this module's render path, and
   scripts/test-district-voice-sd3.mjs mounts the page against a fixture that
   returns nothing and asserts the page prints zeroes.

   RULE 2 · THREE ANSWERS, NOT TWO. "Nobody is here", "there is no store to
   ask", and "we could not ask" are three different facts and this page never
   collapses them:

     a real integer           → the store answered, and that is the number.
     0 + "no … on hand"       → there IS no store for this fact yet. The money
                                lane's grammar, borrowed exactly: "on hand",
                                never "yet", because "yet" promises a record
                                that may never come. See finance-lane.js.
     "could not read"         → the request failed. NOT a zero. A failed read
                                rendered as 0 verified residents is this page
                                telling a reader their district is empty
                                because a Function timed out, and that is the
                                worst lie available to it.

   RULE 3 · NO NAME, NO ADDRESS, NO EMAIL, EVER. The endpoint aggregates and
   never selects, so there is no author, body, county or date in the payload
   this file receives. That is a property of the wire, not a discipline here —
   this module could not print a neighbour's name if it were asked to, because
   it is never handed one.

   RULE 4 · NO MAJORITY, NO MOOD, NO VERDICT. Band 3 prints how many people
   answered a poll and how many wrote a comment, per measure. It never prints a
   proportion, a winning side, or "the district supports this". A poll with
   four answers is four answers; a district is not a number, and until a real
   poll store has real votes there is nothing here that could honestly be
   phrased as the district's position. No percentage appears in this file.

   ── WHAT THIS MODULE IS NOT ────────────────────────────────────────────────

     · NOT A STORE. No localStorage write, no sessionStorage write, no cookie,
       no IndexedDB. It does not write a location key, a district key, a team
       key or a stance key — it READS the reader's sides through
       PDXStanceSides (count, list, label) to tell a reader with no positions
       from one who has some, and reads nothing else off the device. It does not
       create pdx_my_stances_v2 or any other key, it does not copy one store's
       objects into another, and it does not PUT a visitor's sides into the
       counts endpoint: band 2 is an aggregate read and stays structurally zero.
       The two stores behind that reader are pdx_my_stances_v1 (my-stances.js)
       and pdx_your_file_v1, per account (your-file.js); NEITHER is touched
       here, by name or by key, and both are asked only through their owners'
       published reads, which is what stance-sides.js is. The one storage write
       that happens on this page at all is PDXVotingRecord's own session copy of
       the PUBLIC record (its `?pageSize=100` baseline, the same key and the
       same query every warming caller in the app already uses), which is a
       cache of a public document and not a fact about the reader.

     · NOT A SCORE. `scored: false`, on the same terms finance-lane.js
       publishes it. No 0-100, no grade, no tier, no traffic light, no
       Direction Match. The Direction Match engine has no district-scoped read
       and this file does not invent one: alignment-tool.js is not on this
       document, and nothing here would call it if it were.

     · NOT A PARTY SURFACE. The roster row for this seat carries a party
       letter. It is deliberately not read and deliberately not printed. A
       district is a place; the person who currently sits in it has a party and
       his own file says so.

     · NOT A MONEY SURFACE. PDXFinance, WEALTH_DATA, /money's modules and both
       disclosure tables are unreachable from here — not unused, unreachable:
       no identifier in this file names any of them. The bar links to /money
       because the bar is the same row on every side-lane shell, and a
       navigation link is not a read.

     · NOT A WRITER OF ANYTHING SHARED. NEVER_FEEDS below is the machine-
       checkable form of it: this page contributes to no cross-surface global.
       Direction Match, the word-vs-action pattern index and the publication
       floor boot byte-identical with and without this module, and the suite
       asserts exactly that by twin-booting them.

     · NOT A COMPOSER. See THE POSTING SEAM.

   ── THE POSTING SEAM, AND WHY IT IS A DISABLED FIELD ───────────────────────
   Reading this board is free and open to anybody, signed in or not. POSTING to
   it is not built tonight, and the honest way to say so is a field that is
   visibly there and visibly off, with one sentence saying posting ships next.

   WHAT WAS NOT DONE, ON PURPOSE. No composer that writes to localStorage. That
   was the tempting version — a box that accepts a sentence, keeps it on the
   device, and paints it back into the board so the page feels alive. It would
   have been a forgery in two directions at once: the reader would believe they
   had posted to their district when nothing left the machine, and the sentence
   would render beside a verified-resident count as though it were a verified
   resident's. A board whose entries are unverifiable is not a lighter version
   of this product; it is the thing this product exists to be the opposite of.

   NO IDENTITY VENDOR IS WIRED. Residency verification is a real review against
   a real claim, and it is a later pass. There is therefore no personal
   residency standing on this surface at all — it is not resolved, not guessed,
   and not asked for. The page says what residency is FOR (it is how a voice is
   counted) and what it is not for (it is not how a page is read), and the
   verified count stands at whatever the store holds, which today is zero.

   ── WHERE EVERY FACT ON THE PAGE COMES FROM ────────────────────────────────
     band 1  window.CMP_DATA[PID]        the roster row. Name, office, district
                                         line. Nothing else — no bio, no score,
                                         no party, no issue chips.
             window._getPhotoUrl(PID)    the person file's portrait for that pid,
                                         or a verbatim copy of that resolver over
                                         browse-photos.js + profile-alias.js on
                                         a board; the row's `icon` when none.
     band 2  /api/district-board         four counts and a per-issue tally.
     band 3  PDXVotingRecord.fetchMember the archive read every other surface
                                         already uses, `?pageSize=100`, the
                                         baseline query. Deliberately NOT
                                         noteMember(): this is a district
                                         reader, and seeding a member's record
                                         from it would make this page an input
                                         to the record engines.
             window.ISSUE_MAP            the issue vocabulary, for labels.
     stance  PDXStanceSides.count()      how many positions the reader holds,
             PDXStanceSides.list()       and nothing about what they are unless
             PDXStanceSides.label()      they hold some. THE ONLY ANSWER TO
                                         THAT QUESTION ON THIS DOCUMENT; see
                                         the stance band below on why a -1 from
                                         it prints no sentence at all.
             PDXIssueColors.skin()       the per-issue colour token, with the
                                         SAME second argument /my-stances and
                                         the studio pass, so the same issue
                                         cannot carry two colours on two
                                         surfaces.

   Public API: window.PDXDistrictBoard (see the assignment at the bottom).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXDistrictBoard) return;   // idempotent — a double script tag is one board

  // ── THE BOARDS, AND EACH ONE IS A ROW ─────────────────────────────────────
  // SIX SEATS HAVE A BOARD, AND THIS IS THE WHOLE LIST. It grew from one row
  // to six without growing a second implementation: everything below is
  // parameterised by the ACTIVE board, and a board is the row that names it.
  // Adding a seventh is a row here, a row in district-voice.js's BOARD_ROUTES, a
  // row in netlify/functions/district-board.mts's BOARD_SEATS, three rewrites in
  // netlify.toml and a document — no pattern, no `/district/*` splat, no
  // per-seat fork of this file. HD-15 was the fifth and it cost exactly that:
  // the row below, four allow-list rows elsewhere, one document, and not one
  // line of new render code. SD-6 was the sixth and cost the same.
  //
  // WHAT EACH FIELD IS FOR.
  //   seat   the canonical key Postgres knows, and the only spelling that ever
  //          reaches a query. netlify/lib/district-voice-core.mjs owns that
  //          mapping for /d/<seat> and district-board.mts repeats it
  //          server-side; the suite pins this allow-list equal to the
  //          Function's, so a board cannot open on one side of the wire only.
  //   alias  the spelling in the URL, and the value sent as ?seat=.
  //   route  the board's own address. The ONE place it is written on the client.
  //   pid    the roster row band 1 reads — for the five seats whose holder is
  //          named by a key on the roster and nothing else.
  //   usHouse
  //          FOR A CONGRESSIONAL SEAT THERE IS NO PID HERE, ON PURPOSE. A U.S.
  //          House district's holder is resolved through
  //          window._pdxUsHouseSeat(state, district) — voter-hub-location.js's
  //          one owner of "which person holds this congressional district" —
  //          and never written down here. A pid copied into this table would be
  //          a second answer to that question, and the first thing a second
  //          answer does is outlive a redistricting. When that lookup is absent
  //          or answers nobody, band 1 prints the seat and "no member on file":
  //          see seatHtml(), which has no branch that can guess a name.
  //   h1 / where
  //          the page chrome each document prints, repeated here so the suite
  //          can hold the document and the module to one spelling of one seat.
  //   kick / kickTitle
  //          the person-file control's words. See personLinkHtml().
  var BOARDS = {
    'ut-statesenate-3': {
      seat: 'ut-statesenate-3',
      alias: 'ut-sd-3',
      route: '/district/ut-sd-3',
      pid: 'john_johnson',
      h1: 'Utah Senate District 3',
      where: 'North Ogden and Weber County',
      kick: 'District 3 board',
      kickTitle: 'The district board for Utah Senate District 3: who is in the room ' +
                 'and what is on the table. A place, not a scorecard.'
    },
    'ut-statehouse-16': {
      seat: 'ut-statehouse-16',
      alias: 'ut-hd-16',
      route: '/district/ut-hd-16',
      pid: 'tlee',
      h1: 'Utah House District 16',
      where: 'Layton and Davis County',
      kick: 'House District 16 board',
      kickTitle: 'The district board for Utah House District 16: who is in the room ' +
                 'and what is on the table. A place, not a scorecard.'
    },
    'ut-statesenate-7': {
      seat: 'ut-statesenate-7',
      alias: 'ut-sd-7',
      route: '/district/ut-sd-7',
      pid: 'sadams',
      h1: 'Utah Senate District 7',
      where: 'Layton and Davis County',
      kick: 'Senate District 7 board',
      kickTitle: 'The district board for Utah Senate District 7: who is in the room ' +
                 'and what is on the table. A place, not a scorecard.'
    },
    'ut-house-2': {
      seat: 'ut-house-2',
      alias: 'ut-cd-2',
      route: '/district/ut-cd-2',
      // NO PID. See usHouse above.
      pid: '',
      usHouse: { state: 'Utah', district: 2 },
      h1: 'Utah’s 2nd Congressional District',
      where: 'The district as the court-ordered 2026 map draws it',
      kick: 'UT-2 district board',
      kickTitle: 'The district board for Utah’s 2nd Congressional District: who is ' +
                 'in the room and what is on the table. A place, not a scorecard.'
    },
    // THE FIFTH, AND APPENDED RATHER THAN SORTED IN. This table's order is the
    // order these boards opened, which is also the order /voice's hallway
    // prints them in, so a row inserted next to its neighbour by district
    // number would reshuffle a reader's page to say something this pass never
    // decided. HD-15 covers part of Layton, as HD-16 and SD-7 do, and is a
    // different seat from both.
    'ut-statehouse-15': {
      seat: 'ut-statehouse-15',
      alias: 'ut-hd-15',
      route: '/district/ut-hd-15',
      pid: 'defay_h15',
      h1: 'Utah House District 15',
      where: 'Layton and Davis County',
      kick: 'House District 15 board',
      kickTitle: 'The district board for Utah House District 15: who is in the room ' +
                 'and what is on the table. A place, not a scorecard.'
    },
    // THE SIXTH, APPENDED FOR THE SAME REASON. jstevenson is the roster row
    // cmp-data.js already keys to "UT District 6" and the pid seated-member.js's
    // senate table already names for district 6 — nothing new is claimed about
    // who holds the seat. SD-6 sits in Davis County beside SD-7 and is a different
    // seat with a different member.
    'ut-statesenate-6': {
      seat: 'ut-statesenate-6',
      alias: 'ut-sd-6',
      route: '/district/ut-sd-6',
      pid: 'jstevenson',
      h1: 'Utah Senate District 6',
      where: 'Davis County',
      kick: 'Senate District 6 board',
      kickTitle: 'The district board for Utah Senate District 6: who is in the room ' +
                 'and what is on the table. A place, not a scorecard.'
    },
    // EVERY OTHER SEAT THE ROSTER CAN NAME, AND ONLY THOSE. The rows below are
    // written by scripts/gen-district-boards.mjs from seated-member.js's
    // seat→pid tables and cmp-data.js, one per seat, on exactly the contract of
    // the six hand-opened rows above: a seat with no sitting pid gets no row, a
    // pid whose own record claims another seat gets no row, and a U.S. House row
    // carries usHouse and no pid, as UT-2's does. Appended after the six, which
    // keep their order and their bytes.
    // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
    'ut-statehouse-4': { seat: 'ut-statehouse-4', alias: 'ut-hd-4', route: '/district/ut-hd-4', pid: 'auxier_h4', h1: 'Utah House District 4', where: 'Morgan / Summit / Rich County', kick: 'House District 4 board', kickTitle: 'The district board for Utah House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-5': { seat: 'ut-statehouse-5', alias: 'ut-hd-5', route: '/district/ut-hd-5', pid: 'snider_h5', h1: 'Utah House District 5', where: 'Cache County', kick: 'House District 5 board', kickTitle: 'The district board for Utah House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-6': { seat: 'ut-statehouse-6', alias: 'ut-hd-6', route: '/district/ut-hd-6', pid: 'rob_bishop', h1: 'Utah House District 6', where: 'Box Elder / Weber County', kick: 'House District 6 board', kickTitle: 'The district board for Utah House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-9': { seat: 'ut-statehouse-9', alias: 'ut-hd-9', route: '/district/ut-hd-9', pid: 'jake_sawyer', h1: 'Utah House District 9', where: 'Ogden / Weber Co.', kick: 'House District 9 board', kickTitle: 'The district board for Utah House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-10': { seat: 'ut-statehouse-10', alias: 'ut-hd-10', route: '/district/ut-hd-10', pid: 'koford_h10', h1: 'Utah House District 10', where: 'South Ogden, Weber County', kick: 'House District 10 board', kickTitle: 'The district board for Utah House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-11': { seat: 'ut-statehouse-11', alias: 'ut-hd-11', route: '/district/ut-hd-11', pid: 'hall_h11', h1: 'Utah House District 11', where: 'South Ogden', kick: 'House District 11 board', kickTitle: 'The district board for Utah House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-12': { seat: 'ut-statehouse-12', alias: 'ut-hd-12', route: '/district/ut-hd-12', pid: 'mschultz', h1: 'Utah House District 12', where: 'Hooper, Weber County', kick: 'House District 12 board', kickTitle: 'The district board for Utah House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-14': { seat: 'ut-statehouse-14', alias: 'ut-hd-14', route: '/district/ut-hd-14', pid: 'lisonbee_h14', h1: 'Utah House District 14', where: 'Clearfield / Syracuse', kick: 'House District 14 board', kickTitle: 'The district board for Utah House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-19': { seat: 'ut-statehouse-19', alias: 'ut-hd-19', route: '/district/ut-hd-19', pid: 'rward', h1: 'Utah House District 19', where: 'Bountiful, Davis County', kick: 'House District 19 board', kickTitle: 'The district board for Utah House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-21': { seat: 'ut-statehouse-21', alias: 'ut-hd-21', route: '/district/ut-hd-21', pid: 'hollins_h24', h1: 'Utah House District 21', where: 'Salt Lake City', kick: 'House District 21 board', kickTitle: 'The district board for Utah House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-22': { seat: 'ut-statehouse-22', alias: 'ut-hd-22', route: '/district/ut-hd-22', pid: 'jennifer_dailey_provost', h1: 'Utah House District 22', where: 'Salt Lake City', kick: 'House District 22 board', kickTitle: 'The district board for Utah House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-23': { seat: 'ut-statehouse-23', alias: 'ut-hd-23', route: '/district/ut-hd-23', pid: 'hoang_nguyen', h1: 'Utah House District 23', where: 'Salt Lake City', kick: 'House District 23 board', kickTitle: 'The district board for Utah House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-24': { seat: 'ut-statehouse-24', alias: 'ut-hd-24', route: '/district/ut-hd-24', pid: 'grant_miller', h1: 'Utah House District 24', where: 'Salt Lake City', kick: 'House District 24 board', kickTitle: 'The district board for Utah House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-25': { seat: 'ut-statehouse-25', alias: 'ut-hd-25', route: '/district/ut-hd-25', pid: 'aromero', h1: 'Utah House District 25', where: 'West Salt Lake City, Salt Lake County', kick: 'House District 25 board', kickTitle: 'The district board for Utah House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-28': { seat: 'ut-statehouse-28', alias: 'ut-hd-28', route: '/district/ut-hd-28', pid: 'nicholeen_p_peck', h1: 'Utah House District 28', where: 'Tooele, Tooele County', kick: 'House District 28 board', kickTitle: 'The district board for Utah House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-29': { seat: 'ut-statehouse-29', alias: 'ut-hd-29', route: '/district/ut-hd-29', pid: 'bolinder_h68', h1: 'Utah House District 29', where: 'Tooele / Grantsville', kick: 'House District 29 board', kickTitle: 'The district board for Utah House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-30': { seat: 'ut-statehouse-30', alias: 'ut-hd-30', route: '/district/ut-hd-30', pid: 'fitisemanu_h30', h1: 'Utah House District 30', where: 'West Valley City', kick: 'House District 30 board', kickTitle: 'The district board for Utah House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-31': { seat: 'ut-statehouse-31', alias: 'ut-hd-31', route: '/district/ut-hd-31', pid: 'verona_mauga', h1: 'Utah House District 31', where: 'West Valley City / Taylorsville, Salt Lake County', kick: 'House District 31 board', kickTitle: 'The district board for Utah House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-33': { seat: 'ut-statehouse-33', alias: 'ut-hd-33', route: '/district/ut-hd-33', pid: 'doug_owens', h1: 'Utah House District 33', where: 'Millcreek, Salt Lake County', kick: 'House District 33 board', kickTitle: 'The district board for Utah House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-34': { seat: 'ut-statehouse-34', alias: 'ut-hd-34', route: '/district/ut-hd-34', pid: 'carol_spackman_moss', h1: 'Utah House District 34', where: 'Holladay, Salt Lake County', kick: 'House District 34 board', kickTitle: 'The district board for Utah House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-36': { seat: 'ut-statehouse-36', alias: 'ut-hd-36', route: '/district/ut-hd-36', pid: 'james_dunnigan', h1: 'Utah House District 36', where: 'Taylorsville, Salt Lake County', kick: 'House District 36 board', kickTitle: 'The district board for Utah House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-37': { seat: 'ut-statehouse-37', alias: 'ut-hd-37', route: '/district/ut-hd-37', pid: 'ashlee_matthews', h1: 'Utah House District 37', where: 'Kearns, Salt Lake County', kick: 'House District 37 board', kickTitle: 'The district board for Utah House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-39': { seat: 'ut-statehouse-39', alias: 'ut-hd-39', route: '/district/ut-hd-39', pid: 'ivory_h39', h1: 'Utah House District 39', where: 'West Jordan', kick: 'House District 39 board', kickTitle: 'The district board for Utah House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-41': { seat: 'ut-statehouse-41', alias: 'ut-hd-41', route: '/district/ut-hd-41', pid: 'john_arthur', h1: 'Utah House District 41', where: 'Cottonwood Heights, Salt Lake County', kick: 'House District 41 board', kickTitle: 'The district board for Utah House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-42': { seat: 'ut-statehouse-42', alias: 'ut-hd-42', route: '/district/ut-hd-42', pid: 'clinton_okerlund', h1: 'Utah House District 42', where: 'Sandy, Salt Lake County', kick: 'House District 42 board', kickTitle: 'The district board for Utah House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-43': { seat: 'ut-statehouse-43', alias: 'ut-hd-43', route: '/district/ut-hd-43', pid: 'eliason_h45', h1: 'Utah House District 43', where: 'Sandy, Salt Lake County', kick: 'House District 43 board', kickTitle: 'The district board for Utah House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-44': { seat: 'ut-statehouse-44', alias: 'ut-hd-44', route: '/district/ut-hd-44', pid: 'teuscher_h44', h1: 'Utah House District 44', where: 'South Jordan', kick: 'House District 44 board', kickTitle: 'The district board for Utah House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-45': { seat: 'ut-statehouse-45', alias: 'ut-hd-45', route: '/district/ut-hd-45', pid: 'tracy_miller', h1: 'Utah House District 45', where: 'South Jordan, Salt Lake County', kick: 'House District 45 board', kickTitle: 'The district board for Utah House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-46': { seat: 'ut-statehouse-46', alias: 'ut-hd-46', route: '/district/ut-hd-46', pid: 'calvin_roberts', h1: 'Utah House District 46', where: 'Draper / Bluffdale, Salt Lake County', kick: 'House District 46 board', kickTitle: 'The district board for Utah House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-49': { seat: 'ut-statehouse-49', alias: 'ut-hd-49', route: '/district/ut-hd-49', pid: 'candice_pierucci', h1: 'Utah House District 49', where: 'Herriman / Riverton, Salt Lake County', kick: 'House District 49 board', kickTitle: 'The district board for Utah House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-50': { seat: 'ut-statehouse-50', alias: 'ut-hd-50', route: '/district/ut-hd-50', pid: 'gricius_h50', h1: 'Utah House District 50', where: 'Eagle Mountain', kick: 'House District 50 board', kickTitle: 'The district board for Utah House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-51': { seat: 'ut-statehouse-51', alias: 'ut-hd-51', route: '/district/ut-hd-51', pid: 'leah_hansen', h1: 'Utah House District 51', where: 'Saratoga Springs / west Lehi, Utah County', kick: 'House District 51 board', kickTitle: 'The district board for Utah House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-52': { seat: 'ut-statehouse-52', alias: 'ut-hd-52', route: '/district/ut-hd-52', pid: 'cory_maloy_h52', h1: 'Utah House District 52', where: 'Lehi, Utah County', kick: 'House District 52 board', kickTitle: 'The district board for Utah House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-53': { seat: 'ut-statehouse-53', alias: 'ut-hd-53', route: '/district/ut-hd-53', pid: 'kay_christofferson', h1: 'Utah House District 53', where: 'Lehi, Utah County', kick: 'House District 53 board', kickTitle: 'The district board for Utah House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-55': { seat: 'ut-statehouse-55', alias: 'ut-hd-55', route: '/district/ut-hd-55', pid: 'jon_hawkins', h1: 'Utah House District 55', where: 'Pleasant Grove / American Fork, Utah County', kick: 'House District 55 board', kickTitle: 'The district board for Utah House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-56': { seat: 'ut-statehouse-56', alias: 'ut-hd-56', route: '/district/ut-hd-56', pid: 'valpeterson_h56', h1: 'Utah House District 56', where: 'Orem', kick: 'House District 56 board', kickTitle: 'The district board for Utah House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-59': { seat: 'ut-statehouse-59', alias: 'ut-hd-59', route: '/district/ut-hd-59', pid: 'kohler_h59', h1: 'Utah House District 59', where: 'Heber City, Wasatch / Summit County', kick: 'House District 59 board', kickTitle: 'The district board for Utah House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-60': { seat: 'ut-statehouse-60', alias: 'ut-hd-60', route: '/district/ut-hd-60', pid: 'grant_pace', h1: 'Utah House District 60', where: 'Provo, Utah County', kick: 'House District 60 board', kickTitle: 'The district board for Utah House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-61': { seat: 'ut-statehouse-61', alias: 'ut-hd-61', route: '/district/ut-hd-61', pid: 'lisa_shepherd', h1: 'Utah House District 61', where: 'Provo', kick: 'House District 61 board', kickTitle: 'The district board for Utah House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-63': { seat: 'ut-statehouse-63', alias: 'ut-hd-63', route: '/district/ut-hd-63', pid: 'whyte_h63', h1: 'Utah House District 63', where: 'Spanish Fork, Utah County', kick: 'House District 63 board', kickTitle: 'The district board for Utah House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-64': { seat: 'ut-statehouse-64', alias: 'ut-hd-64', route: '/district/ut-hd-64', pid: 'jackie_larson', h1: 'Utah House District 64', where: 'Spanish Fork / Salem, Utah County', kick: 'House District 64 board', kickTitle: 'The district board for Utah House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-65': { seat: 'ut-statehouse-65', alias: 'ut-hd-65', route: '/district/ut-hd-65', pid: 'doug_welton', h1: 'Utah House District 65', where: 'Payson, Utah County', kick: 'House District 65 board', kickTitle: 'The district board for Utah House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-66': { seat: 'ut-statehouse-66', alias: 'ut-hd-66', route: '/district/ut-hd-66', pid: 'shelley_h66', h1: 'Utah House District 66', where: 'Ephraim, Sanpete / Juab County', kick: 'House District 66 board', kickTitle: 'The district board for Utah House District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-67': { seat: 'ut-statehouse-67', alias: 'ut-hd-67', route: '/district/ut-hd-67', pid: 'christine_watkins', h1: 'Utah House District 67', where: 'Price, Carbon County', kick: 'House District 67 board', kickTitle: 'The district board for Utah House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-68': { seat: 'ut-statehouse-68', alias: 'ut-hd-68', route: '/district/ut-hd-68', pid: 'chew_h68', h1: 'Utah House District 68', where: 'Vernal, Uintah / Duchesne County', kick: 'House District 68 board', kickTitle: 'The district board for Utah House District 68: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-69': { seat: 'ut-statehouse-69', alias: 'ut-hd-69', route: '/district/ut-hd-69', pid: 'logan_monson', h1: 'Utah House District 69', where: 'Blanding, San Juan County', kick: 'House District 69 board', kickTitle: 'The district board for Utah House District 69: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-70': { seat: 'ut-statehouse-70', alias: 'ut-hd-70', route: '/district/ut-hd-70', pid: 'carl_albrecht', h1: 'Utah House District 70', where: 'Richfield, Sevier County', kick: 'House District 70 board', kickTitle: 'The district board for Utah House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-71': { seat: 'ut-statehouse-71', alias: 'ut-hd-71', route: '/district/ut-hd-71', pid: 'rshipp', h1: 'Utah House District 71', where: 'Cedar City, Iron County', kick: 'House District 71 board', kickTitle: 'The district board for Utah House District 71: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-73': { seat: 'ut-statehouse-73', alias: 'ut-hd-73', route: '/district/ut-hd-73', pid: 'colin_w_jack', h1: 'Utah House District 73', where: 'St. George, Washington County', kick: 'House District 73 board', kickTitle: 'The district board for Utah House District 73: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-75': { seat: 'ut-statehouse-75', alias: 'ut-hd-75', route: '/district/ut-hd-75', pid: 'walt_brooks', h1: 'Utah House District 75', where: 'St. George, Washington County', kick: 'House District 75 board', kickTitle: 'The district board for Utah House District 75: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-1': { seat: 'ut-statesenate-1', alias: 'ut-sd-1', route: '/district/ut-sd-1', pid: 'ssandall', h1: 'Utah Senate District 1', where: 'Box Elder/Cache', kick: 'Senate District 1 board', kickTitle: 'The district board for Utah Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-2': { seat: 'ut-statesenate-2', alias: 'ut-sd-2', route: '/district/ut-sd-2', pid: 'cwilson', h1: 'Utah Senate District 2', where: 'Logan, Cache County', kick: 'Senate District 2 board', kickTitle: 'The district board for Utah Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-4': { seat: 'ut-statesenate-4', alias: 'ut-sd-4', route: '/district/ut-sd-4', pid: 'cmusselman', h1: 'Utah Senate District 4', where: 'West Haven, Weber County', kick: 'Senate District 4 board', kickTitle: 'The district board for Utah Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-5': { seat: 'ut-statesenate-5', alias: 'ut-sd-5', route: '/district/ut-sd-5', pid: 'amillner', h1: 'Utah Senate District 5', where: 'District 5 as the 2022 legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Utah Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-8': { seat: 'ut-statesenate-8', alias: 'ut-sd-8', route: '/district/ut-sd-8', pid: 'tweiler', h1: 'Utah Senate District 8', where: 'Woods Cross', kick: 'Senate District 8 board', kickTitle: 'The district board for Utah Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-9': { seat: 'ut-statesenate-9', alias: 'ut-sd-9', route: '/district/ut-sd-9', pid: 'jennifer_plumb', h1: 'Utah Senate District 9', where: 'Salt Lake City', kick: 'Senate District 9 board', kickTitle: 'The district board for Utah Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-10': { seat: 'ut-statesenate-10', alias: 'ut-sd-10', route: '/district/ut-sd-10', pid: 'lescamilla', h1: 'Utah Senate District 10', where: 'Northwest Salt Lake City / West Valley City / Magna, Salt Lake County', kick: 'Senate District 10 board', kickTitle: 'The district board for Utah Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-11': { seat: 'ut-statesenate-11', alias: 'ut-sd-11', route: '/district/ut-sd-11', pid: 'emily_buss', h1: 'Utah Senate District 11', where: 'Eagle Mountain / Tooele, Utah County', kick: 'Senate District 11 board', kickTitle: 'The district board for Utah Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-12': { seat: 'ut-statesenate-12', alias: 'ut-sd-12', route: '/district/ut-sd-12', pid: 'kwan_s12', h1: 'Utah Senate District 12', where: 'West Valley / Murray', kick: 'Senate District 12 board', kickTitle: 'The district board for Utah Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-13': { seat: 'ut-statesenate-13', alias: 'ut-sd-13', route: '/district/ut-sd-13', pid: 'blouin_s13', h1: 'Utah Senate District 13', where: 'Millcreek / Salt Lake City', kick: 'Senate District 13 board', kickTitle: 'The district board for Utah Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-14': { seat: 'ut-statesenate-14', alias: 'ut-sd-14', route: '/district/ut-sd-14', pid: 'stephanie_pitcher', h1: 'Utah Senate District 14', where: 'Salt Lake City / Millcreek, Salt Lake County', kick: 'Senate District 14 board', kickTitle: 'The district board for Utah Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-15': { seat: 'ut-statesenate-15', alias: 'ut-sd-15', route: '/district/ut-sd-15', pid: 'kathleen_riebe', h1: 'Utah Senate District 15', where: 'Cottonwood Heights, Salt Lake County', kick: 'Senate District 15 board', kickTitle: 'The district board for Utah Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-16': { seat: 'ut-statesenate-16', alias: 'ut-sd-16', route: '/district/ut-sd-16', pid: 'harper_s16', h1: 'Utah Senate District 16', where: 'West Jordan / Taylorsville', kick: 'Senate District 16 board', kickTitle: 'The district board for Utah Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-17': { seat: 'ut-statesenate-17', alias: 'ut-sd-17', route: '/district/ut-sd-17', pid: 'lincoln_fillmore', h1: 'Utah Senate District 17', where: 'South Jordan, Salt Lake County', kick: 'Senate District 17 board', kickTitle: 'The district board for Utah Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-18': { seat: 'ut-statesenate-18', alias: 'ut-sd-18', route: '/district/ut-sd-18', pid: 'mccay_s11', h1: 'Utah Senate District 18', where: 'Riverton / Herriman', kick: 'Senate District 18 board', kickTitle: 'The district board for Utah Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-19': { seat: 'ut-statesenate-19', alias: 'ut-sd-19', route: '/district/ut-sd-19', pid: 'kcullimore', h1: 'Utah Senate District 19', where: 'Sandy / Draper / Cottonwood Heights', kick: 'Senate District 19 board', kickTitle: 'The district board for Utah Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-20': { seat: 'ut-statesenate-20', alias: 'ut-sd-20', route: '/district/ut-sd-20', pid: 'rwinterton', h1: 'Utah Senate District 20', where: 'Roosevelt, Duchesne County', kick: 'Senate District 20 board', kickTitle: 'The district board for Utah Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-21': { seat: 'ut-statesenate-21', alias: 'ut-sd-21', route: '/district/ut-sd-21', pid: 'brammer_s21', h1: 'Utah Senate District 21', where: 'Highland / Pleasant Grove', kick: 'Senate District 21 board', kickTitle: 'The district board for Utah Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-22': { seat: 'ut-statesenate-22', alias: 'ut-sd-22', route: '/district/ut-sd-22', pid: 'heidi_balderree', h1: 'Utah Senate District 22', where: 'Saratoga Springs / Bluffdale, Utah County', kick: 'Senate District 22 board', kickTitle: 'The district board for Utah Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-23': { seat: 'ut-statesenate-23', alias: 'ut-sd-23', route: '/district/ut-sd-23', pid: 'kgrover', h1: 'Utah Senate District 23', where: 'Provo', kick: 'Senate District 23 board', kickTitle: 'The district board for Utah Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-24': { seat: 'ut-statesenate-24', alias: 'ut-sd-24', route: '/district/ut-sd-24', pid: 'kstratton', h1: 'Utah Senate District 24', where: 'Provo / Orem', kick: 'Senate District 24 board', kickTitle: 'The district board for Utah Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-25': { seat: 'ut-statesenate-25', alias: 'ut-sd-25', route: '/district/ut-sd-25', pid: 'mckell_s25', h1: 'Utah Senate District 25', where: 'Utah County', kick: 'Senate District 25 board', kickTitle: 'The district board for Utah Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-26': { seat: 'ut-statesenate-26', alias: 'ut-sd-26', route: '/district/ut-sd-26', pid: 'dhinkins', h1: 'Utah Senate District 26', where: 'Orangeville, Emery County', kick: 'Senate District 26 board', kickTitle: 'The district board for Utah Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-27': { seat: 'ut-statesenate-27', alias: 'ut-sd-27', route: '/district/ut-sd-27', pid: 'dowens_st', h1: 'Utah Senate District 27', where: 'Fountain Green, Sanpete County', kick: 'Senate District 27 board', kickTitle: 'The district board for Utah Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-28': { seat: 'ut-statesenate-28', alias: 'ut-sd-28', route: '/district/ut-sd-28', pid: 'evickers', h1: 'Utah Senate District 28', where: 'Cedar City', kick: 'Senate District 28 board', kickTitle: 'The district board for Utah Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-29': { seat: 'ut-statesenate-29', alias: 'ut-sd-29', route: '/district/ut-sd-29', pid: 'dipson', h1: 'Utah Senate District 29', where: 'St. George', kick: 'Senate District 29 board', kickTitle: 'The district board for Utah Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-1': { seat: 'ut-house-1', alias: 'ut-cd-1', route: '/district/ut-cd-1', pid: '', usHouse: { state: 'Utah', district: 1 }, h1: 'Utah’s 1st Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-1 district board', kickTitle: 'The district board for Utah’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-3': { seat: 'ut-house-3', alias: 'ut-cd-3', route: '/district/ut-cd-3', pid: '', usHouse: { state: 'Utah', district: 3 }, h1: 'Utah’s 3rd Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-3 district board', kickTitle: 'The district board for Utah’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-4': { seat: 'ut-house-4', alias: 'ut-cd-4', route: '/district/ut-cd-4', pid: '', usHouse: { state: 'Utah', district: 4 }, h1: 'Utah’s 4th Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-4 district board', kickTitle: 'The district board for Utah’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-gov': { seat: 'ut-gov', alias: 'ut-gov', route: '/district/ut-gov', pid: 'cox', statewide: true, h1: 'Governor · Spencer Cox', where: 'Statewide · the whole State of Utah', kick: 'Governor board', kickTitle: 'The board for Governor · Spencer Cox: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-us-senate-curtis': { seat: 'ut-us-senate-curtis', alias: 'ut-us-senate-curtis', route: '/district/ut-us-senate-curtis', pid: 'curtis', statewide: true, h1: 'U.S. Senate · John Curtis', where: 'Statewide · the whole State of Utah', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Curtis: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-us-senate-lee': { seat: 'ut-us-senate-lee', alias: 'ut-us-senate-lee', route: '/district/ut-us-senate-lee', pid: 'lee', statewide: true, h1: 'U.S. Senate · Mike Lee', where: 'Statewide · the whole State of Utah', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mike Lee: who is in the room and what is on the table. A place, not a scorecard.' },
    // @generated district-boards end
  };

  var API = '/api/district-board';

  // The allow-list, DERIVED from the table above rather than written twice. Two
  // hand-kept copies of "which seats have a board" is two chances to open a
  // board on one of them only.
  var BOARD_SEATS = {};
  (function () {
    for (var k in BOARDS) {
      if (Object.prototype.hasOwnProperty.call(BOARDS, k)) BOARD_SEATS[k] = 1;
    }
  })();

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  // Every spelling in, ONE spelling out — the same two regexes and the same
  // chamber table district-voice.js and district-board.mts carry, so `ut-hd-16`
  // and `ut-statehouse-16` are one place on all three sides. Mirrored rather
  // than imported because this file loads as a plain script; the suite holds the
  // copies to one answer.
  var SEAT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
  var ALIAS_CHAMBERS = { hd: 'statehouse', sd: 'statesenate', cd: 'house' };
  // THE STATEWIDE SEATS. The governor is `ut-gov`; each U.S. Senate seat is
  // keyed by the roster pid of the member who holds it, `ut-us-senate-<pid>`,
  // because the two seats are the same office twice. One spelling each — the key
  // is the alias — and a shape, not a list: the list is BOARDS.
  var STATEWIDE_KEY_RE = /^[a-z]{2}-(?:gov|us-senate-[a-z][a-z0-9_]*)$/;

  function normalizeSeatKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!s) return '';
    if (SEAT_KEY_RE.test(s) || STATEWIDE_KEY_RE.test(s)) return s;
    var m = ALIAS_RE.exec(s);
    if (!m) return '';
    var chamber = ALIAS_CHAMBERS[m[2]];
    if (!chamber) return '';
    var out = m[1] + '-' + chamber + '-' + m[3];
    return SEAT_KEY_RE.test(out) ? out : '';
  }

  // The board for a seat, in any spelling, or null. THE ONE OWNER of "does this
  // seat have a board": a caller that tested the allow-list itself would be a
  // second answer to it.
  function board(seatKey) {
    var k = normalizeSeatKey(seatKey);
    return (k && Object.prototype.hasOwnProperty.call(BOARDS, k)) ? BOARDS[k] : null;
  }

  // ── WHICH BOARD THIS DOCUMENT IS ──────────────────────────────────────────
  // THE DOCUMENT SAYS, AND THIS FILE NEVER GUESSES FROM THE URL. A path test
  // would be read differently depending on which of the three rewritten
  // spellings the reader arrived on, and this module also ships on person.html
  // where the path names a person. So each board document declares its own seat
  // twice — a sync `window.__PDX_DISTRICT_BOARD_SEAT` in the head and a
  // `data-pdxdb-seat` on the host element — and the suite asserts every one of
  // the six documents does, because a document that declared neither would
  // paint the DEFAULT board's seat under its own heading, which is the exact
  // class of confident wrongness this whole surface exists to avoid.
  function hostSeat(el) {
    try {
      if (el && fn(el.getAttribute)) {
        var a = el.getAttribute('data-pdxdb-seat');
        if (a) return String(a);
      }
    } catch (e) {}
    return '';
  }
  function docSeat() {
    try {
      if (window.__PDX_DISTRICT_BOARD_SEAT) return String(window.__PDX_DISTRICT_BOARD_SEAT);
    } catch (e) {}
    return '';
  }

  // THE DEFAULT IS THE FIRST BOARD, AND IT PAINTS NOTHING. It exists so the
  // scalar exports below (SEAT/ALIAS/ROUTE/PID, which every caller since the
  // first board has read) still answer on a document that names no seat —
  // person.html, which loads this module for personLinkHtml() alone and has no
  // host to paint into. mount() does NOT rely on it: it resolves the host's own
  // seat, then the document's, and the board it paints is whichever of those
  // named one.
  var DEFAULT_SEAT = 'ut-statesenate-3';
  var ACTIVE = board(docSeat()) || BOARDS[DEFAULT_SEAT];

  // The active board's fields, read through functions so every band reads the
  // board that is actually mounted rather than a value captured at load.
  function SEAT() { return ACTIVE.seat; }
  function ALIAS() { return ACTIVE.alias; }
  function ROUTE() { return ACTIVE.route; }

  // ── WHO HOLDS THIS SEAT, AND THE TWO WAYS THAT IS ANSWERED ────────────────
  // A row with a `pid` names its holder on the roster and that is the whole
  // answer. A row with `usHouse` has NO pid and is resolved through
  // voter-hub-location.js's window._pdxUsHouseSeat(state, district), which is
  // the app's one owner of that join — it matches on the roster's own
  // district-qualified state string, refuses a record that does not say which
  // district it holds, refuses a candidate and a former member, and answers
  // NOBODY for a district two rows both claim.
  //
  // '' IS AN ANSWER AND IT IS NOT A NAME. An absent lookup (the module is not on
  // this document), a cold roster and an empty join all return '', and band 1
  // prints the seat with "no member on file" for all three. There is no branch
  // here that falls back to a written-down pid, because that fallback is how a
  // page comes to name the member of a district that was redrawn around them.
  function pidOf(b) {
    var row = b || ACTIVE;
    if (!row) return '';
    if (row.pid) return String(row.pid);
    var u = row.usHouse;
    if (!u) return '';
    try {
      if (!fn(window._pdxUsHouseSeat)) return '';
      return String(window._pdxUsHouseSeat(u.state, u.district) || '');
    } catch (e) { return ''; }
  }
  function PID() { return pidOf(ACTIVE); }

  // How many archive rows band 3 will print. A cap, not a ranking: the rows are
  // printed in the order the archive returned them and nothing here re-sorts,
  // promotes or hides one for being inconvenient. The read asks for the baseline
  // page — see the header on why that query and not another.
  var PAGE_SIZE = 100;
  var TABLE_CAP = 40;

  // ── NEVER_FEEDS ───────────────────────────────────────────────────────────
  // The names of every cross-surface global this page is forbidden to write,
  // published so the suite can assert it rather than take the comment's word for
  // it. finance-lane.js's wall, same shape, same reason: a declaration a test
  // can read is worth more than a paragraph a reviewer has to trust.
  var NEVER_FEEDS = [
    'directionMatch',        // no score, and no district-scoped read exists
    'wordVsAction',          // the pattern index is not fed by a headcount
    'formalPatternTier',     // nor by a district's activity
    'publicationFloor'       // and a board does not make a record publishable
  ];

  // ── THE COPY, IN ONE PLACE ────────────────────────────────────────────────
  // Every sentence the page can print, so the wording of an empty room is
  // reviewable as text instead of hunted through a renderer. The absence lines
  // all read "on hand" — see RULE 2.
  var COPY = {
    kick: 'District board',
    h1: 'Utah Senate District 3',
    where: 'North Ogden and Weber County',
    sub: 'The public record for this seat, and the count of who has shown up in it. ' +
         'Reading this board is free and open to everyone.',

    seatBand: 'The seat',
    seatNote: 'Who sits here now. This is a link to the record, not a summary of it.',
    seatNone: 'No roster row on hand for this seat.',
    // THE SEAT EXISTS AND ITS HOLDER DOES NOT RESOLVE. "On hand", never "yet",
    // on the money lane's terms — and note what it does not say: it does not
    // say the seat is vacant, because this page does not know that either. It
    // says what it knows, which is that it holds no member for this district.
    seatNoMember: 'No member on file for this seat.',

    roomBand: 'Who is in the room',
    roomNote: 'Counts only. No names, no addresses, no email — this page is never ' +
              'handed one, so it cannot print one.',
    roomWait: 'Counting the room…',
    roomUnread: 'We could not read the room’s record just now. This is not a count of zero — ' +
                'it is a read that failed, and reloading may answer it.',

    verifiedLabel: 'Verified residents on file',
    verifiedNone: 'No verified residency record on hand for this seat.',
    stanceLabel: 'People with at least one stance',
    stanceNone: 'No district stance record on hand. Positions are saved on the reader’s ' +
                'own device, so there is nothing to count here without inventing it.',
    touchedLabel: 'People who answered a poll or wrote a comment',
    touchedNone: 'No poll or comment record on hand for this seat.',

    residency: 'Verified residency is how a voice is counted here — not how a page is read. ' +
               'Reading this board needs no account, no location and no verification.',

    tableBand: 'On the table',
    tableNote: 'Measures and acts already in this archive for this seat. Each row links to ' +
               'the record. Poll and comment counts are counts of people, never a majority ' +
               'and never this district’s position.',
    tableWait: 'Reading the archive…',
    tableEmpty: 'No measures on hand for this seat.',
    tableUnread: 'We could not read the archive just now. This is not an empty seat — ' +
                 'it is a read that failed.',
    colMeasure: 'Measure',
    colPolls: 'Answered',
    colComments: 'Commented',
    catsLabel: 'Show measures by issue',
    catAll: 'All',
    findLabel: 'Find a measure',
    findPlaceholder: 'Title or bill number',
    findNone: 'No measure in view matches that search.',
    tableUnfiled: 'Not filed under an issue',

    // THE GATE IS A RESIDENCY CHECK FOR THIS SEAT, nothing else. The second
    // sentence is district-composer.js's LOCKED_LINE, word for word, so the
    // board and the composer cannot describe two different gates.
    voiceFoot: 'The public record and this read-only board are free to everyone. ' +
               'Only verified residents of this seat get a voice that counts.',
    composeLabel: 'Say something to this district',
    composePlaceholder: 'Posting ships next',
    composeNote: 'Posting ships next. This field is off on purpose: a box that kept your ' +
                 'sentence on this device would look like a post to your district and would ' +
                 'not be one.',

    stanceCta: 'Set your positions',
    stanceCtaNote: 'You have no positions on file. Setting them is how this district’s ' +
                   'issue list gets read against something.',
    stanceMineNote: 'Your sides on the issues in this district’s list. Read from your own ' +
                    'saved positions and nowhere else.',
    stanceMore: 'Add another',
    // TWO DOORS, AND THE DIFFERENCE IS A CLAIM ABOUT THE READER. ?add=1 opens
    // the studio's add flow and is only offered to a reader the shared reader
    // says holds NOTHING. A reader who already holds sides is sent to the plain
    // address, because the add flow is a first-run affordance and pointing an
    // existing file at it is the small version of the same lie this pass is
    // fixing: it treats somebody with three positions as somebody with none.
    stanceHref: '/my-stances?add=1',
    stanceMoreHref: '/my-stances'
  };

  function fn(v) { return typeof v === 'function'; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // EVERY INTEGER ON THIS PAGE GOES THROUGH HERE, and it cannot manufacture
  // one: a missing, negative, fractional or non-numeric value becomes 0 rather
  // than becoming a guess. See RULE 1.
  function whole(v) {
    var n = Number(v);
    if (!isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  // The count as a sentence, in the shape stance-sides.js already uses for the
  // reader's own positions: a LENGTH with its noun, no denominator and no
  // percentage. Spelled once so band 2's three rows cannot phrase one fact three
  // ways.
  function people(n) {
    var v = whole(n);
    return String(v) + (v === 1 ? ' person' : ' people');
  }

  // ── THE FACE, AND IT IS THE PERSON FILE'S FACE ────────────────────────────
  // Band 1 paints the portrait /p/<pid> already paints for the same pid, and it
  // asks the same question the same way: window._getPhotoUrl is the one owner of
  // "which headshot belongs to this person" (ballot-breakdown.js — PROFILES →
  // CMP_DATA → BROWSE_PHOTOS, with the alias hops), and where a document carries
  // it this module asks it and nothing else. A board document does not carry
  // ballot-breakdown.js — it is the ballot desk, not a table — so on a board the
  // four functions below answer instead. THEY ARE THAT RESOLVER, COPIED VERBATIM,
  // not a re-reading of it: scripts/test-district-board-face.mjs lifts both
  // copies and fails on one changed byte, because a board whose face came from a
  // second rule would be one alias hop away from printing somebody else. Its
  // tiers are the tables the boards load for it (cmp-data.js, browse-photos.js,
  // profile-alias.js) — no new map, no new host, no address composed here.
  //
  // NO PORTRAIT IS NOT AN EMPTY FRAME. A pid with no face gets the roster row's
  // own mark, the `icon` profiles-full.js paints in .ph-fallback for the same
  // miss — 🏛 on every legislative row. A seat with no member gets neither: see
  // seatHtml(), whose nobody branch has no face slot to leave empty. A portrait
  // that fails to load is swapped for that same mark and remembered, so a
  // repaint does not ask a dead address again.
  var _deadFaces = {};
  // The face's box in CSS pixels, on the <img> itself so the band is laid out
  // before district-board.css arrives. A size, not a figure.
  var FACE_PX = 56;
  function _photoUnder(key) {
    if (!key) return '';
    var pr = (typeof window.PROFILES !== 'undefined' && window.PROFILES) ? window.PROFILES[key] : null;
    if (pr && pr.photo && String(pr.photo).trim()) return pr.photo;
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[key] : null;
    if (d && d.photo && String(d.photo).trim()) return d.photo;
    if (typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[key]) return BROWSE_PHOTOS[key];
    if (typeof window !== 'undefined' && window.BROWSE_PHOTOS && window.BROWSE_PHOTOS[key]) return window.BROWSE_PHOTOS[key];
    return '';
  }
  function _photoSlug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function _photoKeys(pid) {
    var out = [], seen = {};
    var push = function (k) {
      if (!k || typeof k !== 'string' || seen[k]) return;
      seen[k] = 1; out.push(k);
    };
    push(pid);
    var pr = (typeof window.PROFILES !== 'undefined' && window.PROFILES) ? window.PROFILES[pid] : null;
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    push(_photoSlug(pr && pr.name));
    push(_photoSlug(d && d.name));
    var tables = [window.PDX_PROFILE_ALIAS, window.STANCE_ALIASES, window.PDX_PID_ALIASES];
    for (var t = 0; t < tables.length; t++) {
      var tbl = tables[t];
      if (!tbl || typeof tbl !== 'object') continue;
      if (tbl[pid]) push(tbl[pid]);
      for (var k in tbl) {
        if (!Object.prototype.hasOwnProperty.call(tbl, k)) continue;
        if (tbl[k] === pid) push(k);
      }
    }
    return out;
  }
  function _getPhotoUrl(pid) {
    // Single source of truth for a politician's headshot, shared by the full
    // profile hero, the medium quick-view modal and every card so all three
    // always show the SAME photo (no view ends up on a bare icon while another
    // shows a real face).
    if (!pid) return '';
    var keys = _photoKeys(pid);
    for (var i = 0; i < keys.length; i++) {
      var url = _photoUnder(keys[i]);
      if (url) return url;
    }
    return '';
  }
  function faceUrl(pid) {
    if (!pid) return '';
    var u = '';
    try {
      u = fn(window._getPhotoUrl) ? window._getPhotoUrl(pid) : _getPhotoUrl(pid);
    } catch (e) { u = ''; }
    u = u ? String(u).trim() : '';
    return (u && !_deadFaces[u]) ? u : '';
  }
  function faceMark(row) {
    var m = row && row.icon ? String(row.icon).trim() : '';
    return m || '\uD83C\uDFDB';
  }

  // ── BAND 1 · THE SEAT ─────────────────────────────────────────────────────
  // Three facts off the roster row, the person file's own face, and a link. The
  // face is beside the name, never in front of it: the name is in the same
  // markup as the <img>, and the image's bytes arrive whenever they arrive. NOT
  // read: party, score, kept,
  // broken, pending, icon, issues — a district page that printed a member's
  // scorecard would be a person page with a place's title.
  //
  // The office line is printed AS THE ROSTER HOLDS IT and is never composed
  // here. That matters enough to be tested on every board: SD-3's row reads "UT
  // State Senator" and SD-7's reads "Utah Senate President", because the member
  // who holds Senate District 7 presides over that chamber and the roster says
  // so — a page that flattened it to "State Senator" for tidiness would be
  // editing the record to fit a template. A state seat whose page called itself
  // congressional would be wrong about which body makes the laws on its own
  // table, so the state boards assert the absence of every federal word.
  //
  // ── THREE STATES, AND THE THIRD IS A SEAT WITH NOBODY IN IT ───────────────
  //   no seat on the list   nothing paints at all; mount() already refused.
  //   no holder resolved    THE SEAT, AND "no member on file". This is the
  //                         congressional case: pidOf() answers '' when
  //                         _pdxUsHouseSeat is absent, the roster is cold, or
  //                         the join is genuinely empty, and all three print the
  //                         same honest sentence. There is NO branch here that
  //                         can reach a name — not a written-down pid, not a
  //                         scan of the roster for something district-shaped,
  //                         not the previous holder.
  //   no roster row         a pid that resolved to nothing on the roster, which
  //                         is a broken deploy rather than a thin record — but
  //                         it still gets a sentence instead of an empty band.
  function seatHtml() {
    var pid = PID();
    var row = null;
    if (pid) {
      try {
        var R = window.CMP_DATA;
        if (R && typeof R === 'object') row = R[pid] || null;
      } catch (e) { row = null; }
    }

    var body;
    if (!pid) {
      // THE JOIN IS EMPTY, AND THAT IS THE WHOLE SENTENCE. The seat is named by
      // the page around this band; what is absent is the person, and saying so
      // is the only honest thing a district board can do with a district whose
      // holder it has not resolved.
      body = '<p class="pdxdb-none" data-pdxdb-seat-state="nobody">' +
        esc(COPY.seatNoMember) + '</p>';
    } else if (!row) {
      body = '<p class="pdxdb-none" data-pdxdb-seat-state="norow">' +
        esc(COPY.seatNone) + '</p>';
    } else {
      var name = String(row.name || '').trim();
      var office = String(row.office || '').trim();
      var where = String(row.state || '').trim();
      var face = faceUrl(pid);
      var mark = faceMark(row);
      // The face is the same link as the name, taken out of the tab order and
      // hidden from a screen reader: one record, one stop, and the name is it.
      body =
        '<div class="pdxdb-seat-id">' +
          '<a class="pdxdb-seat-face" href="/p/' + esc(pid) + '" tabindex="-1" aria-hidden="true"' +
          ' data-pdxdb-face="' + (face ? 'photo' : 'mark') + '">' +
            (face
              ? '<img class="pdxdb-seat-photo" src="' + esc(face) + '" alt="" width="' + FACE_PX + '" height="' + FACE_PX + '"' +
                ' decoding="async" data-pdxdb-mark="' + esc(mark) + '">'
              : '<span class="pdxdb-seat-mark">' + esc(mark) + '</span>') +
          '</a>' +
          '<div class="pdxdb-seat-text">' +
            '<p class="pdxdb-seat-name">' +
              '<a class="pdxdb-seat-link" href="/p/' + esc(pid) + '"' +
              ' title="The full record for the member who sits in this seat">' +
              esc(name || pid) + '</a>' +
            '</p>' +
            (office ? '<p class="pdxdb-seat-office">' + esc(office) + '</p>' : '') +
            (where ? '<p class="pdxdb-seat-where">' + esc(where) + '</p>' : '') +
          '</div>' +
        '</div>';
    }
    return band('seat', COPY.seatBand, COPY.seatNote, body, '');
  }

  // ── BAND 2 · WHO IS IN THE ROOM ───────────────────────────────────────────
  // `state` is one of 'wait' | 'unread' | 'ok', which are RULE 2's three
  // answers. There is no fourth and no default: an unrecognised state paints
  // the waiting line rather than a zero.
  function roomHtml(state, payload) {
    if (state === 'unread') {
      return band('room', COPY.roomBand, COPY.roomNote,
        '<p class="pdxdb-unread" role="status">' + esc(COPY.roomUnread) + '</p>',
        COPY.residency);
    }
    if (state !== 'ok' || !payload) {
      return band('room', COPY.roomBand, COPY.roomNote,
        '<p class="pdxdb-wait" role="status"><span class="pdxdb-dot" aria-hidden="true"></span>' +
        esc(COPY.roomWait) + '</p>', COPY.residency);
    }

    var counts = payload.counts || {};
    var stores = payload.stores || {};
    var rows =
      countRow(COPY.verifiedLabel, counts.verified, stores.verified, COPY.verifiedNone) +
      countRow(COPY.stanceLabel, counts.stance, stores.stance, COPY.stanceNone) +
      countRow(COPY.touchedLabel, counts.participants, stores.participants, COPY.touchedNone);

    return band('room', COPY.roomBand, COPY.roomNote,
      '<dl class="pdxdb-counts">' + rows + '</dl>', COPY.residency);
  }

  // ONE COUNT, AND ITS PROVENANCE IN THE SAME BLOCK. A store that does not
  // exist prints 0 AND says why it is 0, in the same breath, because 0 alone is
  // ambiguous between "nobody came" and "we do not keep this".
  function countRow(label, value, hasStore, noneLine) {
    var v = whole(value);
    var missing = hasStore !== true;
    return '<div class="pdxdb-count' + (missing ? ' pdxdb-count--nostore' : '') + '"' +
        ' data-pdxdb-store="' + (missing ? 'absent' : 'present') + '">' +
        '<dt class="pdxdb-count-k">' + esc(label) + '</dt>' +
        '<dd class="pdxdb-count-v" data-pdxdb-count="' + esc(String(v)) + '">' +
          esc(people(v)) +
          (missing ? '<span class="pdxdb-count-note">' + esc(noneLine) + '</span>' : '') +
        '</dd>' +
      '</div>';
  }

  // ── BAND 3 · ON THE TABLE ─────────────────────────────────────────────────
  // The archive's own rows, in the archive's own order. `rooms` is the per-issue
  // tally from the counts endpoint; a measure with no activity gets 0 and 0,
  // which is the truth and not a placeholder.
  //
  // AN EMPTY TABLE IS A PASSING STATE. If the issue-to-measure mapping is too
  // thin for this seat to have rows, the band prints its empty sentence and the
  // page is still correct. Nothing is scraped to fill it.
  // ── WHICH ROWS THE TABLE PRINTS, DECIDED ONCE ─────────────────────────────
  // ONE OWNER OF "what is on the table", because two callers need the answer:
  // the table body, and the stance band's filter. Deriving it twice is how the
  // band beneath a table comes to disagree with the table — a side printed for
  // an issue whose only measure was past the cap would be this page telling a
  // reader their position is on this seat's list while the list above it does
  // not carry it.
  //
  // FIRST ACT ON A MEASURE WINS THE ROW; see measureKeyOf(). The archive's own
  // order is kept and nothing here re-sorts, promotes or hides a row for being
  // inconvenient. The cap counts ROWS KEPT rather than rows examined, so a seat
  // whose first forty acts were all on one bill still fills the table.
  // A row needs something to print in its measure cell. measureRow() refuses
  // the same shape; this is the predicate, so the decision is made once and the
  // cap is never spent on a row that would render as nothing.
  function printable(item) {
    if (!item) return false;
    return !!(String(item.title || '').trim() || String(item.number || '').trim());
  }
  function tableRows(items) {
    var list = Array.isArray(items) ? items : [];
    var out = [];
    var seen = {};
    for (var i = 0; i < list.length && out.length < TABLE_CAP; i++) {
      var it = list[i];
      if (!printable(it)) continue;        // no title and no number: nothing to print
      var mk = measureKeyOf(it);
      if (mk && seen[mk]) continue;
      if (mk) seen[mk] = 1;
      out.push(it);
    }
    return out;
  }

  // ── THE TABLE, BY CATEGORY: THE CHIPS THE ROWS ALREADY WEAR ───────────────
  // A flat scroll of every measure mapped to the seat gives a reader no way to
  // start broad and go narrow. So the rows are GROUPED — and the groups are not
  // a second taxonomy. A group IS a chip: its key is a key the archive mapped
  // the measure to, its label is issueLabel(key) and its colour is
  // issueSkin(key), the exact pair the row's own chip prints. There is no
  // category here that is not a chip on at least one row of this seat, and so
  // no "Other", no "Misc", no invented umbrella.
  //
  // A MEASURE UNDER TWO ISSUES SITS IN BOTH GROUPS. It carries both chips, so
  // it is on the table under both; picking one of them to be its "primary"
  // would be this file deciding what a bill is about. Each copy of the row
  // prints the poll and comment counts for THE GROUP IT SITS IN, because those
  // tallies are per issue and that is the issue the reader is looking at.
  //
  // A ROW WITH NO LABELLED ISSUE IS STILL ON THE TABLE. It is printed last,
  // under All only, beneath a line that says it is not filed under an issue —
  // a statement about the row, not a category, so it gets no filter chip.
  //
  // WHAT IS OPEN ON FIRST PAINT. Every header shows; the groups are closed,
  // except one the visitor already holds a side on (PDXStanceSides, the same
  // one read the stance band makes). A chip opens only its own group. A search
  // opens the groups it matched in and hides the ones it did not. A header the
  // visitor opened or closed by hand stays that way across a repaint.
  //
  // THE VIEW IS MODULE STATE, so a repaint (band 2 answering after band 3) does
  // not reset a filter the reader just picked. Changing it re-applies to the
  // DOM in place — the search field is never re-rendered under the cursor.
  var _view = { cat: '', q: '', open: {} };

  function rowIssues(item) {
    var arr = (item && Array.isArray(item.issues)) ? item.issues : [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var k = arr[i] && arr[i].issueKey ? String(arr[i].issueKey) : '';
      if (!k || out.indexOf(k) !== -1 || !issueLabel(k)) continue;
      out.push(k);
    }
    return out;
  }

  // The groups this seat's table prints, from the rows tableRows() kept. Header
  // order is the label's alphabetical order — a neutral order, not a ranking;
  // rows inside a group keep the archive's own order.
  function tableGroups(rows) {
    var byKey = {}, keys = [], unfiled = [];
    for (var i = 0; i < rows.length; i++) {
      var ks = rowIssues(rows[i]);
      if (!ks.length) { unfiled.push(rows[i]); continue; }
      for (var j = 0; j < ks.length; j++) {
        if (!byKey[ks[j]]) { byKey[ks[j]] = []; keys.push(ks[j]); }
        byKey[ks[j]].push(rows[i]);
      }
    }
    keys.sort(function (a, b) {
      var la = issueLabel(a).toLowerCase(), lb = issueLabel(b).toLowerCase();
      return la < lb ? -1 : (la > lb ? 1 : 0);
    });
    var groups = [];
    for (var g = 0; g < keys.length; g++) {
      groups.push({ key: keys[g], label: issueLabel(keys[g]), rows: byKey[keys[g]] });
    }
    return { groups: groups, unfiled: unfiled };
  }

  // The issue keys the visitor holds a side on, read through the one owner.
  // Nothing here reads a position's value: only which issues have one.
  function stanceKeys() {
    var out = {};
    try {
      var S = window.PDXStanceSides;
      var list = (S && fn(S.list) && S.list()) || [];
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) out[String(list[i].key)] = 1;
    } catch (e) {}
    return out;
  }

  function findText(item) {
    return (String(item.title || '') + ' ' + String(item.number || '')).toLowerCase();
  }
  function normQuery(q) { return String(q == null ? '' : q).trim().toLowerCase(); }
  // A bill number is matched with or without its dots and spaces, so "sb 57"
  // finds "S.B. 57" — the search is over the two printed fields and nothing else.
  function matches(text, q) {
    if (!q) return true;
    if (text.indexOf(q) !== -1) return true;
    var squash = function (s) { return s.replace(/[\s.]+/g, ''); };
    var sq = squash(q);
    return !!sq && squash(text).indexOf(sq) !== -1;
  }

  // WHETHER A GROUP IS SHOWN AND WHETHER IT IS OPEN, decided in one place for
  // both the first render and every later filter change.
  function groupState(key, hits, stance) {
    var q = normQuery(_view.q);
    var shown = !_view.cat || _view.cat === key;
    if (key === '') shown = !_view.cat;          // the unfiled rows: All only
    if (shown && q && !hits) shown = false;
    var open;
    if (q) open = hits > 0;
    else if (_view.cat) open = true;
    else if (Object.prototype.hasOwnProperty.call(_view.open, key)) open = !!_view.open[key];
    else open = !!(key && stance[key]);
    return { shown: shown, open: open };
  }

  function measuresWord(n) { return n === 1 ? '1 measure' : n + ' measures'; }

  function groupHtml(key, label, rows, tally, stance) {
    var q = normQuery(_view.q);
    var hits = 0, body = '';
    for (var i = 0; i < rows.length; i++) {
      var hit = matches(findText(rows[i]), q);
      if (hit) hits++;
      body += measureRow(rows[i], tally, key, !hit);
    }
    var st = groupState(key, hits, stance);
    var head = key
      ? '<span class="pdxdb-group-l"' + issueSkin(key) + '>' + esc(label) + '</span>'
      : '<span class="pdxdb-group-l pdxdb-group-l--none">' + esc(COPY.tableUnfiled) + '</span>';
    return '<details class="pdxdb-group' + (key ? '' : ' pdxdb-group--none') + '"' +
        ' data-pdxdb-group="' + esc(key) + '"' +
        (st.open ? ' open' : '') + (st.shown ? '' : ' hidden') + '>' +
        '<summary class="pdxdb-group-h">' + head +
          '<span class="pdxdb-group-n" data-pdxdb-group-count="' + rows.length + '">' +
            esc(measuresWord(rows.length)) + '</span>' +
        '</summary>' +
        '<table class="pdxdb-table"><thead><tr>' +
          '<th scope="col">' + esc(COPY.colMeasure) + '</th>' +
          '<th scope="col" class="pdxdb-num">' + esc(COPY.colPolls) + '</th>' +
          '<th scope="col" class="pdxdb-num">' + esc(COPY.colComments) + '</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table>' +
      '</details>';
  }

  function catChip(key, label, n, skin) {
    var on = (_view.cat || '') === key;
    return '<button type="button" class="pdxdb-cat" data-pdxdb-cat="' + esc(key) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (skin || '') + '>' +
        esc(label) + '<span class="pdxdb-cat-n">' + n + '</span></button>';
  }

  function tableHtml(state, items, rooms) {
    if (state === 'unread') {
      return band('table', COPY.tableBand, COPY.tableNote,
        '<p class="pdxdb-unread" role="status">' + esc(COPY.tableUnread) + '</p>',
        COPY.voiceFoot);
    }
    if (state !== 'ok') {
      return band('table', COPY.tableBand, COPY.tableNote,
        '<p class="pdxdb-wait" role="status"><span class="pdxdb-dot" aria-hidden="true"></span>' +
        esc(COPY.tableWait) + '</p>', COPY.voiceFoot);
    }

    var list = Array.isArray(items) ? items : [];
    if (!list.length) {
      return band('table', COPY.tableBand, COPY.tableNote,
        '<p class="pdxdb-none">' + esc(COPY.tableEmpty) + '</p>', COPY.voiceFoot);
    }

    var rows = tableRows(list);
    if (!rows.length) {
      return band('table', COPY.tableBand, COPY.tableNote,
        '<p class="pdxdb-none">' + esc(COPY.tableEmpty) + '</p>', COPY.voiceFoot);
    }

    var tally = roomIndex(rooms);
    var stance = stanceKeys();
    var G = tableGroups(rows);
    // A chip that no longer has a group on this seat (a repaint dropped it)
    // falls back to All rather than showing an empty table under a live chip.
    var live = false;
    for (var c = 0; c < G.groups.length; c++) if (G.groups[c].key === _view.cat) live = true;
    if (!live) _view.cat = '';

    var chips = catChip('', COPY.catAll, rows.length, '');
    for (var i = 0; i < G.groups.length; i++) {
      var g = G.groups[i];
      chips += catChip(g.key, g.label, g.rows.length, issueSkin(g.key));
    }
    var groups = '';
    for (var j = 0; j < G.groups.length; j++) {
      groups += groupHtml(G.groups[j].key, G.groups[j].label, G.groups[j].rows, tally, stance);
    }
    if (G.unfiled.length) groups += groupHtml('', '', G.unfiled, tally, stance);

    return band('table', COPY.tableBand, COPY.tableNote,
      '<div class="pdxdb-cats" role="group" aria-label="' + esc(COPY.catsLabel) + '">' + chips + '</div>' +
      '<label class="pdxdb-find"><span class="pdxdb-find-l">' + esc(COPY.findLabel) + '</span>' +
        '<input class="pdxdb-find-i" type="search" data-pdxdb-search autocomplete="off"' +
          ' placeholder="' + esc(COPY.findPlaceholder) + '" value="' + esc(_view.q) + '" /></label>' +
      '<div class="pdxdb-groups">' + groups + '</div>' +
      '<p class="pdxdb-none pdxdb-find-none" data-pdxdb-find-none' +
        (anyShown(G) ? ' hidden' : '') + '>' + esc(COPY.findNone) + '</p>',
      COPY.voiceFoot);
  }

  function anyShown(G) {
    var q = normQuery(_view.q);
    var all = G.groups.slice();
    if (G.unfiled.length) all.push({ key: '', rows: G.unfiled });
    for (var i = 0; i < all.length; i++) {
      var hits = 0;
      for (var j = 0; j < all[i].rows.length; j++) if (matches(findText(all[i].rows[j]), q)) hits++;
      if (groupState(all[i].key, hits, {}).shown) return true;
    }
    return false;
  }

  // ── THE VIEW, APPLIED IN PLACE ────────────────────────────────────────────
  // The same groupState() the render used, read over the DOM the render wrote,
  // so a chip tap or a keystroke never rebuilds the band (and never takes the
  // search field out from under the reader's cursor).
  function applyView(el) {
    if (!el || !fn(el.querySelectorAll)) return;
    var q = normQuery(_view.q);
    var stance = stanceKeys();
    var chips = el.querySelectorAll('[data-pdxdb-cat]');
    for (var c = 0; c < chips.length; c++) {
      chips[c].setAttribute('aria-pressed', chips[c].getAttribute('data-pdxdb-cat') === _view.cat ? 'true' : 'false');
    }
    var groups = el.querySelectorAll('[data-pdxdb-group]');
    var any = false;
    for (var g = 0; g < groups.length; g++) {
      var key = groups[g].getAttribute('data-pdxdb-group') || '';
      var rows = groups[g].querySelectorAll('[data-pdxdb-find]');
      var hits = 0;
      for (var r = 0; r < rows.length; r++) {
        var hit = matches(rows[r].getAttribute('data-pdxdb-find') || '', q);
        if (hit) hits++;
        rows[r].hidden = !hit;
      }
      var st = groupState(key, hits, stance);
      groups[g].hidden = !st.shown;
      groups[g].open = st.open;
      if (st.shown) any = true;
    }
    var none = el.querySelector('[data-pdxdb-find-none]');
    if (none) none.hidden = any;
  }

  // Public setters, for the controls and for the suite. Each re-applies to the
  // mounted board if there is one.
  function setCategory(key) {
    _view.cat = String(key == null ? '' : key);
    applyView(_el);
  }
  function setQuery(q) {
    _view.q = String(q == null ? '' : q);
    applyView(_el);
  }

  var _wired = null;
  function wireTable(el) {
    if (!el || _wired === el || !fn(el.addEventListener)) return;
    _wired = el;
    // A PORTRAIT THAT WILL NOT LOAD BECOMES THE MARK, the way the person file's
    // onerror does it. `error` does not bubble, so this listens in the capture
    // phase; the address is remembered so the next repaint paints the mark
    // straight away instead of asking a dead host again.
    el.addEventListener('error', function (ev) {
      var t = ev && ev.target;
      if (!t || !t.classList || !t.classList.contains('pdxdb-seat-photo')) return;
      try {
        _deadFaces[String(t.getAttribute('src') || '')] = 1;
        var s = document.createElement('span');
        s.className = 'pdxdb-seat-mark';
        s.textContent = t.getAttribute('data-pdxdb-mark') || '\uD83C\uDFDB';
        var a = t.parentNode;
        if (a && a.setAttribute) a.setAttribute('data-pdxdb-face', 'mark');
        if (a && fn(a.replaceChild)) a.replaceChild(s, t);
      } catch (e) {}
    }, true);
    el.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      var chip = t && fn(t.closest) ? t.closest('[data-pdxdb-cat]') : null;
      if (chip) { setCategory(chip.getAttribute('data-pdxdb-cat') || ''); return; }
      // A header opened or closed by hand is remembered for the next repaint —
      // only while no search is forcing groups open.
      var sum = t && fn(t.closest) ? t.closest('.pdxdb-group-h') : null;
      if (sum && !normQuery(_view.q)) {
        var d = sum.parentNode;
        if (d && d.getAttribute) _view.open[d.getAttribute('data-pdxdb-group') || ''] = !d.open;
      }
    });
    el.addEventListener('input', function (ev) {
      var t = ev && ev.target;
      if (t && t.hasAttribute && t.hasAttribute('data-pdxdb-search')) setQuery(t.value);
    });
  }

  // THE STYLES FOR THE GROUPED TABLE live in /district-board.css, one sheet
  // linked once by this module rather than copied into 100-odd board documents,
  // so every board that paints band 3 gets the same shape from the same file.
  // The chip and header colours are the SAME inline token PDXIssueColors hands
  // the row chip; the sheet holds no per-issue rule.
  var TABLE_CSS_HREF = '/district-board.css';

  function injectCss() {
    try {
      if (typeof document === 'undefined' || !fn(document.createElement)) return;
      if (fn(document.getElementById) && document.getElementById('pdxdb-table-css')) return;
      var l = document.createElement('link');
      l.id = 'pdxdb-table-css';
      l.rel = 'stylesheet';
      l.href = TABLE_CSS_HREF;
      (document.head || document.documentElement).appendChild(l);
    } catch (e) {}
  }


  // The tally, keyed by issue. Built from the payload and defaulting to nothing
  // — an issue absent from this map has no activity, which the row prints as 0.
  function roomIndex(rooms) {
    var out = {};
    var list = Array.isArray(rooms) ? rooms : [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || !r.issueKey) continue;
      out[String(r.issueKey)] = { polls: whole(r.polls), comments: whole(r.comments) };
    }
    return out;
  }

  // ── ONE ROW PER MEASURE, AND "MEASURE" IS AN ID ───────────────────────────
  // THE BUG THIS FIXES. The archive returns one row per ACT, not one per bill:
  // a measure that took a committee vote, a floor vote and a concurrence vote
  // comes back three times, and band 3 printed all three. So the Fairpark bill
  // sat on the table three times with the same title and the same two counts
  // beside each copy, and a reader counting rows read three measures where the
  // seat had one — and the poll count, which is a count of PEOPLE on that
  // measure, appeared to be three separate rooms.
  //
  // DEDUPE BY IDENTITY, NEVER BY TITLE. A title is not an identity: two bills
  // in one session can carry the same short title, a title can be blank on a
  // row that still has a number, and "Amendments to Election Law" is the title
  // of something in most sessions. Collapsing by title would silently drop a
  // real second measure, which is a worse error than printing a duplicate.
  //
  // THE ID, IN PRECEDENCE ORDER.
  //   1 · item.measureId — the archive's own primary key for the bill, shared
  //       by every act on it. When it is there, nothing else is needed.
  //   2 · sitting + number — the citation, for a payload with no id. The
  //       sitting leads for the reason measureHref() spells out: "S.B. 336"
  //       names a different bill in every Utah general session, so a number
  //       alone would merge two sessions' bills into one row. The sitting is
  //       read the way the app's published owner reads it (consistency.js's
  //       window.pdxBillSit — measureIdent.session, else the congress); that
  //       module is not on this document, so the precedence is repeated here
  //       and nowhere else, over the two fields it names.
  //   3 · nothing — a row with neither an id nor a number is NOT deduped and
  //       IS printed. An unidentifiable row is the archive's problem, and
  //       hiding it behind a guess would be this file deciding two measures are
  //       one because it could not tell them apart.
  function measureKeyOf(item) {
    if (!item) return '';
    var id = item.measureId;
    if (typeof id === 'number' && isFinite(id)) return 'id:' + String(id);
    if (typeof id === 'string' && id.trim()) return 'id:' + id.trim();
    var number = String((item && item.number) || '').trim();
    if (!number) return '';
    var mi = item.measureIdent;
    var sit = (mi && typeof mi.session === 'string') ? mi.session.trim() : '';
    if (!sit) {
      var c = item.congress;
      sit = (typeof c === 'number' && isFinite(c) && c > 0) ? String(c) : '';
    }
    return 'n:' + sit + '|' + number;
  }

  // THE ISSUE'S OWN WORD, never the raw key. ISSUE_MAP is the vocabulary; a key
  // it does not hold prints no label at all rather than printing a slug, which
  // is a leak of an internal name into a public page.
  function issueLabel(key) {
    try {
      var M = window.ISSUE_MAP;
      if (!key || !M || typeof M !== 'object') return '';
      var e = M[key];
      if (!e) return '';
      return String(e.label || e.name || e.title || '') || '';
    } catch (e) { return ''; }
  }

  // ── THE ISSUE'S OWN COLOUR, BORROWED AND NEVER INVENTED ───────────────────
  // THE SAME ROAD /my-stances TAKES, down to the second argument.
  // PDXIssueColors.skin(key, window.coreIssueForKey) hands back the whole
  // ` data-ic="on" style="--pdx-ic:…"` fragment, and my-stances.js's own
  // skin() calls it with exactly that lookup (my-stances.js:116) as does
  // stance-studio.js's chip skin (stance-studio.js:173). Passing a DIFFERENT
  // lookup here would resolve some keys to a different core issue and the same
  // issue would carry two colours on two surfaces, which is the whole failure
  // the shared module exists to prevent — so the argument is copied, not chosen.
  //
  // window.coreIssueForKey IS UNDEFINED ON THIS DOCUMENT, and that is correct
  // rather than a gap: it is alignment-tool.js's, alignment-tool.js is not here
  // (nor on /my-stances, nor on /me), and skin() falls through to the leaf index
  // and then ROLLUP_PARENT — identically on all three. The token is therefore
  // byte-identical to the one /my-stances prints for the same key.
  //
  // AN UNRESOLVED KEY GETS NO ATTRIBUTE AT ALL, by that module's design, so a
  // key that stopped resolving prints the label with no treatment instead of
  // painting every row the same neutral slate and implying a colour system that
  // is off. An absent module does the same thing.
  function issueSkin(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || !fn(C.skin)) return '';
      var sk = C.skin(String(key == null ? '' : key), window.coreIssueForKey);
      return (sk && sk.attr) ? String(sk.attr) : '';
    } catch (e) { return ''; }
  }

  // The issue under a measure row, as a CHIP rather than as grey small print.
  // It was grey small print, and grey said "footnote" about the one field on the
  // row that tells a reader whether this measure is on something they care
  // about. Same element, same class, plus the shared token.
  function issueChip(key) {
    var label = issueLabel(key);
    if (!label) return '';
    return '<span class="pdxdb-m-issue"' + issueSkin(key) + '>' + esc(label) + '</span>';
  }

  // WHERE A ROW POINTS, in the order the site already canonicalises: the bill's
  // own address first, then the issue's, then nothing. A row with no address is
  // still printed — the measure is on the table whether or not this archive can
  // link it — but it is printed as text, never as a control that goes nowhere.
  function measureHref(item, issueKey) {
    var ident = (item && item.measureIdent) || null;
    var number = String((item && item.number) || '').trim();
    var session = String((ident && ident.session) || '').trim();
    if (number) {
      // /b/<sitting>/<number>, built exactly as the site's canonical bill link
      // is built (the origin() + '/b/' branch of the link canonicaliser). The
      // sitting leads because a bill number alone is not an identity: "H.B. 257"
      // names a different bill in every Utah general session.
      return '/b/' + (session ? encodeURIComponent(session) + '/' : '') + encodeURIComponent(number);
    }
    if (ident && ident.billUrl) {
      var u = String(ident.billUrl);
      if (/^https?:\/\//i.test(u)) return u;
    }
    if (issueKey) return '/i/' + encodeURIComponent(issueKey);
    return '';
  }

  // ONE ROW, AS IT SITS IN ONE GROUP. It wears every chip it carries (so a
  // measure in two groups says so in both), and its counts are the tally for
  // `groupKey`, the issue whose group it is printed under — '' for the unfiled
  // rows, which have no issue tally and print 0 and 0.
  function measureRow(item, tally, groupKey, hidden) {
    if (!item) return '';
    var title = String(item.title || '').trim();
    var number = String(item.number || '').trim();
    if (!title && !number) return '';

    var keys = rowIssues(item);
    var key = groupKey || '';
    var chips = '';
    for (var i = 0; i < keys.length; i++) chips += issueChip(keys[i]);
    var t = (key && tally[key]) || null;
    var polls = t ? t.polls : 0;
    var comments = t ? t.comments : 0;
    var href = measureHref(item, key || keys[0] || '');
    var shown = title || number;

    var cell = href
      ? '<a class="pdxdb-m-link" href="' + esc(href) + '">' + esc(shown) + '</a>'
      : '<span class="pdxdb-m-plain">' + esc(shown) + '</span>';

    return '<tr class="pdxdb-row"' + (key ? ' data-pdxdb-issue="' + esc(key) + '"' : '') +
        ' data-pdxdb-find="' + esc(findText(item)) + '"' + (hidden ? ' hidden' : '') + '>' +
        '<td class="pdxdb-m">' + cell +
          (number && title ? '<span class="pdxdb-m-num">' + esc(number) + '</span>' : '') +
          chips +
        '</td>' +
        '<td class="pdxdb-num" data-pdxdb-polls="' + esc(String(polls)) + '">' + esc(String(polls)) + '</td>' +
        '<td class="pdxdb-num" data-pdxdb-comments="' + esc(String(comments)) + '">' + esc(String(comments)) + '</td>' +
      '</tr>';
  }

  // ── THE READER'S OWN POSITIONS ────────────────────────────────────────────
  // ONE READ, THROUGH THE ONE OWNER. stance-sides.js is the single answer to
  // "which sides does this person hold". It is asked here exactly once per
  // paint and its answer decides everything below — never a storage key, never
  // a second store, never a party, never a score, and never a count this file
  // composed out of what it happened to see.
  //
  // ── THE LIE THIS REPLACES, AND IT WAS THIS FUNCTION ───────────────────────
  // The old shape was `if (n <= 0) print "You have no positions on file."`, and
  // count() returns -1 here when the module is ABSENT. So the one case where
  // this file knew nothing printed the most confident sentence on the page, and
  // a reader whose /me listed three sides read "You have no positions on file"
  // on the same morning from the same account. The count was not wrong; the
  // question was never asked, and the answer was invented.
  //
  // THREE STATES, AND THE THIRD IS SILENCE. A count is a fact, zero is a fact,
  // and "this document could not ask" is neither of those and must not be
  // printed as either. It is the same three-state grammar the room band uses —
  // a real number, an honest zero, or a read that did not happen — applied to
  // the one band that had been collapsing the third onto the second.
  //
  //   unread  the reader module is not on this document, or it threw. NO
  //           SENTENCE ABOUT THEIR FILE AT ALL. The door still opens, because
  //           /my-stances is worth reaching whatever they hold.
  //   none    the reader says zero. The zero sentence, and the add flow.
  //   mine    the reader says one or more, and at least one is on this seat's
  //           issue list. Their own sides, read back.
  //   off-table
  //           the reader says one or more and none is on this list. Says
  //           nothing about their file either way: they are not new, and this
  //           district's table is not a judgement on what they care about.
  //
  // WHAT A READER WITH POSITIONS GETS. Their own sides, and only for issues
  // that are on THIS district's table. It is their file read back to them beside
  // the seat's list; it is not a match, not a score, and it says nothing about
  // the member. Sides on issues this table does not carry stay off the board.
  // "Does the reader have every store it walks?" — asked of the reader, which
  // owns the answer. This file deliberately does NOT sniff window.PDXStances or
  // window.PDXYourFile: that would make it a second owner of which stores back
  // the shared reader, and the next store added there would leave this wrong.
  // An older stance-sides.js without complete() is treated as complete, so this
  // module degrades to the count it is given rather than going silent.
  function readerComplete() {
    try {
      var S = window.PDXStanceSides;
      if (S && fn(S.complete)) return !!S.complete();
    } catch (e) {}
    return true;
  }

  // ── THE DOOR BACK, THROUGH THE ONE OWNER ─────────────────────────────────
  // Every studio link on this band carries this board as PDXReturn's `next`,
  // so a save or a dismiss in the studio lands the reader here and not on /me.
  // The address is the MOUNTED board's own route (the document says which
  // board it is; this never reads the URL), and it goes through
  // PDXReturn.studioHref(), which owns the parameter and the allow-list the
  // finder and Join already use. No PDXReturn on the document, no intent: the
  // plain address, exactly as before.
  function stanceDoor(add) {
    try {
      var R = window.PDXReturn;
      if (R && fn(R.studioHref)) return R.studioHref(ROUTE(), !!add);
    } catch (e) {}
    return add ? COPY.stanceHref : COPY.stanceMoreHref;
  }

  function stanceHtml(tableIssues) {
    var S = null;
    var n = -1;
    try {
      S = window.PDXStanceSides;
      if (S && fn(S.count)) n = whole(S.count());
    } catch (e) { S = null; n = -1; }

    // THE READER COULD NOT FULLY RUN. The door and nothing else. Not the zero
    // sentence, not a dash, not "0 positions" — a guess wearing a number.
    //
    // TWO WAYS IT CANNOT RUN, AND BOTH END HERE. The module is absent or threw
    // (n stays -1); or it is here but one of the two stores it walks has no
    // owner on this document, which it reports itself through complete(). The
    // second is the case that produced the lie: a reader that can see the device
    // key and not the account desk returns 0 for a visitor holding three, and
    // this file has no way to tell that 0 from a real one. It does not guess.
    // A COUNT OF ONE OR MORE IS BELIEVED EITHER WAY — a side that was found was
    // found, and a partial read can only ever under-report.
    if (n === 0 && !readerComplete()) n = -1;
    if (n < 0) {
      return '<div class="pdxdb-stance" data-pdxdb-stance="unread">' +
          '<a class="pdxdb-stance-cta" href="' + esc(stanceDoor(false)) + '"' +
          ' data-pdxdb-stance-cta="open">' + esc(COPY.stanceCta) + '</a>' +
        '</div>';
    }

    if (n === 0) {
      return '<div class="pdxdb-stance" data-pdxdb-stance="none">' +
          '<a class="pdxdb-stance-cta" href="' + esc(stanceDoor(true)) + '"' +
          ' data-pdxdb-stance-cta="set">' + esc(COPY.stanceCta) + '</a>' +
          '<p class="pdxdb-stance-note">' + esc(COPY.stanceCtaNote) + '</p>' +
        '</div>';
    }

    // THE FILTER. Their sides, intersected with this seat's issue list — the
    // list band 3 actually printed, passed in rather than re-derived, so a side
    // can never appear here for a measure that is not on the table above it.
    var mine = [];
    try {
      var list = (S && fn(S.list) && S.list()) || [];
      var want = {};
      var ti = Array.isArray(tableIssues) ? tableIssues : [];
      for (var a = 0; a < ti.length; a++) if (ti[a]) want[String(ti[a])] = 1;
      for (var i = 0; i < list.length; i++) {
        var row = list[i];
        if (!row || !row.key || !want[row.key]) continue;
        var lbl = issueLabel(row.key);
        var side = fn(S.label) ? S.label(row.position) : '';
        if (!lbl || !side) continue;
        mine.push('<li class="pdxdb-side"' + issueSkin(row.key) + '>' +
          '<span class="pdxdb-side-k">' + esc(lbl) + '</span>' +
          '<span class="pdxdb-side-v">' + esc(side) + '</span></li>');
      }
    } catch (e2) { mine = []; }

    if (!mine.length) {
      // They hold positions, but none on this seat's issues. That is not a
      // prompt to set more and it is not an empty state worth a sentence about
      // them — the door stays available and says nothing about their file. It
      // is the PLAIN address, not the add flow: they are not a first run.
      return '<div class="pdxdb-stance" data-pdxdb-stance="off-table">' +
          '<a class="pdxdb-stance-cta" href="' + esc(stanceDoor(false)) + '"' +
          ' data-pdxdb-stance-cta="open">' + esc(COPY.stanceCta) + '</a>' +
        '</div>';
    }

    return '<div class="pdxdb-stance" data-pdxdb-stance="mine">' +
        '<p class="pdxdb-stance-note">' + esc(COPY.stanceMineNote) + '</p>' +
        '<ul class="pdxdb-sides">' + mine.join('') + '</ul>' +
        '<p class="pdxdb-stance-act">' +
          '<a class="pdxdb-stance-more" href="' + esc(stanceDoor(false)) + '"' +
          ' data-pdxdb-stance-cta="more">' + esc(COPY.stanceMore) + '</a>' +
        '</p>' +
      '</div>';
  }

  // ── THE POSTING SEAM, PAINTED OFF ─────────────────────────────────────────
  // A real field, really disabled, with the reason beside it. `disabled` and
  // `aria-disabled` both, and no form, no action, no handler: there is nothing
  // for a click to reach. See the header for what was deliberately not built.
  function composeHtml() {
    return '<div class="pdxdb-compose" data-pdxdb-compose="off">' +
        '<label class="pdxdb-compose-l" for="pdxdb-say">' + esc(COPY.composeLabel) + '</label>' +
        '<input class="pdxdb-compose-i" id="pdxdb-say" type="text" disabled aria-disabled="true"' +
          ' placeholder="' + esc(COPY.composePlaceholder) + '" />' +
        '<p class="pdxdb-compose-n">' + esc(COPY.composeNote) + '</p>' +
      '</div>';
  }

  // One band's frame, so three bands cannot be three shapes. `footer` is the
  // band footer sentence and is omitted when empty rather than printed blank.
  function band(id, heading, note, body, footer) {
    return '<section class="pdxdb-band pdxdb-band--' + esc(id) + '" data-pdxdb-band="' + esc(id) + '">' +
        '<h2 class="pdxdb-h2">' + esc(heading) + '</h2>' +
        (note ? '<p class="pdxdb-note">' + esc(note) + '</p>' : '') +
        body +
        (footer ? '<p class="pdxdb-foot">' + esc(footer) + '</p>' : '') +
      '</section>';
  }

  // ── THE READS ─────────────────────────────────────────────────────────────
  // Both are best-effort and neither can throw into the caller. A failure
  // resolves to the sentinel its band renders as "could not read" — never to an
  // empty payload, which would paint as zero. See RULE 2.
  var FAILED = { failed: true };

  // `fresh` is refresh()'s: after a post on SD-3 the count must come from the
  // store again, not from the minute-long public cache the first read may sit in.
  function fetchCounts(fresh) {
    var url = API + '?seat=' + encodeURIComponent(ALIAS()) + (fresh ? '&fresh=' + Date.now() : '');
    try {
      return fetch(url, fresh ? { headers: { accept: 'application/json' }, cache: 'no-store' }
                              : { headers: { accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('district-board ' + r.status);
          return r.json();
        })
        .then(function (data) {
          // A payload without a counts object is not a room with nobody in it.
          if (!data || typeof data !== 'object' || !data.counts) return FAILED;
          return data;
        })
        .catch(function () { return FAILED; });
    } catch (e) {
      return Promise.resolve(FAILED);
    }
  }

  function fetchTable() {
    try {
      // NO HOLDER, NO ARCHIVE READ — AND THAT IS NOT A FAILED READ. The archive
      // is keyed by PERSON, so a seat whose holder has not resolved has no
      // query to issue. It resolves EMPTY rather than FAILED: "no measures on
      // hand for this seat" is true (we hold none) and "we could not read the
      // archive" would not be (we never asked). Two different sentences, and
      // this is the one that matches what happened. The skip is REMEMBERED, so
      // a holder who resolves later (see mount()'s roster subscription) gets
      // the read that was never issued rather than an empty table for the whole
      // visit.
      var pid = PID();
      if (!pid) { _tableSkipped = true; return Promise.resolve([]); }
      _tableSkipped = false;
      var V = window.PDXVotingRecord;
      if (!V || !fn(V.fetchMember)) return Promise.resolve(FAILED);
      // THE BASELINE QUERY, NOT A NEW ONE. Same pid, same page size every
      // warming caller in the app uses, so this reuses their memo instead of
      // issuing a second request against a cache key nobody else reads. And
      // noteMember() is NOT called: see the header.
      return Promise.resolve(V.fetchMember(pid, { pageSize: PAGE_SIZE }))
        .then(function (data) {
          if (!data || !Array.isArray(data.items)) return FAILED;
          return data.items;
        })
        .catch(function () { return FAILED; });
    } catch (e) {
      return Promise.resolve(FAILED);
    }
  }

  // ── MOUNT ─────────────────────────────────────────────────────────────────
  // Paints the three bands in order, twice: once immediately with both reads in
  // their waiting state, and once more as each answer lands. The first paint is
  // the quiet one — it never shows a zero it has not been told, which is the
  // whole reason band 2 has a 'wait' state at all.
  //
  // WHICH BOARD IT PAINTS IS THE HOST'S ANSWER, THEN THE DOCUMENT'S. A seat on
  // neither is not painted at all: returns false and paints NOTHING, so this
  // module is inert on any document that loads it without a board's host. That
  // is how it can ship on person.html for personLinkHtml() alone. And the
  // resolved board is latched into ACTIVE before the first paint, so every band
  // below — the roster row, the ?seat= query, the archive pid — reads the seat
  // this document is actually for and never the default.
  var _counts = null;   // null = in flight, FAILED = could not read
  var _items = null;
  // The archive read was skipped for want of a resolved holder, rather than
  // issued and answered empty. See fetchTable() and the roster subscription.
  var _tableSkipped = false;
  var _el = null;       // the mounted host, for refresh()
  var _issues = [];     // the issue keys the table last printed, for the composer

  // ── THE ONE BOARD THAT TAKES A VOICE ──────────────────────────────────────
  // district-composer.js owns SD-3's composer, and its host is in THAT document
  // only. Where the host exists this module leaves the posting slot to it rather
  // than painting the "Posting ships next" field beside a real one; everywhere
  // else (every other board) the disabled seam below is unchanged.
  function composerOwned() {
    try { return !!(typeof document !== 'undefined' && document.getElementById('pdx-district-composer')); }
    catch (e) { return false; }
  }

  // Band 2 read again, from the store. Called by the composer after a post
  // lands so the count a reader just moved is the count they see.
  function refresh() {
    if (!_el) return Promise.resolve(false);
    return fetchCounts(true).then(function (d) {
      if (d !== FAILED) _counts = d;
      paint(_el);
      return d !== FAILED;
    });
  }

  function mount(host) {
    var el = host || document.getElementById('pdx-district-board');
    if (!el) return false;
    var b = board(hostSeat(el)) || board(docSeat()) || ACTIVE;
    if (!b || !Object.prototype.hasOwnProperty.call(BOARD_SEATS, b.seat)) return false;
    ACTIVE = b;
    _el = el;

    paint(el);
    fetchCounts().then(function (d) { _counts = d; paint(el); });
    fetchTable().then(function (d) { _items = d; paint(el); });
    // ── THE ROSTER MAY NOT BE HERE YET, AND BAND 1 IS THE BAND THAT CARES ────
    // A congressional board's holder comes from _pdxUsHouseSeat(), which walks
    // the roster — and cmp-data.js is DEFERRED, so the first paint can happen
    // before there is a roster to walk. Without this, /district/ut-cd-2 would
    // keep "no member on file" for the whole visit over a roster that arrived
    // half a second later, which is the stale-blank failure
    // window.pdxRosterReady() exists to close. It is asked through that one
    // owner and never polled: a subscriber registered after the roster landed
    // runs immediately, so there is no event to miss. Absent (person.html, a
    // board document without the module) this is simply not wired, and the
    // three roster-keyed boards never needed it.
    try {
      if (fn(window.pdxRosterReady)) {
        window.pdxRosterReady(function () {
          try {
            // A HOLDER THAT RESOLVED LATE GETS THE READ THAT WAS SKIPPED, and
            // only then: a board whose archive read really was issued is never
            // re-issued here, because a second identical query is not new
            // information.
            if (_tableSkipped && PID()) {
              fetchTable().then(function (d) { _items = d; paint(el); });
            }
            paint(el);
          } catch (e) {}
        });
      }
    } catch (e) {}
    return true;
  }

  function paint(el) {
    var cState = _counts === null ? 'wait' : (_counts === FAILED ? 'unread' : 'ok');
    var tState = _items === null ? 'wait' : (_items === FAILED ? 'unread' : 'ok');
    var rooms = (cState === 'ok' && _counts && Array.isArray(_counts.rooms)) ? _counts.rooms : [];
    var items = (tState === 'ok') ? _items : [];

    // The issue list the stance band filters against is the issue list the
    // TABLE ACTUALLY PRINTED, from the same function that printed it.
    var groups = tableGroups(tableRows(items)).groups;
    var issues = [];
    for (var i = 0; i < groups.length; i++) issues.push(groups[i].key);

    _issues = issues;
    injectCss();
    wireTable(el);
    // A repaint rebuilds the search field; if the reader was typing in it,
    // hand the caret back rather than dropping their focus mid-word.
    var typing = false;
    try { typing = !!(document.activeElement && document.activeElement.hasAttribute &&
      document.activeElement.hasAttribute('data-pdxdb-search') && el.contains && el.contains(document.activeElement)); } catch (e) {}
    el.innerHTML =
      seatHtml() +
      roomHtml(cState, _counts === FAILED ? null : _counts) +
      tableHtml(tState, items, rooms) +
      stanceHtml(issues) +
      (composerOwned() ? '' : composeHtml());
    if (typing) {
      try {
        var f = el.querySelector('[data-pdxdb-search]');
        if (f) { f.focus(); var n = String(f.value || '').length; if (fn(f.setSelectionRange)) f.setSelectionRange(n, n); }
      } catch (e) {}
    }
    try {
      if (typeof document !== 'undefined' && fn(document.dispatchEvent) && typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent('pdxdb:paint'));
      }
    } catch (e) {}
  }

  // ── THE ONE CONTROL ON THE PERSON FILE ────────────────────────────────────
  // "Senate District 7 board → this page", and it is a real anchor to a real
  // address that really renders. It walks the WHOLE board table and answers ''
  // for every pid that does not sit in one of them — so person-file.js holds no
  // allow-list of its own and degrades to exactly today's kicker when this file
  // is missing. No count, no badge, no dot: a tally of a district's activity
  // sitting on a person's dossier would be a metric about the person.
  //
  // ONLY FOR A ROUTE THAT EXISTS, and the table IS the set of routes that exist,
  // so the two cannot drift. A congressional board matches through pidOf() and
  // therefore through _pdxUsHouseSeat(); on a document without that module
  // (person.html is one) see memberOf() below. A missing control is a
  // degradation; a control onto a board whose holder this app could not confirm
  // would be a claim.
  //
  // It does not closeModal(). The dead button this replaces on other surfaces is
  // the exact defect worth naming here: a control that dismisses the thing you
  // were reading, in the name of taking you somewhere, took you nowhere.
  //
  // THE CONGRESSIONAL ROWS ON A DOCUMENT WITHOUT THE JOIN. person.html cannot
  // carry voter-hub-location.js — it redefines profiles-full.js's status
  // helpers — so on a person file pidOf() answers '' for all four UT-N rows and
  // the four sitting members got no door back to the board that names them.
  // memberOf() asks the join first, exactly as band 1 does, and only where the
  // join is absent asks seated-member.js's pdxSeatedMemberFor(seat): the curated
  // congressional table /voice already loads. Band 1 never takes this path —
  // it still prints "no member on file" without the join — and
  // scripts/test-internal-hops.mjs pins the table's answer equal to the join's
  // for every usHouse row, so the door and the board cannot name two people.
  function memberOf(b) {
    var p = pidOf(b);
    if (p || !b || !b.usHouse || fn(window._pdxUsHouseSeat)) return p;
    try {
      if (!fn(window.pdxSeatedMemberFor)) return '';
      return String(window.pdxSeatedMemberFor(b.seat) || '');
    } catch (e) { return ''; }
  }
  function boardForPid(pid) {
    var want = String(pid || '');
    if (!want) return null;
    for (var k in BOARDS) {
      if (!Object.prototype.hasOwnProperty.call(BOARDS, k)) continue;
      if (memberOf(BOARDS[k]) === want) return BOARDS[k];
    }
    return null;
  }

  function personLinkHtml(pid) {
    var b = boardForPid(pid);
    if (!b) return '';
    return '<a class="pf-kick-board" href="' + esc(b.route) + '"' +
      ' data-pdxdb-open="' + esc(b.alias) + '"' +
      ' title="' + esc(b.kickTitle) + '">' + esc(b.kick) + '</a>';
  }

  function wire() {
    var go = function () {
      try { mount(null); } catch (e) {}
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go, { once: true });
    } else {
      go();
    }
  }

  window.PDXDistrictBoard = {
    // THE ACTIVE BOARD'S FIELDS, and they are still scalars. Every caller since
    // the first board reads these four, so they stay what they were — the seat
    // this document is for — rather than becoming functions and breaking them.
    // On a document that names no seat they are the default board's; nothing
    // PAINTS from them (see mount(), which resolves the host's own seat).
    SEAT: SEAT(),
    ALIAS: ALIAS(),
    ROUTE: ROUTE(),
    PID: PID(),
    API: API,
    // ── THE WHOLE ALLOW-LIST, BOTH SHAPES ───────────────────────────────────
    // BOARD_SEATS answers "does this seat have a board" and is what the suite
    // pins equal to district-board.mts's copy. BOARDS is the table itself, for
    // a caller that needs a board's address or its page chrome. board() is the
    // accessor and takes any spelling.
    BOARD_SEATS: BOARD_SEATS,
    BOARDS: BOARDS,
    board: board,
    boardForPid: boardForPid,
    // Who this module says holds a seat, through the one owner of each answer:
    // the roster key on the row, or _pdxUsHouseSeat() for a congressional one.
    // '' is an answer, and it is not a name.
    pidOf: pidOf,
    // WHICH BOARD IS MOUNTED, ASKED LIVE. The four scalars above are a snapshot
    // taken at load; this follows mount()'s resolution, so a caller (and the
    // suite) can tell which seat actually painted rather than which one the
    // document was expected to name.
    active: function () { return ACTIVE; },
    COPY: COPY,
    NEVER_FEEDS: NEVER_FEEDS,
    // No score is published from this surface, on finance-lane.js's terms.
    scored: false,
    mount: mount,
    personLinkHtml: personLinkHtml,
    // Exposed for the suite: each band's markup asserted directly against a
    // payload, rather than inferred from a live fetch.
    seatHtml: seatHtml,
    roomHtml: roomHtml,
    tableHtml: tableHtml,
    stanceHtml: stanceHtml,
    stanceDoor: stanceDoor,
    composeHtml: composeHtml,
    // For district-composer.js on SD-3: the seat's own issue list (what band 3
    // printed), the vocabulary's word for a key, and a fresh band-2 read.
    issues: function () { return _issues.slice(); },
    issueLabel: issueLabel,
    refresh: refresh,
    _whole: whole,
    _people: people,
    _faceUrl: faceUrl,
    _measureHref: measureHref,
    _rowIssues: rowIssues,
    _tableGroups: tableGroups,
    // THE READER'S VIEW OF BAND 3: a category chip ('' is All) and a search.
    setCategory: setCategory,
    setQuery: setQuery,
    view: function () { return { cat: _view.cat, q: _view.q }; },
    // Exposed for the suite: which of the three answers each band is showing, so
    // "counting", "nobody on file" and "we could not look" are asserted as three
    // different states rather than guessed at from one sentence.
    state: function () {
      return {
        counts: _counts === null ? 'wait' : (_counts === FAILED ? 'unread' : 'ok'),
        table: _items === null ? 'wait' : (_items === FAILED ? 'unread' : 'ok')
      };
    },
    payload: function () { return _counts === FAILED ? null : _counts; }
  };

  wire();
})();
