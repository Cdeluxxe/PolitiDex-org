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

     · NOT A COMPOSER. district-composer.js is. See THE READ-ONLY LINE.

   ── THE COMPOSER, AND THE READ-ONLY LINE ───────────────────────────────────
   Reading this board is free and open to anybody, signed in or not. POSTING to
   it is district-composer.js's, on every board whose row below is
   `composer: true` — every board: Utah's, the three statewide seats, and every
   other state's U.S. House and U.S. Senate board — and whose document carries that module's
   host. The server's gate (a Didit-verified residency row for THIS seat) is the
   one that counts. A document with no composer host still prints the one
   read-only line instead: no disabled box, and no sentence promising that
   posting is coming, because a promise the board does not honour is a claim
   it cannot back.

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
             window.pdxPortrait(PID)     the roster field `photo` — the one
                                         portrait the person file and the record
                                         card read too; the row's `icon` when
                                         there is none.
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
  //   composer
  //          true on every row, Utah's and every other state's U.S. House and
  //          U.S. Senate board alike: the document carries district-composer.js's
  //          host, and the server's gate is a Didit-verified residency row for
  //          THAT seat.
  //   h1 / where
  //          the page chrome each document prints, repeated here so the suite
  //          can hold the document and the module to one spelling of one seat.
  //   kick / kickTitle
  //          the person-file control's words. See personLinkHtml().
  var BOARDS = {
    'ut-statesenate-3': {
      seat: 'ut-statesenate-3',
      composer: true,
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
      composer: true,
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
      composer: true,
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
      composer: true,
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
      composer: true,
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
      composer: true,
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
    'ut-statehouse-4': { seat: 'ut-statehouse-4', composer: true, alias: 'ut-hd-4', route: '/district/ut-hd-4', pid: 'auxier_h4', h1: 'Utah House District 4', where: 'Morgan / Summit / Rich County', kick: 'House District 4 board', kickTitle: 'The district board for Utah House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-5': { seat: 'ut-statehouse-5', composer: true, alias: 'ut-hd-5', route: '/district/ut-hd-5', pid: 'snider_h5', h1: 'Utah House District 5', where: 'Cache County', kick: 'House District 5 board', kickTitle: 'The district board for Utah House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-6': { seat: 'ut-statehouse-6', composer: true, alias: 'ut-hd-6', route: '/district/ut-hd-6', pid: 'rob_bishop', h1: 'Utah House District 6', where: 'Box Elder / Weber County', kick: 'House District 6 board', kickTitle: 'The district board for Utah House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-9': { seat: 'ut-statehouse-9', composer: true, alias: 'ut-hd-9', route: '/district/ut-hd-9', pid: 'jake_sawyer', h1: 'Utah House District 9', where: 'Ogden / Weber Co.', kick: 'House District 9 board', kickTitle: 'The district board for Utah House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-10': { seat: 'ut-statehouse-10', composer: true, alias: 'ut-hd-10', route: '/district/ut-hd-10', pid: 'koford_h10', h1: 'Utah House District 10', where: 'South Ogden, Weber County', kick: 'House District 10 board', kickTitle: 'The district board for Utah House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-11': { seat: 'ut-statehouse-11', composer: true, alias: 'ut-hd-11', route: '/district/ut-hd-11', pid: 'hall_h11', h1: 'Utah House District 11', where: 'South Ogden', kick: 'House District 11 board', kickTitle: 'The district board for Utah House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-12': { seat: 'ut-statehouse-12', composer: true, alias: 'ut-hd-12', route: '/district/ut-hd-12', pid: 'mschultz', h1: 'Utah House District 12', where: 'Hooper, Weber County', kick: 'House District 12 board', kickTitle: 'The district board for Utah House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-14': { seat: 'ut-statehouse-14', composer: true, alias: 'ut-hd-14', route: '/district/ut-hd-14', pid: 'lisonbee_h14', h1: 'Utah House District 14', where: 'Clearfield / Syracuse', kick: 'House District 14 board', kickTitle: 'The district board for Utah House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-19': { seat: 'ut-statehouse-19', composer: true, alias: 'ut-hd-19', route: '/district/ut-hd-19', pid: 'rward', h1: 'Utah House District 19', where: 'Bountiful, Davis County', kick: 'House District 19 board', kickTitle: 'The district board for Utah House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-21': { seat: 'ut-statehouse-21', composer: true, alias: 'ut-hd-21', route: '/district/ut-hd-21', pid: 'hollins_h24', h1: 'Utah House District 21', where: 'Salt Lake City', kick: 'House District 21 board', kickTitle: 'The district board for Utah House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-22': { seat: 'ut-statehouse-22', composer: true, alias: 'ut-hd-22', route: '/district/ut-hd-22', pid: 'jennifer_dailey_provost', h1: 'Utah House District 22', where: 'Salt Lake City', kick: 'House District 22 board', kickTitle: 'The district board for Utah House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-23': { seat: 'ut-statehouse-23', composer: true, alias: 'ut-hd-23', route: '/district/ut-hd-23', pid: 'hoang_nguyen', h1: 'Utah House District 23', where: 'Salt Lake City', kick: 'House District 23 board', kickTitle: 'The district board for Utah House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-24': { seat: 'ut-statehouse-24', composer: true, alias: 'ut-hd-24', route: '/district/ut-hd-24', pid: 'grant_miller', h1: 'Utah House District 24', where: 'Salt Lake City', kick: 'House District 24 board', kickTitle: 'The district board for Utah House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-25': { seat: 'ut-statehouse-25', composer: true, alias: 'ut-hd-25', route: '/district/ut-hd-25', pid: 'aromero', h1: 'Utah House District 25', where: 'West Salt Lake City, Salt Lake County', kick: 'House District 25 board', kickTitle: 'The district board for Utah House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-28': { seat: 'ut-statehouse-28', composer: true, alias: 'ut-hd-28', route: '/district/ut-hd-28', pid: 'nicholeen_p_peck', h1: 'Utah House District 28', where: 'Tooele, Tooele County', kick: 'House District 28 board', kickTitle: 'The district board for Utah House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-29': { seat: 'ut-statehouse-29', composer: true, alias: 'ut-hd-29', route: '/district/ut-hd-29', pid: 'bolinder_h68', h1: 'Utah House District 29', where: 'Tooele / Grantsville', kick: 'House District 29 board', kickTitle: 'The district board for Utah House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-30': { seat: 'ut-statehouse-30', composer: true, alias: 'ut-hd-30', route: '/district/ut-hd-30', pid: 'fitisemanu_h30', h1: 'Utah House District 30', where: 'West Valley City', kick: 'House District 30 board', kickTitle: 'The district board for Utah House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-31': { seat: 'ut-statehouse-31', composer: true, alias: 'ut-hd-31', route: '/district/ut-hd-31', pid: 'verona_mauga', h1: 'Utah House District 31', where: 'West Valley City / Taylorsville, Salt Lake County', kick: 'House District 31 board', kickTitle: 'The district board for Utah House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-33': { seat: 'ut-statehouse-33', composer: true, alias: 'ut-hd-33', route: '/district/ut-hd-33', pid: 'doug_owens', h1: 'Utah House District 33', where: 'Millcreek, Salt Lake County', kick: 'House District 33 board', kickTitle: 'The district board for Utah House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-34': { seat: 'ut-statehouse-34', composer: true, alias: 'ut-hd-34', route: '/district/ut-hd-34', pid: 'carol_spackman_moss', h1: 'Utah House District 34', where: 'Holladay, Salt Lake County', kick: 'House District 34 board', kickTitle: 'The district board for Utah House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-36': { seat: 'ut-statehouse-36', composer: true, alias: 'ut-hd-36', route: '/district/ut-hd-36', pid: 'james_dunnigan', h1: 'Utah House District 36', where: 'Taylorsville, Salt Lake County', kick: 'House District 36 board', kickTitle: 'The district board for Utah House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-37': { seat: 'ut-statehouse-37', composer: true, alias: 'ut-hd-37', route: '/district/ut-hd-37', pid: 'ashlee_matthews', h1: 'Utah House District 37', where: 'Kearns, Salt Lake County', kick: 'House District 37 board', kickTitle: 'The district board for Utah House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-39': { seat: 'ut-statehouse-39', composer: true, alias: 'ut-hd-39', route: '/district/ut-hd-39', pid: 'ivory_h39', h1: 'Utah House District 39', where: 'West Jordan', kick: 'House District 39 board', kickTitle: 'The district board for Utah House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-41': { seat: 'ut-statehouse-41', composer: true, alias: 'ut-hd-41', route: '/district/ut-hd-41', pid: 'john_arthur', h1: 'Utah House District 41', where: 'Cottonwood Heights, Salt Lake County', kick: 'House District 41 board', kickTitle: 'The district board for Utah House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-42': { seat: 'ut-statehouse-42', composer: true, alias: 'ut-hd-42', route: '/district/ut-hd-42', pid: 'clinton_okerlund', h1: 'Utah House District 42', where: 'Sandy, Salt Lake County', kick: 'House District 42 board', kickTitle: 'The district board for Utah House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-43': { seat: 'ut-statehouse-43', composer: true, alias: 'ut-hd-43', route: '/district/ut-hd-43', pid: 'eliason_h45', h1: 'Utah House District 43', where: 'Sandy, Salt Lake County', kick: 'House District 43 board', kickTitle: 'The district board for Utah House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-44': { seat: 'ut-statehouse-44', composer: true, alias: 'ut-hd-44', route: '/district/ut-hd-44', pid: 'teuscher_h44', h1: 'Utah House District 44', where: 'South Jordan', kick: 'House District 44 board', kickTitle: 'The district board for Utah House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-45': { seat: 'ut-statehouse-45', composer: true, alias: 'ut-hd-45', route: '/district/ut-hd-45', pid: 'tracy_miller', h1: 'Utah House District 45', where: 'South Jordan, Salt Lake County', kick: 'House District 45 board', kickTitle: 'The district board for Utah House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-46': { seat: 'ut-statehouse-46', composer: true, alias: 'ut-hd-46', route: '/district/ut-hd-46', pid: 'calvin_roberts', h1: 'Utah House District 46', where: 'Draper / Bluffdale, Salt Lake County', kick: 'House District 46 board', kickTitle: 'The district board for Utah House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-49': { seat: 'ut-statehouse-49', composer: true, alias: 'ut-hd-49', route: '/district/ut-hd-49', pid: 'candice_pierucci', h1: 'Utah House District 49', where: 'Herriman / Riverton, Salt Lake County', kick: 'House District 49 board', kickTitle: 'The district board for Utah House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-50': { seat: 'ut-statehouse-50', composer: true, alias: 'ut-hd-50', route: '/district/ut-hd-50', pid: 'gricius_h50', h1: 'Utah House District 50', where: 'Eagle Mountain', kick: 'House District 50 board', kickTitle: 'The district board for Utah House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-51': { seat: 'ut-statehouse-51', composer: true, alias: 'ut-hd-51', route: '/district/ut-hd-51', pid: 'leah_hansen', h1: 'Utah House District 51', where: 'Saratoga Springs / west Lehi, Utah County', kick: 'House District 51 board', kickTitle: 'The district board for Utah House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-52': { seat: 'ut-statehouse-52', composer: true, alias: 'ut-hd-52', route: '/district/ut-hd-52', pid: 'cory_maloy_h52', h1: 'Utah House District 52', where: 'Lehi, Utah County', kick: 'House District 52 board', kickTitle: 'The district board for Utah House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-53': { seat: 'ut-statehouse-53', composer: true, alias: 'ut-hd-53', route: '/district/ut-hd-53', pid: 'kay_christofferson', h1: 'Utah House District 53', where: 'Lehi, Utah County', kick: 'House District 53 board', kickTitle: 'The district board for Utah House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-55': { seat: 'ut-statehouse-55', composer: true, alias: 'ut-hd-55', route: '/district/ut-hd-55', pid: 'jon_hawkins', h1: 'Utah House District 55', where: 'Pleasant Grove / American Fork, Utah County', kick: 'House District 55 board', kickTitle: 'The district board for Utah House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-56': { seat: 'ut-statehouse-56', composer: true, alias: 'ut-hd-56', route: '/district/ut-hd-56', pid: 'valpeterson_h56', h1: 'Utah House District 56', where: 'Orem', kick: 'House District 56 board', kickTitle: 'The district board for Utah House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-59': { seat: 'ut-statehouse-59', composer: true, alias: 'ut-hd-59', route: '/district/ut-hd-59', pid: 'kohler_h59', h1: 'Utah House District 59', where: 'Heber City, Wasatch / Summit County', kick: 'House District 59 board', kickTitle: 'The district board for Utah House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-60': { seat: 'ut-statehouse-60', composer: true, alias: 'ut-hd-60', route: '/district/ut-hd-60', pid: 'grant_pace', h1: 'Utah House District 60', where: 'Provo, Utah County', kick: 'House District 60 board', kickTitle: 'The district board for Utah House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-61': { seat: 'ut-statehouse-61', composer: true, alias: 'ut-hd-61', route: '/district/ut-hd-61', pid: 'lisa_shepherd', h1: 'Utah House District 61', where: 'Provo', kick: 'House District 61 board', kickTitle: 'The district board for Utah House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-63': { seat: 'ut-statehouse-63', composer: true, alias: 'ut-hd-63', route: '/district/ut-hd-63', pid: 'whyte_h63', h1: 'Utah House District 63', where: 'Spanish Fork, Utah County', kick: 'House District 63 board', kickTitle: 'The district board for Utah House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-64': { seat: 'ut-statehouse-64', composer: true, alias: 'ut-hd-64', route: '/district/ut-hd-64', pid: 'jackie_larson', h1: 'Utah House District 64', where: 'Spanish Fork / Salem, Utah County', kick: 'House District 64 board', kickTitle: 'The district board for Utah House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-65': { seat: 'ut-statehouse-65', composer: true, alias: 'ut-hd-65', route: '/district/ut-hd-65', pid: 'doug_welton', h1: 'Utah House District 65', where: 'Payson, Utah County', kick: 'House District 65 board', kickTitle: 'The district board for Utah House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-66': { seat: 'ut-statehouse-66', composer: true, alias: 'ut-hd-66', route: '/district/ut-hd-66', pid: 'shelley_h66', h1: 'Utah House District 66', where: 'Ephraim, Sanpete / Juab County', kick: 'House District 66 board', kickTitle: 'The district board for Utah House District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-67': { seat: 'ut-statehouse-67', composer: true, alias: 'ut-hd-67', route: '/district/ut-hd-67', pid: 'christine_watkins', h1: 'Utah House District 67', where: 'Price, Carbon County', kick: 'House District 67 board', kickTitle: 'The district board for Utah House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-68': { seat: 'ut-statehouse-68', composer: true, alias: 'ut-hd-68', route: '/district/ut-hd-68', pid: 'chew_h68', h1: 'Utah House District 68', where: 'Vernal, Uintah / Duchesne County', kick: 'House District 68 board', kickTitle: 'The district board for Utah House District 68: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-69': { seat: 'ut-statehouse-69', composer: true, alias: 'ut-hd-69', route: '/district/ut-hd-69', pid: 'logan_monson', h1: 'Utah House District 69', where: 'Blanding, San Juan County', kick: 'House District 69 board', kickTitle: 'The district board for Utah House District 69: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-70': { seat: 'ut-statehouse-70', composer: true, alias: 'ut-hd-70', route: '/district/ut-hd-70', pid: 'carl_albrecht', h1: 'Utah House District 70', where: 'Richfield, Sevier County', kick: 'House District 70 board', kickTitle: 'The district board for Utah House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-71': { seat: 'ut-statehouse-71', composer: true, alias: 'ut-hd-71', route: '/district/ut-hd-71', pid: 'rshipp', h1: 'Utah House District 71', where: 'Cedar City, Iron County', kick: 'House District 71 board', kickTitle: 'The district board for Utah House District 71: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-73': { seat: 'ut-statehouse-73', composer: true, alias: 'ut-hd-73', route: '/district/ut-hd-73', pid: 'colin_w_jack', h1: 'Utah House District 73', where: 'St. George, Washington County', kick: 'House District 73 board', kickTitle: 'The district board for Utah House District 73: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statehouse-75': { seat: 'ut-statehouse-75', composer: true, alias: 'ut-hd-75', route: '/district/ut-hd-75', pid: 'walt_brooks', h1: 'Utah House District 75', where: 'St. George, Washington County', kick: 'House District 75 board', kickTitle: 'The district board for Utah House District 75: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-1': { seat: 'ut-statesenate-1', composer: true, alias: 'ut-sd-1', route: '/district/ut-sd-1', pid: 'ssandall', h1: 'Utah Senate District 1', where: 'Box Elder/Cache', kick: 'Senate District 1 board', kickTitle: 'The district board for Utah Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-2': { seat: 'ut-statesenate-2', composer: true, alias: 'ut-sd-2', route: '/district/ut-sd-2', pid: 'cwilson', h1: 'Utah Senate District 2', where: 'Logan, Cache County', kick: 'Senate District 2 board', kickTitle: 'The district board for Utah Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-4': { seat: 'ut-statesenate-4', composer: true, alias: 'ut-sd-4', route: '/district/ut-sd-4', pid: 'cmusselman', h1: 'Utah Senate District 4', where: 'West Haven, Weber County', kick: 'Senate District 4 board', kickTitle: 'The district board for Utah Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-5': { seat: 'ut-statesenate-5', composer: true, alias: 'ut-sd-5', route: '/district/ut-sd-5', pid: 'amillner', h1: 'Utah Senate District 5', where: 'District 5 as the 2022 legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Utah Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-8': { seat: 'ut-statesenate-8', composer: true, alias: 'ut-sd-8', route: '/district/ut-sd-8', pid: 'tweiler', h1: 'Utah Senate District 8', where: 'Woods Cross', kick: 'Senate District 8 board', kickTitle: 'The district board for Utah Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-9': { seat: 'ut-statesenate-9', composer: true, alias: 'ut-sd-9', route: '/district/ut-sd-9', pid: 'jennifer_plumb', h1: 'Utah Senate District 9', where: 'Salt Lake City', kick: 'Senate District 9 board', kickTitle: 'The district board for Utah Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-10': { seat: 'ut-statesenate-10', composer: true, alias: 'ut-sd-10', route: '/district/ut-sd-10', pid: 'lescamilla', h1: 'Utah Senate District 10', where: 'Northwest Salt Lake City / West Valley City / Magna, Salt Lake County', kick: 'Senate District 10 board', kickTitle: 'The district board for Utah Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-11': { seat: 'ut-statesenate-11', composer: true, alias: 'ut-sd-11', route: '/district/ut-sd-11', pid: 'emily_buss', h1: 'Utah Senate District 11', where: 'Eagle Mountain / Tooele, Utah County', kick: 'Senate District 11 board', kickTitle: 'The district board for Utah Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-12': { seat: 'ut-statesenate-12', composer: true, alias: 'ut-sd-12', route: '/district/ut-sd-12', pid: 'kwan_s12', h1: 'Utah Senate District 12', where: 'West Valley / Murray', kick: 'Senate District 12 board', kickTitle: 'The district board for Utah Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-13': { seat: 'ut-statesenate-13', composer: true, alias: 'ut-sd-13', route: '/district/ut-sd-13', pid: 'blouin_s13', h1: 'Utah Senate District 13', where: 'Millcreek / Salt Lake City', kick: 'Senate District 13 board', kickTitle: 'The district board for Utah Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-14': { seat: 'ut-statesenate-14', composer: true, alias: 'ut-sd-14', route: '/district/ut-sd-14', pid: 'stephanie_pitcher', h1: 'Utah Senate District 14', where: 'Salt Lake City / Millcreek, Salt Lake County', kick: 'Senate District 14 board', kickTitle: 'The district board for Utah Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-15': { seat: 'ut-statesenate-15', composer: true, alias: 'ut-sd-15', route: '/district/ut-sd-15', pid: 'kathleen_riebe', h1: 'Utah Senate District 15', where: 'Cottonwood Heights, Salt Lake County', kick: 'Senate District 15 board', kickTitle: 'The district board for Utah Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-16': { seat: 'ut-statesenate-16', composer: true, alias: 'ut-sd-16', route: '/district/ut-sd-16', pid: 'harper_s16', h1: 'Utah Senate District 16', where: 'West Jordan / Taylorsville', kick: 'Senate District 16 board', kickTitle: 'The district board for Utah Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-17': { seat: 'ut-statesenate-17', composer: true, alias: 'ut-sd-17', route: '/district/ut-sd-17', pid: 'lincoln_fillmore', h1: 'Utah Senate District 17', where: 'South Jordan, Salt Lake County', kick: 'Senate District 17 board', kickTitle: 'The district board for Utah Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-18': { seat: 'ut-statesenate-18', composer: true, alias: 'ut-sd-18', route: '/district/ut-sd-18', pid: 'mccay_s11', h1: 'Utah Senate District 18', where: 'Riverton / Herriman', kick: 'Senate District 18 board', kickTitle: 'The district board for Utah Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-19': { seat: 'ut-statesenate-19', composer: true, alias: 'ut-sd-19', route: '/district/ut-sd-19', pid: 'kcullimore', h1: 'Utah Senate District 19', where: 'Sandy / Draper / Cottonwood Heights', kick: 'Senate District 19 board', kickTitle: 'The district board for Utah Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-20': { seat: 'ut-statesenate-20', composer: true, alias: 'ut-sd-20', route: '/district/ut-sd-20', pid: 'rwinterton', h1: 'Utah Senate District 20', where: 'Roosevelt, Duchesne County', kick: 'Senate District 20 board', kickTitle: 'The district board for Utah Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-21': { seat: 'ut-statesenate-21', composer: true, alias: 'ut-sd-21', route: '/district/ut-sd-21', pid: 'brammer_s21', h1: 'Utah Senate District 21', where: 'Highland / Pleasant Grove', kick: 'Senate District 21 board', kickTitle: 'The district board for Utah Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-22': { seat: 'ut-statesenate-22', composer: true, alias: 'ut-sd-22', route: '/district/ut-sd-22', pid: 'heidi_balderree', h1: 'Utah Senate District 22', where: 'Saratoga Springs / Bluffdale, Utah County', kick: 'Senate District 22 board', kickTitle: 'The district board for Utah Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-23': { seat: 'ut-statesenate-23', composer: true, alias: 'ut-sd-23', route: '/district/ut-sd-23', pid: 'kgrover', h1: 'Utah Senate District 23', where: 'Provo', kick: 'Senate District 23 board', kickTitle: 'The district board for Utah Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-24': { seat: 'ut-statesenate-24', composer: true, alias: 'ut-sd-24', route: '/district/ut-sd-24', pid: 'kstratton', h1: 'Utah Senate District 24', where: 'Provo / Orem', kick: 'Senate District 24 board', kickTitle: 'The district board for Utah Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-25': { seat: 'ut-statesenate-25', composer: true, alias: 'ut-sd-25', route: '/district/ut-sd-25', pid: 'mckell_s25', h1: 'Utah Senate District 25', where: 'Utah County', kick: 'Senate District 25 board', kickTitle: 'The district board for Utah Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-26': { seat: 'ut-statesenate-26', composer: true, alias: 'ut-sd-26', route: '/district/ut-sd-26', pid: 'dhinkins', h1: 'Utah Senate District 26', where: 'Orangeville, Emery County', kick: 'Senate District 26 board', kickTitle: 'The district board for Utah Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-27': { seat: 'ut-statesenate-27', composer: true, alias: 'ut-sd-27', route: '/district/ut-sd-27', pid: 'dowens_st', h1: 'Utah Senate District 27', where: 'Fountain Green, Sanpete County', kick: 'Senate District 27 board', kickTitle: 'The district board for Utah Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-28': { seat: 'ut-statesenate-28', composer: true, alias: 'ut-sd-28', route: '/district/ut-sd-28', pid: 'evickers', h1: 'Utah Senate District 28', where: 'Cedar City', kick: 'Senate District 28 board', kickTitle: 'The district board for Utah Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-statesenate-29': { seat: 'ut-statesenate-29', composer: true, alias: 'ut-sd-29', route: '/district/ut-sd-29', pid: 'dipson', h1: 'Utah Senate District 29', where: 'St. George', kick: 'Senate District 29 board', kickTitle: 'The district board for Utah Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-1': { seat: 'ut-house-1', composer: true, alias: 'ut-cd-1', route: '/district/ut-cd-1', pid: '', usHouse: { state: 'Utah', district: 1 }, h1: 'Utah’s 1st Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-1 district board', kickTitle: 'The district board for Utah’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-3': { seat: 'ut-house-3', composer: true, alias: 'ut-cd-3', route: '/district/ut-cd-3', pid: '', usHouse: { state: 'Utah', district: 3 }, h1: 'Utah’s 3rd Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-3 district board', kickTitle: 'The district board for Utah’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-house-4': { seat: 'ut-house-4', composer: true, alias: 'ut-cd-4', route: '/district/ut-cd-4', pid: '', usHouse: { state: 'Utah', district: 4 }, h1: 'Utah’s 4th Congressional District', where: 'The district as the court-ordered 2026 map draws it', kick: 'UT-4 district board', kickTitle: 'The district board for Utah’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-gov': { seat: 'ut-gov', composer: true, alias: 'ut-gov', route: '/district/ut-gov', pid: 'cox', statewide: true, h1: 'Governor · Spencer Cox', where: 'Statewide · the whole State of Utah', kick: 'Governor board', kickTitle: 'The board for Governor · Spencer Cox: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-us-senate-curtis': { seat: 'ut-us-senate-curtis', composer: true, alias: 'ut-us-senate-curtis', route: '/district/ut-us-senate-curtis', pid: 'curtis', statewide: true, h1: 'U.S. Senate · John Curtis', where: 'Statewide · the whole State of Utah', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Curtis: who is in the room and what is on the table. A place, not a scorecard.' },
    'ut-us-senate-lee': { seat: 'ut-us-senate-lee', composer: true, alias: 'ut-us-senate-lee', route: '/district/ut-us-senate-lee', pid: 'lee', statewide: true, h1: 'U.S. Senate · Mike Lee', where: 'Statewide · the whole State of Utah', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mike Lee: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-1': { seat: 'al-house-1', composer: true, alias: 'al-cd-1', route: '/district/al-cd-1', pid: '', usHouse: { state: 'Alabama', district: 1 }, h1: 'Alabama’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-1 district board', kickTitle: 'The district board for Alabama’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-2': { seat: 'al-house-2', composer: true, alias: 'al-cd-2', route: '/district/al-cd-2', pid: '', usHouse: { state: 'Alabama', district: 2 }, h1: 'Alabama’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-2 district board', kickTitle: 'The district board for Alabama’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-3': { seat: 'al-house-3', composer: true, alias: 'al-cd-3', route: '/district/al-cd-3', pid: '', usHouse: { state: 'Alabama', district: 3 }, h1: 'Alabama’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-3 district board', kickTitle: 'The district board for Alabama’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-4': { seat: 'al-house-4', composer: true, alias: 'al-cd-4', route: '/district/al-cd-4', pid: '', usHouse: { state: 'Alabama', district: 4 }, h1: 'Alabama’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-4 district board', kickTitle: 'The district board for Alabama’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-5': { seat: 'al-house-5', composer: true, alias: 'al-cd-5', route: '/district/al-cd-5', pid: '', usHouse: { state: 'Alabama', district: 5 }, h1: 'Alabama’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-5 district board', kickTitle: 'The district board for Alabama’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-6': { seat: 'al-house-6', composer: true, alias: 'al-cd-6', route: '/district/al-cd-6', pid: '', usHouse: { state: 'Alabama', district: 6 }, h1: 'Alabama’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-6 district board', kickTitle: 'The district board for Alabama’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-house-7': { seat: 'al-house-7', composer: true, alias: 'al-cd-7', route: '/district/al-cd-7', pid: '', usHouse: { state: 'Alabama', district: 7 }, h1: 'Alabama’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AL-7 district board', kickTitle: 'The district board for Alabama’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-us-senate-britt': { seat: 'al-us-senate-britt', composer: true, alias: 'al-us-senate-britt', route: '/district/al-us-senate-britt', pid: 'britt', statewide: true, h1: 'U.S. Senate · Katie Britt', where: 'Statewide · the whole State of Alabama', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Katie Britt: who is in the room and what is on the table. A place, not a scorecard.' },
    'al-us-senate-tommy_tuberville': { seat: 'al-us-senate-tommy_tuberville', composer: true, alias: 'al-us-senate-tommy_tuberville', route: '/district/al-us-senate-tommy_tuberville', pid: 'tommy_tuberville', statewide: true, h1: 'U.S. Senate · Tommy Tuberville', where: 'Statewide · the whole State of Alabama', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tommy Tuberville: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-house-1': { seat: 'ak-house-1', composer: true, alias: 'ak-cd-1', route: '/district/ak-cd-1', pid: '', usHouse: { state: 'Alaska', district: 1 }, h1: 'Alaska’s At-Large Congressional District', where: 'The whole State of Alaska, one at-large seat', kick: 'AK at-large district board', kickTitle: 'The district board for Alaska’s At-Large Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-us-senate-murkowski': { seat: 'ak-us-senate-murkowski', composer: true, alias: 'ak-us-senate-murkowski', route: '/district/ak-us-senate-murkowski', pid: 'murkowski', statewide: true, h1: 'U.S. Senate · Lisa Murkowski', where: 'Statewide · the whole State of Alaska', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Lisa Murkowski: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-us-senate-dan_sullivan': { seat: 'ak-us-senate-dan_sullivan', composer: true, alias: 'ak-us-senate-dan_sullivan', route: '/district/ak-us-senate-dan_sullivan', pid: 'dan_sullivan', statewide: true, h1: 'U.S. Senate · Dan Sullivan', where: 'Statewide · the whole State of Alaska', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Dan Sullivan: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-1': { seat: 'az-house-1', composer: true, alias: 'az-cd-1', route: '/district/az-cd-1', pid: '', usHouse: { state: 'Arizona', district: 1 }, h1: 'Arizona’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-1 district board', kickTitle: 'The district board for Arizona’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-2': { seat: 'az-house-2', composer: true, alias: 'az-cd-2', route: '/district/az-cd-2', pid: '', usHouse: { state: 'Arizona', district: 2 }, h1: 'Arizona’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-2 district board', kickTitle: 'The district board for Arizona’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-3': { seat: 'az-house-3', composer: true, alias: 'az-cd-3', route: '/district/az-cd-3', pid: '', usHouse: { state: 'Arizona', district: 3 }, h1: 'Arizona’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-3 district board', kickTitle: 'The district board for Arizona’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-4': { seat: 'az-house-4', composer: true, alias: 'az-cd-4', route: '/district/az-cd-4', pid: '', usHouse: { state: 'Arizona', district: 4 }, h1: 'Arizona’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-4 district board', kickTitle: 'The district board for Arizona’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-5': { seat: 'az-house-5', composer: true, alias: 'az-cd-5', route: '/district/az-cd-5', pid: '', usHouse: { state: 'Arizona', district: 5 }, h1: 'Arizona’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-5 district board', kickTitle: 'The district board for Arizona’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-6': { seat: 'az-house-6', composer: true, alias: 'az-cd-6', route: '/district/az-cd-6', pid: '', usHouse: { state: 'Arizona', district: 6 }, h1: 'Arizona’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-6 district board', kickTitle: 'The district board for Arizona’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-7': { seat: 'az-house-7', composer: true, alias: 'az-cd-7', route: '/district/az-cd-7', pid: '', usHouse: { state: 'Arizona', district: 7 }, h1: 'Arizona’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-7 district board', kickTitle: 'The district board for Arizona’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-8': { seat: 'az-house-8', composer: true, alias: 'az-cd-8', route: '/district/az-cd-8', pid: '', usHouse: { state: 'Arizona', district: 8 }, h1: 'Arizona’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-8 district board', kickTitle: 'The district board for Arizona’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-house-9': { seat: 'az-house-9', composer: true, alias: 'az-cd-9', route: '/district/az-cd-9', pid: '', usHouse: { state: 'Arizona', district: 9 }, h1: 'Arizona’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AZ-9 district board', kickTitle: 'The district board for Arizona’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-us-senate-mark_kelly': { seat: 'az-us-senate-mark_kelly', composer: true, alias: 'az-us-senate-mark_kelly', route: '/district/az-us-senate-mark_kelly', pid: 'mark_kelly', statewide: true, h1: 'U.S. Senate · Mark Kelly', where: 'Statewide · the whole State of Arizona', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mark Kelly: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-us-senate-gallego': { seat: 'az-us-senate-gallego', composer: true, alias: 'az-us-senate-gallego', route: '/district/az-us-senate-gallego', pid: 'gallego', statewide: true, h1: 'U.S. Senate · Ruben Gallego', where: 'Statewide · the whole State of Arizona', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ruben Gallego: who is in the room and what is on the table. A place, not a scorecard.' },
    'ar-house-1': { seat: 'ar-house-1', composer: true, alias: 'ar-cd-1', route: '/district/ar-cd-1', pid: '', usHouse: { state: 'Arkansas', district: 1 }, h1: 'Arkansas’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'AR-1 district board', kickTitle: 'The district board for Arkansas’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ar-house-3': { seat: 'ar-house-3', composer: true, alias: 'ar-cd-3', route: '/district/ar-cd-3', pid: '', usHouse: { state: 'Arkansas', district: 3 }, h1: 'Arkansas’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'AR-3 district board', kickTitle: 'The district board for Arkansas’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ar-house-4': { seat: 'ar-house-4', composer: true, alias: 'ar-cd-4', route: '/district/ar-cd-4', pid: '', usHouse: { state: 'Arkansas', district: 4 }, h1: 'Arkansas’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'AR-4 district board', kickTitle: 'The district board for Arkansas’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ar-us-senate-cotton': { seat: 'ar-us-senate-cotton', composer: true, alias: 'ar-us-senate-cotton', route: '/district/ar-us-senate-cotton', pid: 'cotton', statewide: true, h1: 'U.S. Senate · Tom Cotton', where: 'Statewide · the whole State of Arkansas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tom Cotton: who is in the room and what is on the table. A place, not a scorecard.' },
    'ar-us-senate-boozman': { seat: 'ar-us-senate-boozman', composer: true, alias: 'ar-us-senate-boozman', route: '/district/ar-us-senate-boozman', pid: 'boozman', statewide: true, h1: 'U.S. Senate · John Boozman', where: 'Statewide · the whole State of Arkansas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Boozman: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-1': { seat: 'ca-house-1', composer: true, alias: 'ca-cd-1', route: '/district/ca-cd-1', pid: '', usHouse: { state: 'California', district: 1 }, h1: 'California’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-1 district board', kickTitle: 'The district board for California’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-3': { seat: 'ca-house-3', composer: true, alias: 'ca-cd-3', route: '/district/ca-cd-3', pid: '', usHouse: { state: 'California', district: 3 }, h1: 'California’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-3 district board', kickTitle: 'The district board for California’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-4': { seat: 'ca-house-4', composer: true, alias: 'ca-cd-4', route: '/district/ca-cd-4', pid: '', usHouse: { state: 'California', district: 4 }, h1: 'California’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-4 district board', kickTitle: 'The district board for California’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-5': { seat: 'ca-house-5', composer: true, alias: 'ca-cd-5', route: '/district/ca-cd-5', pid: '', usHouse: { state: 'California', district: 5 }, h1: 'California’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-5 district board', kickTitle: 'The district board for California’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-6': { seat: 'ca-house-6', composer: true, alias: 'ca-cd-6', route: '/district/ca-cd-6', pid: '', usHouse: { state: 'California', district: 6 }, h1: 'California’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-6 district board', kickTitle: 'The district board for California’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-7': { seat: 'ca-house-7', composer: true, alias: 'ca-cd-7', route: '/district/ca-cd-7', pid: '', usHouse: { state: 'California', district: 7 }, h1: 'California’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-7 district board', kickTitle: 'The district board for California’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-8': { seat: 'ca-house-8', composer: true, alias: 'ca-cd-8', route: '/district/ca-cd-8', pid: '', usHouse: { state: 'California', district: 8 }, h1: 'California’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-8 district board', kickTitle: 'The district board for California’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-9': { seat: 'ca-house-9', composer: true, alias: 'ca-cd-9', route: '/district/ca-cd-9', pid: '', usHouse: { state: 'California', district: 9 }, h1: 'California’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-9 district board', kickTitle: 'The district board for California’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-10': { seat: 'ca-house-10', composer: true, alias: 'ca-cd-10', route: '/district/ca-cd-10', pid: '', usHouse: { state: 'California', district: 10 }, h1: 'California’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-10 district board', kickTitle: 'The district board for California’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-11': { seat: 'ca-house-11', composer: true, alias: 'ca-cd-11', route: '/district/ca-cd-11', pid: '', usHouse: { state: 'California', district: 11 }, h1: 'California’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-11 district board', kickTitle: 'The district board for California’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-12': { seat: 'ca-house-12', composer: true, alias: 'ca-cd-12', route: '/district/ca-cd-12', pid: '', usHouse: { state: 'California', district: 12 }, h1: 'California’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-12 district board', kickTitle: 'The district board for California’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-13': { seat: 'ca-house-13', composer: true, alias: 'ca-cd-13', route: '/district/ca-cd-13', pid: '', usHouse: { state: 'California', district: 13 }, h1: 'California’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-13 district board', kickTitle: 'The district board for California’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-15': { seat: 'ca-house-15', composer: true, alias: 'ca-cd-15', route: '/district/ca-cd-15', pid: '', usHouse: { state: 'California', district: 15 }, h1: 'California’s 15th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-15 district board', kickTitle: 'The district board for California’s 15th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-16': { seat: 'ca-house-16', composer: true, alias: 'ca-cd-16', route: '/district/ca-cd-16', pid: '', usHouse: { state: 'California', district: 16 }, h1: 'California’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-16 district board', kickTitle: 'The district board for California’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-19': { seat: 'ca-house-19', composer: true, alias: 'ca-cd-19', route: '/district/ca-cd-19', pid: '', usHouse: { state: 'California', district: 19 }, h1: 'California’s 19th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-19 district board', kickTitle: 'The district board for California’s 19th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-20': { seat: 'ca-house-20', composer: true, alias: 'ca-cd-20', route: '/district/ca-cd-20', pid: '', usHouse: { state: 'California', district: 20 }, h1: 'California’s 20th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-20 district board', kickTitle: 'The district board for California’s 20th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-21': { seat: 'ca-house-21', composer: true, alias: 'ca-cd-21', route: '/district/ca-cd-21', pid: '', usHouse: { state: 'California', district: 21 }, h1: 'California’s 21st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-21 district board', kickTitle: 'The district board for California’s 21st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-22': { seat: 'ca-house-22', composer: true, alias: 'ca-cd-22', route: '/district/ca-cd-22', pid: '', usHouse: { state: 'California', district: 22 }, h1: 'California’s 22nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-22 district board', kickTitle: 'The district board for California’s 22nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-23': { seat: 'ca-house-23', composer: true, alias: 'ca-cd-23', route: '/district/ca-cd-23', pid: '', usHouse: { state: 'California', district: 23 }, h1: 'California’s 23rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-23 district board', kickTitle: 'The district board for California’s 23rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-24': { seat: 'ca-house-24', composer: true, alias: 'ca-cd-24', route: '/district/ca-cd-24', pid: '', usHouse: { state: 'California', district: 24 }, h1: 'California’s 24th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-24 district board', kickTitle: 'The district board for California’s 24th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-25': { seat: 'ca-house-25', composer: true, alias: 'ca-cd-25', route: '/district/ca-cd-25', pid: '', usHouse: { state: 'California', district: 25 }, h1: 'California’s 25th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-25 district board', kickTitle: 'The district board for California’s 25th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-26': { seat: 'ca-house-26', composer: true, alias: 'ca-cd-26', route: '/district/ca-cd-26', pid: '', usHouse: { state: 'California', district: 26 }, h1: 'California’s 26th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-26 district board', kickTitle: 'The district board for California’s 26th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-27': { seat: 'ca-house-27', composer: true, alias: 'ca-cd-27', route: '/district/ca-cd-27', pid: '', usHouse: { state: 'California', district: 27 }, h1: 'California’s 27th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-27 district board', kickTitle: 'The district board for California’s 27th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-28': { seat: 'ca-house-28', composer: true, alias: 'ca-cd-28', route: '/district/ca-cd-28', pid: '', usHouse: { state: 'California', district: 28 }, h1: 'California’s 28th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-28 district board', kickTitle: 'The district board for California’s 28th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-29': { seat: 'ca-house-29', composer: true, alias: 'ca-cd-29', route: '/district/ca-cd-29', pid: '', usHouse: { state: 'California', district: 29 }, h1: 'California’s 29th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-29 district board', kickTitle: 'The district board for California’s 29th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-30': { seat: 'ca-house-30', composer: true, alias: 'ca-cd-30', route: '/district/ca-cd-30', pid: '', usHouse: { state: 'California', district: 30 }, h1: 'California’s 30th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-30 district board', kickTitle: 'The district board for California’s 30th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-31': { seat: 'ca-house-31', composer: true, alias: 'ca-cd-31', route: '/district/ca-cd-31', pid: '', usHouse: { state: 'California', district: 31 }, h1: 'California’s 31st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-31 district board', kickTitle: 'The district board for California’s 31st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-32': { seat: 'ca-house-32', composer: true, alias: 'ca-cd-32', route: '/district/ca-cd-32', pid: '', usHouse: { state: 'California', district: 32 }, h1: 'California’s 32nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-32 district board', kickTitle: 'The district board for California’s 32nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-34': { seat: 'ca-house-34', composer: true, alias: 'ca-cd-34', route: '/district/ca-cd-34', pid: '', usHouse: { state: 'California', district: 34 }, h1: 'California’s 34th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-34 district board', kickTitle: 'The district board for California’s 34th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-35': { seat: 'ca-house-35', composer: true, alias: 'ca-cd-35', route: '/district/ca-cd-35', pid: '', usHouse: { state: 'California', district: 35 }, h1: 'California’s 35th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-35 district board', kickTitle: 'The district board for California’s 35th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-37': { seat: 'ca-house-37', composer: true, alias: 'ca-cd-37', route: '/district/ca-cd-37', pid: '', usHouse: { state: 'California', district: 37 }, h1: 'California’s 37th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-37 district board', kickTitle: 'The district board for California’s 37th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-38': { seat: 'ca-house-38', composer: true, alias: 'ca-cd-38', route: '/district/ca-cd-38', pid: '', usHouse: { state: 'California', district: 38 }, h1: 'California’s 38th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-38 district board', kickTitle: 'The district board for California’s 38th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-40': { seat: 'ca-house-40', composer: true, alias: 'ca-cd-40', route: '/district/ca-cd-40', pid: '', usHouse: { state: 'California', district: 40 }, h1: 'California’s 40th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-40 district board', kickTitle: 'The district board for California’s 40th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-41': { seat: 'ca-house-41', composer: true, alias: 'ca-cd-41', route: '/district/ca-cd-41', pid: '', usHouse: { state: 'California', district: 41 }, h1: 'California’s 41st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-41 district board', kickTitle: 'The district board for California’s 41st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-44': { seat: 'ca-house-44', composer: true, alias: 'ca-cd-44', route: '/district/ca-cd-44', pid: '', usHouse: { state: 'California', district: 44 }, h1: 'California’s 44th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-44 district board', kickTitle: 'The district board for California’s 44th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-45': { seat: 'ca-house-45', composer: true, alias: 'ca-cd-45', route: '/district/ca-cd-45', pid: '', usHouse: { state: 'California', district: 45 }, h1: 'California’s 45th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-45 district board', kickTitle: 'The district board for California’s 45th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-46': { seat: 'ca-house-46', composer: true, alias: 'ca-cd-46', route: '/district/ca-cd-46', pid: '', usHouse: { state: 'California', district: 46 }, h1: 'California’s 46th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-46 district board', kickTitle: 'The district board for California’s 46th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-47': { seat: 'ca-house-47', composer: true, alias: 'ca-cd-47', route: '/district/ca-cd-47', pid: '', usHouse: { state: 'California', district: 47 }, h1: 'California’s 47th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-47 district board', kickTitle: 'The district board for California’s 47th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-48': { seat: 'ca-house-48', composer: true, alias: 'ca-cd-48', route: '/district/ca-cd-48', pid: '', usHouse: { state: 'California', district: 48 }, h1: 'California’s 48th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-48 district board', kickTitle: 'The district board for California’s 48th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-49': { seat: 'ca-house-49', composer: true, alias: 'ca-cd-49', route: '/district/ca-cd-49', pid: '', usHouse: { state: 'California', district: 49 }, h1: 'California’s 49th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-49 district board', kickTitle: 'The district board for California’s 49th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-50': { seat: 'ca-house-50', composer: true, alias: 'ca-cd-50', route: '/district/ca-cd-50', pid: '', usHouse: { state: 'California', district: 50 }, h1: 'California’s 50th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-50 district board', kickTitle: 'The district board for California’s 50th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-51': { seat: 'ca-house-51', composer: true, alias: 'ca-cd-51', route: '/district/ca-cd-51', pid: '', usHouse: { state: 'California', district: 51 }, h1: 'California’s 51st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-51 district board', kickTitle: 'The district board for California’s 51st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-house-52': { seat: 'ca-house-52', composer: true, alias: 'ca-cd-52', route: '/district/ca-cd-52', pid: '', usHouse: { state: 'California', district: 52 }, h1: 'California’s 52nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CA-52 district board', kickTitle: 'The district board for California’s 52nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-us-senate-schiff': { seat: 'ca-us-senate-schiff', composer: true, alias: 'ca-us-senate-schiff', route: '/district/ca-us-senate-schiff', pid: 'schiff', statewide: true, h1: 'U.S. Senate · Adam Schiff', where: 'Statewide · the whole State of California', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Adam Schiff: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-us-senate-padilla': { seat: 'ca-us-senate-padilla', composer: true, alias: 'ca-us-senate-padilla', route: '/district/ca-us-senate-padilla', pid: 'padilla', statewide: true, h1: 'U.S. Senate · Alex Padilla', where: 'Statewide · the whole State of California', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Alex Padilla: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-3': { seat: 'co-house-3', composer: true, alias: 'co-cd-3', route: '/district/co-cd-3', pid: '', usHouse: { state: 'Colorado', district: 3 }, h1: 'Colorado’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-3 district board', kickTitle: 'The district board for Colorado’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-5': { seat: 'co-house-5', composer: true, alias: 'co-cd-5', route: '/district/co-cd-5', pid: '', usHouse: { state: 'Colorado', district: 5 }, h1: 'Colorado’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-5 district board', kickTitle: 'The district board for Colorado’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-6': { seat: 'co-house-6', composer: true, alias: 'co-cd-6', route: '/district/co-cd-6', pid: '', usHouse: { state: 'Colorado', district: 6 }, h1: 'Colorado’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-6 district board', kickTitle: 'The district board for Colorado’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-7': { seat: 'co-house-7', composer: true, alias: 'co-cd-7', route: '/district/co-cd-7', pid: '', usHouse: { state: 'Colorado', district: 7 }, h1: 'Colorado’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-7 district board', kickTitle: 'The district board for Colorado’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-8': { seat: 'co-house-8', composer: true, alias: 'co-cd-8', route: '/district/co-cd-8', pid: '', usHouse: { state: 'Colorado', district: 8 }, h1: 'Colorado’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-8 district board', kickTitle: 'The district board for Colorado’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-us-senate-bennet': { seat: 'co-us-senate-bennet', composer: true, alias: 'co-us-senate-bennet', route: '/district/co-us-senate-bennet', pid: 'bennet', statewide: true, h1: 'U.S. Senate · Michael Bennet', where: 'Statewide · the whole State of Colorado', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Michael Bennet: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-us-senate-hickenlooper': { seat: 'co-us-senate-hickenlooper', composer: true, alias: 'co-us-senate-hickenlooper', route: '/district/co-us-senate-hickenlooper', pid: 'hickenlooper', statewide: true, h1: 'U.S. Senate · John Hickenlooper', where: 'Statewide · the whole State of Colorado', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Hickenlooper: who is in the room and what is on the table. A place, not a scorecard.' },
    'ct-house-1': { seat: 'ct-house-1', composer: true, alias: 'ct-cd-1', route: '/district/ct-cd-1', pid: '', usHouse: { state: 'Connecticut', district: 1 }, h1: 'Connecticut’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CT-1 district board', kickTitle: 'The district board for Connecticut’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ct-house-2': { seat: 'ct-house-2', composer: true, alias: 'ct-cd-2', route: '/district/ct-cd-2', pid: '', usHouse: { state: 'Connecticut', district: 2 }, h1: 'Connecticut’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CT-2 district board', kickTitle: 'The district board for Connecticut’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ct-house-5': { seat: 'ct-house-5', composer: true, alias: 'ct-cd-5', route: '/district/ct-cd-5', pid: '', usHouse: { state: 'Connecticut', district: 5 }, h1: 'Connecticut’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CT-5 district board', kickTitle: 'The district board for Connecticut’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ct-us-senate-chris_murphy': { seat: 'ct-us-senate-chris_murphy', composer: true, alias: 'ct-us-senate-chris_murphy', route: '/district/ct-us-senate-chris_murphy', pid: 'chris_murphy', statewide: true, h1: 'U.S. Senate · Chris Murphy', where: 'Statewide · the whole State of Connecticut', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Chris Murphy: who is in the room and what is on the table. A place, not a scorecard.' },
    'ct-us-senate-blumenthal': { seat: 'ct-us-senate-blumenthal', composer: true, alias: 'ct-us-senate-blumenthal', route: '/district/ct-us-senate-blumenthal', pid: 'blumenthal', statewide: true, h1: 'U.S. Senate · Richard Blumenthal', where: 'Statewide · the whole State of Connecticut', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Richard Blumenthal: who is in the room and what is on the table. A place, not a scorecard.' },
    'de-us-senate-coons': { seat: 'de-us-senate-coons', composer: true, alias: 'de-us-senate-coons', route: '/district/de-us-senate-coons', pid: 'coons', statewide: true, h1: 'U.S. Senate · Chris Coons', where: 'Statewide · the whole State of Delaware', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Chris Coons: who is in the room and what is on the table. A place, not a scorecard.' },
    'de-us-senate-blunt_rochester': { seat: 'de-us-senate-blunt_rochester', composer: true, alias: 'de-us-senate-blunt_rochester', route: '/district/de-us-senate-blunt_rochester', pid: 'blunt_rochester', statewide: true, h1: 'U.S. Senate · Lisa Blunt Rochester', where: 'Statewide · the whole State of Delaware', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Lisa Blunt Rochester: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-1': { seat: 'fl-house-1', composer: true, alias: 'fl-cd-1', route: '/district/fl-cd-1', pid: '', usHouse: { state: 'Florida', district: 1 }, h1: 'Florida’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-1 district board', kickTitle: 'The district board for Florida’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-2': { seat: 'fl-house-2', composer: true, alias: 'fl-cd-2', route: '/district/fl-cd-2', pid: '', usHouse: { state: 'Florida', district: 2 }, h1: 'Florida’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-2 district board', kickTitle: 'The district board for Florida’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-3': { seat: 'fl-house-3', composer: true, alias: 'fl-cd-3', route: '/district/fl-cd-3', pid: '', usHouse: { state: 'Florida', district: 3 }, h1: 'Florida’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-3 district board', kickTitle: 'The district board for Florida’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-4': { seat: 'fl-house-4', composer: true, alias: 'fl-cd-4', route: '/district/fl-cd-4', pid: '', usHouse: { state: 'Florida', district: 4 }, h1: 'Florida’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-4 district board', kickTitle: 'The district board for Florida’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-5': { seat: 'fl-house-5', composer: true, alias: 'fl-cd-5', route: '/district/fl-cd-5', pid: '', usHouse: { state: 'Florida', district: 5 }, h1: 'Florida’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-5 district board', kickTitle: 'The district board for Florida’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-6': { seat: 'fl-house-6', composer: true, alias: 'fl-cd-6', route: '/district/fl-cd-6', pid: '', usHouse: { state: 'Florida', district: 6 }, h1: 'Florida’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-6 district board', kickTitle: 'The district board for Florida’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-7': { seat: 'fl-house-7', composer: true, alias: 'fl-cd-7', route: '/district/fl-cd-7', pid: '', usHouse: { state: 'Florida', district: 7 }, h1: 'Florida’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-7 district board', kickTitle: 'The district board for Florida’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-8': { seat: 'fl-house-8', composer: true, alias: 'fl-cd-8', route: '/district/fl-cd-8', pid: '', usHouse: { state: 'Florida', district: 8 }, h1: 'Florida’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-8 district board', kickTitle: 'The district board for Florida’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-9': { seat: 'fl-house-9', composer: true, alias: 'fl-cd-9', route: '/district/fl-cd-9', pid: '', usHouse: { state: 'Florida', district: 9 }, h1: 'Florida’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-9 district board', kickTitle: 'The district board for Florida’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-11': { seat: 'fl-house-11', composer: true, alias: 'fl-cd-11', route: '/district/fl-cd-11', pid: '', usHouse: { state: 'Florida', district: 11 }, h1: 'Florida’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-11 district board', kickTitle: 'The district board for Florida’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-12': { seat: 'fl-house-12', composer: true, alias: 'fl-cd-12', route: '/district/fl-cd-12', pid: '', usHouse: { state: 'Florida', district: 12 }, h1: 'Florida’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-12 district board', kickTitle: 'The district board for Florida’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-14': { seat: 'fl-house-14', composer: true, alias: 'fl-cd-14', route: '/district/fl-cd-14', pid: '', usHouse: { state: 'Florida', district: 14 }, h1: 'Florida’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-14 district board', kickTitle: 'The district board for Florida’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-15': { seat: 'fl-house-15', composer: true, alias: 'fl-cd-15', route: '/district/fl-cd-15', pid: '', usHouse: { state: 'Florida', district: 15 }, h1: 'Florida’s 15th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-15 district board', kickTitle: 'The district board for Florida’s 15th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-16': { seat: 'fl-house-16', composer: true, alias: 'fl-cd-16', route: '/district/fl-cd-16', pid: '', usHouse: { state: 'Florida', district: 16 }, h1: 'Florida’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-16 district board', kickTitle: 'The district board for Florida’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-17': { seat: 'fl-house-17', composer: true, alias: 'fl-cd-17', route: '/district/fl-cd-17', pid: '', usHouse: { state: 'Florida', district: 17 }, h1: 'Florida’s 17th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-17 district board', kickTitle: 'The district board for Florida’s 17th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-18': { seat: 'fl-house-18', composer: true, alias: 'fl-cd-18', route: '/district/fl-cd-18', pid: '', usHouse: { state: 'Florida', district: 18 }, h1: 'Florida’s 18th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-18 district board', kickTitle: 'The district board for Florida’s 18th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-22': { seat: 'fl-house-22', composer: true, alias: 'fl-cd-22', route: '/district/fl-cd-22', pid: '', usHouse: { state: 'Florida', district: 22 }, h1: 'Florida’s 22nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-22 district board', kickTitle: 'The district board for Florida’s 22nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-23': { seat: 'fl-house-23', composer: true, alias: 'fl-cd-23', route: '/district/fl-cd-23', pid: '', usHouse: { state: 'Florida', district: 23 }, h1: 'Florida’s 23rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-23 district board', kickTitle: 'The district board for Florida’s 23rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-24': { seat: 'fl-house-24', composer: true, alias: 'fl-cd-24', route: '/district/fl-cd-24', pid: '', usHouse: { state: 'Florida', district: 24 }, h1: 'Florida’s 24th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-24 district board', kickTitle: 'The district board for Florida’s 24th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-25': { seat: 'fl-house-25', composer: true, alias: 'fl-cd-25', route: '/district/fl-cd-25', pid: '', usHouse: { state: 'Florida', district: 25 }, h1: 'Florida’s 25th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-25 district board', kickTitle: 'The district board for Florida’s 25th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-26': { seat: 'fl-house-26', composer: true, alias: 'fl-cd-26', route: '/district/fl-cd-26', pid: '', usHouse: { state: 'Florida', district: 26 }, h1: 'Florida’s 26th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-26 district board', kickTitle: 'The district board for Florida’s 26th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-27': { seat: 'fl-house-27', composer: true, alias: 'fl-cd-27', route: '/district/fl-cd-27', pid: '', usHouse: { state: 'Florida', district: 27 }, h1: 'Florida’s 27th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-27 district board', kickTitle: 'The district board for Florida’s 27th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-house-28': { seat: 'fl-house-28', composer: true, alias: 'fl-cd-28', route: '/district/fl-cd-28', pid: '', usHouse: { state: 'Florida', district: 28 }, h1: 'Florida’s 28th Congressional District', where: 'The district as the current congressional map draws it', kick: 'FL-28 district board', kickTitle: 'The district board for Florida’s 28th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-us-senate-ashley_moody': { seat: 'fl-us-senate-ashley_moody', composer: true, alias: 'fl-us-senate-ashley_moody', route: '/district/fl-us-senate-ashley_moody', pid: 'ashley_moody', statewide: true, h1: 'U.S. Senate · Ashley Moody', where: 'Statewide · the whole State of Florida', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ashley Moody: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-us-senate-rick_scott': { seat: 'fl-us-senate-rick_scott', composer: true, alias: 'fl-us-senate-rick_scott', route: '/district/fl-us-senate-rick_scott', pid: 'rick_scott', statewide: true, h1: 'U.S. Senate · Rick Scott', where: 'Statewide · the whole State of Florida', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Rick Scott: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-1': { seat: 'ga-house-1', composer: true, alias: 'ga-cd-1', route: '/district/ga-cd-1', pid: '', usHouse: { state: 'Georgia', district: 1 }, h1: 'Georgia’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-1 district board', kickTitle: 'The district board for Georgia’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-2': { seat: 'ga-house-2', composer: true, alias: 'ga-cd-2', route: '/district/ga-cd-2', pid: '', usHouse: { state: 'Georgia', district: 2 }, h1: 'Georgia’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-2 district board', kickTitle: 'The district board for Georgia’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-3': { seat: 'ga-house-3', composer: true, alias: 'ga-cd-3', route: '/district/ga-cd-3', pid: '', usHouse: { state: 'Georgia', district: 3 }, h1: 'Georgia’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-3 district board', kickTitle: 'The district board for Georgia’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-4': { seat: 'ga-house-4', composer: true, alias: 'ga-cd-4', route: '/district/ga-cd-4', pid: '', usHouse: { state: 'Georgia', district: 4 }, h1: 'Georgia’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-4 district board', kickTitle: 'The district board for Georgia’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-5': { seat: 'ga-house-5', composer: true, alias: 'ga-cd-5', route: '/district/ga-cd-5', pid: '', usHouse: { state: 'Georgia', district: 5 }, h1: 'Georgia’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-5 district board', kickTitle: 'The district board for Georgia’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-6': { seat: 'ga-house-6', composer: true, alias: 'ga-cd-6', route: '/district/ga-cd-6', pid: '', usHouse: { state: 'Georgia', district: 6 }, h1: 'Georgia’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-6 district board', kickTitle: 'The district board for Georgia’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-7': { seat: 'ga-house-7', composer: true, alias: 'ga-cd-7', route: '/district/ga-cd-7', pid: '', usHouse: { state: 'Georgia', district: 7 }, h1: 'Georgia’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-7 district board', kickTitle: 'The district board for Georgia’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-8': { seat: 'ga-house-8', composer: true, alias: 'ga-cd-8', route: '/district/ga-cd-8', pid: '', usHouse: { state: 'Georgia', district: 8 }, h1: 'Georgia’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-8 district board', kickTitle: 'The district board for Georgia’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-9': { seat: 'ga-house-9', composer: true, alias: 'ga-cd-9', route: '/district/ga-cd-9', pid: '', usHouse: { state: 'Georgia', district: 9 }, h1: 'Georgia’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-9 district board', kickTitle: 'The district board for Georgia’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-10': { seat: 'ga-house-10', composer: true, alias: 'ga-cd-10', route: '/district/ga-cd-10', pid: '', usHouse: { state: 'Georgia', district: 10 }, h1: 'Georgia’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-10 district board', kickTitle: 'The district board for Georgia’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-11': { seat: 'ga-house-11', composer: true, alias: 'ga-cd-11', route: '/district/ga-cd-11', pid: '', usHouse: { state: 'Georgia', district: 11 }, h1: 'Georgia’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-11 district board', kickTitle: 'The district board for Georgia’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-12': { seat: 'ga-house-12', composer: true, alias: 'ga-cd-12', route: '/district/ga-cd-12', pid: '', usHouse: { state: 'Georgia', district: 12 }, h1: 'Georgia’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-12 district board', kickTitle: 'The district board for Georgia’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-house-14': { seat: 'ga-house-14', composer: true, alias: 'ga-cd-14', route: '/district/ga-cd-14', pid: '', usHouse: { state: 'Georgia', district: 14 }, h1: 'Georgia’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'GA-14 district board', kickTitle: 'The district board for Georgia’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-us-senate-jon_ossoff': { seat: 'ga-us-senate-jon_ossoff', composer: true, alias: 'ga-us-senate-jon_ossoff', route: '/district/ga-us-senate-jon_ossoff', pid: 'jon_ossoff', statewide: true, h1: 'U.S. Senate · Jon Ossoff', where: 'Statewide · the whole State of Georgia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jon Ossoff: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-us-senate-warnock': { seat: 'ga-us-senate-warnock', composer: true, alias: 'ga-us-senate-warnock', route: '/district/ga-us-senate-warnock', pid: 'warnock', statewide: true, h1: 'U.S. Senate · Raphael Warnock', where: 'Statewide · the whole State of Georgia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Raphael Warnock: who is in the room and what is on the table. A place, not a scorecard.' },
    'hi-house-1': { seat: 'hi-house-1', composer: true, alias: 'hi-cd-1', route: '/district/hi-cd-1', pid: '', usHouse: { state: 'Hawaii', district: 1 }, h1: 'Hawaii’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'HI-1 district board', kickTitle: 'The district board for Hawaii’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'hi-house-2': { seat: 'hi-house-2', composer: true, alias: 'hi-cd-2', route: '/district/hi-cd-2', pid: '', usHouse: { state: 'Hawaii', district: 2 }, h1: 'Hawaii’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'HI-2 district board', kickTitle: 'The district board for Hawaii’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'hi-us-senate-hirono': { seat: 'hi-us-senate-hirono', composer: true, alias: 'hi-us-senate-hirono', route: '/district/hi-us-senate-hirono', pid: 'hirono', statewide: true, h1: 'U.S. Senate · Mazie Hirono', where: 'Statewide · the whole State of Hawaii', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mazie Hirono: who is in the room and what is on the table. A place, not a scorecard.' },
    'hi-us-senate-schatz': { seat: 'hi-us-senate-schatz', composer: true, alias: 'hi-us-senate-schatz', route: '/district/hi-us-senate-schatz', pid: 'schatz', statewide: true, h1: 'U.S. Senate · Brian Schatz', where: 'Statewide · the whole State of Hawaii', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Brian Schatz: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-house-1': { seat: 'id-house-1', composer: true, alias: 'id-cd-1', route: '/district/id-cd-1', pid: '', usHouse: { state: 'Idaho', district: 1 }, h1: 'Idaho’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'ID-1 district board', kickTitle: 'The district board for Idaho’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-house-2': { seat: 'id-house-2', composer: true, alias: 'id-cd-2', route: '/district/id-cd-2', pid: '', usHouse: { state: 'Idaho', district: 2 }, h1: 'Idaho’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'ID-2 district board', kickTitle: 'The district board for Idaho’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-us-senate-risch': { seat: 'id-us-senate-risch', composer: true, alias: 'id-us-senate-risch', route: '/district/id-us-senate-risch', pid: 'risch', statewide: true, h1: 'U.S. Senate · Jim Risch', where: 'Statewide · the whole State of Idaho', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jim Risch: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-us-senate-crapo': { seat: 'id-us-senate-crapo', composer: true, alias: 'id-us-senate-crapo', route: '/district/id-us-senate-crapo', pid: 'crapo', statewide: true, h1: 'U.S. Senate · Mike Crapo', where: 'Statewide · the whole State of Idaho', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mike Crapo: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-1': { seat: 'il-house-1', composer: true, alias: 'il-cd-1', route: '/district/il-cd-1', pid: '', usHouse: { state: 'Illinois', district: 1 }, h1: 'Illinois’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-1 district board', kickTitle: 'The district board for Illinois’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-2': { seat: 'il-house-2', composer: true, alias: 'il-cd-2', route: '/district/il-cd-2', pid: '', usHouse: { state: 'Illinois', district: 2 }, h1: 'Illinois’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-2 district board', kickTitle: 'The district board for Illinois’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-4': { seat: 'il-house-4', composer: true, alias: 'il-cd-4', route: '/district/il-cd-4', pid: '', usHouse: { state: 'Illinois', district: 4 }, h1: 'Illinois’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-4 district board', kickTitle: 'The district board for Illinois’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-5': { seat: 'il-house-5', composer: true, alias: 'il-cd-5', route: '/district/il-cd-5', pid: '', usHouse: { state: 'Illinois', district: 5 }, h1: 'Illinois’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-5 district board', kickTitle: 'The district board for Illinois’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-6': { seat: 'il-house-6', composer: true, alias: 'il-cd-6', route: '/district/il-cd-6', pid: '', usHouse: { state: 'Illinois', district: 6 }, h1: 'Illinois’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-6 district board', kickTitle: 'The district board for Illinois’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-7': { seat: 'il-house-7', composer: true, alias: 'il-cd-7', route: '/district/il-cd-7', pid: '', usHouse: { state: 'Illinois', district: 7 }, h1: 'Illinois’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-7 district board', kickTitle: 'The district board for Illinois’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-10': { seat: 'il-house-10', composer: true, alias: 'il-cd-10', route: '/district/il-cd-10', pid: '', usHouse: { state: 'Illinois', district: 10 }, h1: 'Illinois’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-10 district board', kickTitle: 'The district board for Illinois’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-11': { seat: 'il-house-11', composer: true, alias: 'il-cd-11', route: '/district/il-cd-11', pid: '', usHouse: { state: 'Illinois', district: 11 }, h1: 'Illinois’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-11 district board', kickTitle: 'The district board for Illinois’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-13': { seat: 'il-house-13', composer: true, alias: 'il-cd-13', route: '/district/il-cd-13', pid: '', usHouse: { state: 'Illinois', district: 13 }, h1: 'Illinois’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-13 district board', kickTitle: 'The district board for Illinois’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-14': { seat: 'il-house-14', composer: true, alias: 'il-cd-14', route: '/district/il-cd-14', pid: '', usHouse: { state: 'Illinois', district: 14 }, h1: 'Illinois’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-14 district board', kickTitle: 'The district board for Illinois’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-15': { seat: 'il-house-15', composer: true, alias: 'il-cd-15', route: '/district/il-cd-15', pid: '', usHouse: { state: 'Illinois', district: 15 }, h1: 'Illinois’s 15th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-15 district board', kickTitle: 'The district board for Illinois’s 15th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-16': { seat: 'il-house-16', composer: true, alias: 'il-cd-16', route: '/district/il-cd-16', pid: '', usHouse: { state: 'Illinois', district: 16 }, h1: 'Illinois’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-16 district board', kickTitle: 'The district board for Illinois’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-house-17': { seat: 'il-house-17', composer: true, alias: 'il-cd-17', route: '/district/il-cd-17', pid: '', usHouse: { state: 'Illinois', district: 17 }, h1: 'Illinois’s 17th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IL-17 district board', kickTitle: 'The district board for Illinois’s 17th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-us-senate-durbin': { seat: 'il-us-senate-durbin', composer: true, alias: 'il-us-senate-durbin', route: '/district/il-us-senate-durbin', pid: 'durbin', statewide: true, h1: 'U.S. Senate · Dick Durbin', where: 'Statewide · the whole State of Illinois', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Dick Durbin: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-us-senate-duckworth': { seat: 'il-us-senate-duckworth', composer: true, alias: 'il-us-senate-duckworth', route: '/district/il-us-senate-duckworth', pid: 'duckworth', statewide: true, h1: 'U.S. Senate · Tammy Duckworth', where: 'Statewide · the whole State of Illinois', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tammy Duckworth: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-1': { seat: 'in-house-1', composer: true, alias: 'in-cd-1', route: '/district/in-cd-1', pid: '', usHouse: { state: 'Indiana', district: 1 }, h1: 'Indiana’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-1 district board', kickTitle: 'The district board for Indiana’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-2': { seat: 'in-house-2', composer: true, alias: 'in-cd-2', route: '/district/in-cd-2', pid: '', usHouse: { state: 'Indiana', district: 2 }, h1: 'Indiana’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-2 district board', kickTitle: 'The district board for Indiana’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-3': { seat: 'in-house-3', composer: true, alias: 'in-cd-3', route: '/district/in-cd-3', pid: '', usHouse: { state: 'Indiana', district: 3 }, h1: 'Indiana’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-3 district board', kickTitle: 'The district board for Indiana’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-4': { seat: 'in-house-4', composer: true, alias: 'in-cd-4', route: '/district/in-cd-4', pid: '', usHouse: { state: 'Indiana', district: 4 }, h1: 'Indiana’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-4 district board', kickTitle: 'The district board for Indiana’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-5': { seat: 'in-house-5', composer: true, alias: 'in-cd-5', route: '/district/in-cd-5', pid: '', usHouse: { state: 'Indiana', district: 5 }, h1: 'Indiana’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-5 district board', kickTitle: 'The district board for Indiana’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-6': { seat: 'in-house-6', composer: true, alias: 'in-cd-6', route: '/district/in-cd-6', pid: '', usHouse: { state: 'Indiana', district: 6 }, h1: 'Indiana’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-6 district board', kickTitle: 'The district board for Indiana’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-7': { seat: 'in-house-7', composer: true, alias: 'in-cd-7', route: '/district/in-cd-7', pid: '', usHouse: { state: 'Indiana', district: 7 }, h1: 'Indiana’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-7 district board', kickTitle: 'The district board for Indiana’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-8': { seat: 'in-house-8', composer: true, alias: 'in-cd-8', route: '/district/in-cd-8', pid: '', usHouse: { state: 'Indiana', district: 8 }, h1: 'Indiana’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-8 district board', kickTitle: 'The district board for Indiana’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-house-9': { seat: 'in-house-9', composer: true, alias: 'in-cd-9', route: '/district/in-cd-9', pid: '', usHouse: { state: 'Indiana', district: 9 }, h1: 'Indiana’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IN-9 district board', kickTitle: 'The district board for Indiana’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-us-senate-banks': { seat: 'in-us-senate-banks', composer: true, alias: 'in-us-senate-banks', route: '/district/in-us-senate-banks', pid: 'banks', statewide: true, h1: 'U.S. Senate · Jim Banks', where: 'Statewide · the whole State of Indiana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jim Banks: who is in the room and what is on the table. A place, not a scorecard.' },
    'in-us-senate-todd_young': { seat: 'in-us-senate-todd_young', composer: true, alias: 'in-us-senate-todd_young', route: '/district/in-us-senate-todd_young', pid: 'todd_young', statewide: true, h1: 'U.S. Senate · Todd Young', where: 'Statewide · the whole State of Indiana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Todd Young: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-house-1': { seat: 'ia-house-1', composer: true, alias: 'ia-cd-1', route: '/district/ia-cd-1', pid: '', usHouse: { state: 'Iowa', district: 1 }, h1: 'Iowa’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'IA-1 district board', kickTitle: 'The district board for Iowa’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-house-2': { seat: 'ia-house-2', composer: true, alias: 'ia-cd-2', route: '/district/ia-cd-2', pid: '', usHouse: { state: 'Iowa', district: 2 }, h1: 'Iowa’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'IA-2 district board', kickTitle: 'The district board for Iowa’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-house-3': { seat: 'ia-house-3', composer: true, alias: 'ia-cd-3', route: '/district/ia-cd-3', pid: '', usHouse: { state: 'Iowa', district: 3 }, h1: 'Iowa’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'IA-3 district board', kickTitle: 'The district board for Iowa’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-house-4': { seat: 'ia-house-4', composer: true, alias: 'ia-cd-4', route: '/district/ia-cd-4', pid: '', usHouse: { state: 'Iowa', district: 4 }, h1: 'Iowa’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'IA-4 district board', kickTitle: 'The district board for Iowa’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-us-senate-grassley': { seat: 'ia-us-senate-grassley', composer: true, alias: 'ia-us-senate-grassley', route: '/district/ia-us-senate-grassley', pid: 'grassley', statewide: true, h1: 'U.S. Senate · Chuck Grassley', where: 'Statewide · the whole State of Iowa', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Chuck Grassley: who is in the room and what is on the table. A place, not a scorecard.' },
    'ia-us-senate-ernst': { seat: 'ia-us-senate-ernst', composer: true, alias: 'ia-us-senate-ernst', route: '/district/ia-us-senate-ernst', pid: 'ernst', statewide: true, h1: 'U.S. Senate · Joni Ernst', where: 'Statewide · the whole State of Iowa', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Joni Ernst: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-house-1': { seat: 'ks-house-1', composer: true, alias: 'ks-cd-1', route: '/district/ks-cd-1', pid: '', usHouse: { state: 'Kansas', district: 1 }, h1: 'Kansas’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'KS-1 district board', kickTitle: 'The district board for Kansas’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-house-2': { seat: 'ks-house-2', composer: true, alias: 'ks-cd-2', route: '/district/ks-cd-2', pid: '', usHouse: { state: 'Kansas', district: 2 }, h1: 'Kansas’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'KS-2 district board', kickTitle: 'The district board for Kansas’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-house-3': { seat: 'ks-house-3', composer: true, alias: 'ks-cd-3', route: '/district/ks-cd-3', pid: '', usHouse: { state: 'Kansas', district: 3 }, h1: 'Kansas’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'KS-3 district board', kickTitle: 'The district board for Kansas’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-house-4': { seat: 'ks-house-4', composer: true, alias: 'ks-cd-4', route: '/district/ks-cd-4', pid: '', usHouse: { state: 'Kansas', district: 4 }, h1: 'Kansas’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'KS-4 district board', kickTitle: 'The district board for Kansas’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-us-senate-roger_marshall': { seat: 'ks-us-senate-roger_marshall', composer: true, alias: 'ks-us-senate-roger_marshall', route: '/district/ks-us-senate-roger_marshall', pid: 'roger_marshall', statewide: true, h1: 'U.S. Senate · Roger Marshall', where: 'Statewide · the whole State of Kansas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Roger Marshall: who is in the room and what is on the table. A place, not a scorecard.' },
    'ks-us-senate-jerry_moran': { seat: 'ks-us-senate-jerry_moran', composer: true, alias: 'ks-us-senate-jerry_moran', route: '/district/ks-us-senate-jerry_moran', pid: 'jerry_moran', statewide: true, h1: 'U.S. Senate · Jerry Moran', where: 'Statewide · the whole State of Kansas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jerry Moran: who is in the room and what is on the table. A place, not a scorecard.' },
    'ky-house-3': { seat: 'ky-house-3', composer: true, alias: 'ky-cd-3', route: '/district/ky-cd-3', pid: '', usHouse: { state: 'Kentucky', district: 3 }, h1: 'Kentucky’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'KY-3 district board', kickTitle: 'The district board for Kentucky’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ky-house-5': { seat: 'ky-house-5', composer: true, alias: 'ky-cd-5', route: '/district/ky-cd-5', pid: '', usHouse: { state: 'Kentucky', district: 5 }, h1: 'Kentucky’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'KY-5 district board', kickTitle: 'The district board for Kentucky’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ky-house-6': { seat: 'ky-house-6', composer: true, alias: 'ky-cd-6', route: '/district/ky-cd-6', pid: '', usHouse: { state: 'Kentucky', district: 6 }, h1: 'Kentucky’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'KY-6 district board', kickTitle: 'The district board for Kentucky’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ky-us-senate-mcconnell': { seat: 'ky-us-senate-mcconnell', composer: true, alias: 'ky-us-senate-mcconnell', route: '/district/ky-us-senate-mcconnell', pid: 'mcconnell', statewide: true, h1: 'U.S. Senate · Mitch McConnell', where: 'Statewide · the whole State of Kentucky', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mitch McConnell: who is in the room and what is on the table. A place, not a scorecard.' },
    'ky-us-senate-rand_paul': { seat: 'ky-us-senate-rand_paul', composer: true, alias: 'ky-us-senate-rand_paul', route: '/district/ky-us-senate-rand_paul', pid: 'rand_paul', statewide: true, h1: 'U.S. Senate · Rand Paul', where: 'Statewide · the whole State of Kentucky', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Rand Paul: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-house-2': { seat: 'la-house-2', composer: true, alias: 'la-cd-2', route: '/district/la-cd-2', pid: '', usHouse: { state: 'Louisiana', district: 2 }, h1: 'Louisiana’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'LA-2 district board', kickTitle: 'The district board for Louisiana’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-house-3': { seat: 'la-house-3', composer: true, alias: 'la-cd-3', route: '/district/la-cd-3', pid: '', usHouse: { state: 'Louisiana', district: 3 }, h1: 'Louisiana’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'LA-3 district board', kickTitle: 'The district board for Louisiana’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-house-5': { seat: 'la-house-5', composer: true, alias: 'la-cd-5', route: '/district/la-cd-5', pid: '', usHouse: { state: 'Louisiana', district: 5 }, h1: 'Louisiana’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'LA-5 district board', kickTitle: 'The district board for Louisiana’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-house-6': { seat: 'la-house-6', composer: true, alias: 'la-cd-6', route: '/district/la-cd-6', pid: '', usHouse: { state: 'Louisiana', district: 6 }, h1: 'Louisiana’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'LA-6 district board', kickTitle: 'The district board for Louisiana’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-us-senate-kennedy_john': { seat: 'la-us-senate-kennedy_john', composer: true, alias: 'la-us-senate-kennedy_john', route: '/district/la-us-senate-kennedy_john', pid: 'kennedy_john', statewide: true, h1: 'U.S. Senate · John Kennedy', where: 'Statewide · the whole State of Louisiana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Kennedy: who is in the room and what is on the table. A place, not a scorecard.' },
    'la-us-senate-cassidy': { seat: 'la-us-senate-cassidy', composer: true, alias: 'la-us-senate-cassidy', route: '/district/la-us-senate-cassidy', pid: 'cassidy', statewide: true, h1: 'U.S. Senate · Bill Cassidy', where: 'Statewide · the whole State of Louisiana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Bill Cassidy: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-us-senate-collins': { seat: 'me-us-senate-collins', composer: true, alias: 'me-us-senate-collins', route: '/district/me-us-senate-collins', pid: 'collins', statewide: true, h1: 'U.S. Senate · Susan Collins', where: 'Statewide · the whole State of Maine', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Susan Collins: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-us-senate-angus_king': { seat: 'me-us-senate-angus_king', composer: true, alias: 'me-us-senate-angus_king', route: '/district/me-us-senate-angus_king', pid: 'angus_king', statewide: true, h1: 'U.S. Senate · Angus King', where: 'Statewide · the whole State of Maine', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Angus King: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-house-2': { seat: 'md-house-2', composer: true, alias: 'md-cd-2', route: '/district/md-cd-2', pid: '', usHouse: { state: 'Maryland', district: 2 }, h1: 'Maryland’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MD-2 district board', kickTitle: 'The district board for Maryland’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-house-3': { seat: 'md-house-3', composer: true, alias: 'md-cd-3', route: '/district/md-cd-3', pid: '', usHouse: { state: 'Maryland', district: 3 }, h1: 'Maryland’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MD-3 district board', kickTitle: 'The district board for Maryland’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-house-4': { seat: 'md-house-4', composer: true, alias: 'md-cd-4', route: '/district/md-cd-4', pid: '', usHouse: { state: 'Maryland', district: 4 }, h1: 'Maryland’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MD-4 district board', kickTitle: 'The district board for Maryland’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-house-6': { seat: 'md-house-6', composer: true, alias: 'md-cd-6', route: '/district/md-cd-6', pid: '', usHouse: { state: 'Maryland', district: 6 }, h1: 'Maryland’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MD-6 district board', kickTitle: 'The district board for Maryland’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-house-7': { seat: 'md-house-7', composer: true, alias: 'md-cd-7', route: '/district/md-cd-7', pid: '', usHouse: { state: 'Maryland', district: 7 }, h1: 'Maryland’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MD-7 district board', kickTitle: 'The district board for Maryland’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-us-senate-alsobrooks': { seat: 'md-us-senate-alsobrooks', composer: true, alias: 'md-us-senate-alsobrooks', route: '/district/md-us-senate-alsobrooks', pid: 'alsobrooks', statewide: true, h1: 'U.S. Senate · Angela Alsobrooks', where: 'Statewide · the whole State of Maryland', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Angela Alsobrooks: who is in the room and what is on the table. A place, not a scorecard.' },
    'md-us-senate-van_hollen': { seat: 'md-us-senate-van_hollen', composer: true, alias: 'md-us-senate-van_hollen', route: '/district/md-us-senate-van_hollen', pid: 'van_hollen', statewide: true, h1: 'U.S. Senate · Chris Van Hollen', where: 'Statewide · the whole State of Maryland', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Chris Van Hollen: who is in the room and what is on the table. A place, not a scorecard.' },
    'ma-house-3': { seat: 'ma-house-3', composer: true, alias: 'ma-cd-3', route: '/district/ma-cd-3', pid: '', usHouse: { state: 'Massachusetts', district: 3 }, h1: 'Massachusetts’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MA-3 district board', kickTitle: 'The district board for Massachusetts’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ma-house-8': { seat: 'ma-house-8', composer: true, alias: 'ma-cd-8', route: '/district/ma-cd-8', pid: '', usHouse: { state: 'Massachusetts', district: 8 }, h1: 'Massachusetts’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MA-8 district board', kickTitle: 'The district board for Massachusetts’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ma-house-9': { seat: 'ma-house-9', composer: true, alias: 'ma-cd-9', route: '/district/ma-cd-9', pid: '', usHouse: { state: 'Massachusetts', district: 9 }, h1: 'Massachusetts’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MA-9 district board', kickTitle: 'The district board for Massachusetts’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ma-us-senate-warren': { seat: 'ma-us-senate-warren', composer: true, alias: 'ma-us-senate-warren', route: '/district/ma-us-senate-warren', pid: 'warren', statewide: true, h1: 'U.S. Senate · Elizabeth Warren', where: 'Statewide · the whole State of Massachusetts', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Elizabeth Warren: who is in the room and what is on the table. A place, not a scorecard.' },
    'ma-us-senate-markey': { seat: 'ma-us-senate-markey', composer: true, alias: 'ma-us-senate-markey', route: '/district/ma-us-senate-markey', pid: 'markey', statewide: true, h1: 'U.S. Senate · Ed Markey', where: 'Statewide · the whole State of Massachusetts', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ed Markey: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-1': { seat: 'mi-house-1', composer: true, alias: 'mi-cd-1', route: '/district/mi-cd-1', pid: '', usHouse: { state: 'Michigan', district: 1 }, h1: 'Michigan’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-1 district board', kickTitle: 'The district board for Michigan’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-2': { seat: 'mi-house-2', composer: true, alias: 'mi-cd-2', route: '/district/mi-cd-2', pid: '', usHouse: { state: 'Michigan', district: 2 }, h1: 'Michigan’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-2 district board', kickTitle: 'The district board for Michigan’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-3': { seat: 'mi-house-3', composer: true, alias: 'mi-cd-3', route: '/district/mi-cd-3', pid: '', usHouse: { state: 'Michigan', district: 3 }, h1: 'Michigan’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-3 district board', kickTitle: 'The district board for Michigan’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-4': { seat: 'mi-house-4', composer: true, alias: 'mi-cd-4', route: '/district/mi-cd-4', pid: '', usHouse: { state: 'Michigan', district: 4 }, h1: 'Michigan’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-4 district board', kickTitle: 'The district board for Michigan’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-7': { seat: 'mi-house-7', composer: true, alias: 'mi-cd-7', route: '/district/mi-cd-7', pid: '', usHouse: { state: 'Michigan', district: 7 }, h1: 'Michigan’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-7 district board', kickTitle: 'The district board for Michigan’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-8': { seat: 'mi-house-8', composer: true, alias: 'mi-cd-8', route: '/district/mi-cd-8', pid: '', usHouse: { state: 'Michigan', district: 8 }, h1: 'Michigan’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-8 district board', kickTitle: 'The district board for Michigan’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-10': { seat: 'mi-house-10', composer: true, alias: 'mi-cd-10', route: '/district/mi-cd-10', pid: '', usHouse: { state: 'Michigan', district: 10 }, h1: 'Michigan’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-10 district board', kickTitle: 'The district board for Michigan’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-11': { seat: 'mi-house-11', composer: true, alias: 'mi-cd-11', route: '/district/mi-cd-11', pid: '', usHouse: { state: 'Michigan', district: 11 }, h1: 'Michigan’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-11 district board', kickTitle: 'The district board for Michigan’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-house-13': { seat: 'mi-house-13', composer: true, alias: 'mi-cd-13', route: '/district/mi-cd-13', pid: '', usHouse: { state: 'Michigan', district: 13 }, h1: 'Michigan’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MI-13 district board', kickTitle: 'The district board for Michigan’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-us-senate-slotkin': { seat: 'mi-us-senate-slotkin', composer: true, alias: 'mi-us-senate-slotkin', route: '/district/mi-us-senate-slotkin', pid: 'slotkin', statewide: true, h1: 'U.S. Senate · Elissa Slotkin', where: 'Statewide · the whole State of Michigan', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Elissa Slotkin: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-us-senate-peters': { seat: 'mi-us-senate-peters', composer: true, alias: 'mi-us-senate-peters', route: '/district/mi-us-senate-peters', pid: 'peters', statewide: true, h1: 'U.S. Senate · Gary Peters', where: 'Statewide · the whole State of Michigan', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Gary Peters: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-1': { seat: 'mn-house-1', composer: true, alias: 'mn-cd-1', route: '/district/mn-cd-1', pid: '', usHouse: { state: 'Minnesota', district: 1 }, h1: 'Minnesota’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-1 district board', kickTitle: 'The district board for Minnesota’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-3': { seat: 'mn-house-3', composer: true, alias: 'mn-cd-3', route: '/district/mn-cd-3', pid: '', usHouse: { state: 'Minnesota', district: 3 }, h1: 'Minnesota’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-3 district board', kickTitle: 'The district board for Minnesota’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-4': { seat: 'mn-house-4', composer: true, alias: 'mn-cd-4', route: '/district/mn-cd-4', pid: '', usHouse: { state: 'Minnesota', district: 4 }, h1: 'Minnesota’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-4 district board', kickTitle: 'The district board for Minnesota’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-7': { seat: 'mn-house-7', composer: true, alias: 'mn-cd-7', route: '/district/mn-cd-7', pid: '', usHouse: { state: 'Minnesota', district: 7 }, h1: 'Minnesota’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-7 district board', kickTitle: 'The district board for Minnesota’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-8': { seat: 'mn-house-8', composer: true, alias: 'mn-cd-8', route: '/district/mn-cd-8', pid: '', usHouse: { state: 'Minnesota', district: 8 }, h1: 'Minnesota’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-8 district board', kickTitle: 'The district board for Minnesota’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-us-senate-klobuchar': { seat: 'mn-us-senate-klobuchar', composer: true, alias: 'mn-us-senate-klobuchar', route: '/district/mn-us-senate-klobuchar', pid: 'klobuchar', statewide: true, h1: 'U.S. Senate · Amy Klobuchar', where: 'Statewide · the whole State of Minnesota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Amy Klobuchar: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-us-senate-tina_smith': { seat: 'mn-us-senate-tina_smith', composer: true, alias: 'mn-us-senate-tina_smith', route: '/district/mn-us-senate-tina_smith', pid: 'tina_smith', statewide: true, h1: 'U.S. Senate · Tina Smith', where: 'Statewide · the whole State of Minnesota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tina Smith: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-house-1': { seat: 'ms-house-1', composer: true, alias: 'ms-cd-1', route: '/district/ms-cd-1', pid: '', usHouse: { state: 'Mississippi', district: 1 }, h1: 'Mississippi’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'MS-1 district board', kickTitle: 'The district board for Mississippi’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-house-2': { seat: 'ms-house-2', composer: true, alias: 'ms-cd-2', route: '/district/ms-cd-2', pid: '', usHouse: { state: 'Mississippi', district: 2 }, h1: 'Mississippi’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MS-2 district board', kickTitle: 'The district board for Mississippi’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-house-3': { seat: 'ms-house-3', composer: true, alias: 'ms-cd-3', route: '/district/ms-cd-3', pid: '', usHouse: { state: 'Mississippi', district: 3 }, h1: 'Mississippi’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MS-3 district board', kickTitle: 'The district board for Mississippi’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-house-4': { seat: 'ms-house-4', composer: true, alias: 'ms-cd-4', route: '/district/ms-cd-4', pid: '', usHouse: { state: 'Mississippi', district: 4 }, h1: 'Mississippi’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MS-4 district board', kickTitle: 'The district board for Mississippi’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-us-senate-wicker': { seat: 'ms-us-senate-wicker', composer: true, alias: 'ms-us-senate-wicker', route: '/district/ms-us-senate-wicker', pid: 'wicker', statewide: true, h1: 'U.S. Senate · Roger Wicker', where: 'Statewide · the whole State of Mississippi', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Roger Wicker: who is in the room and what is on the table. A place, not a scorecard.' },
    'ms-us-senate-hyde_smith': { seat: 'ms-us-senate-hyde_smith', composer: true, alias: 'ms-us-senate-hyde_smith', route: '/district/ms-us-senate-hyde_smith', pid: 'hyde_smith', statewide: true, h1: 'U.S. Senate · Cindy Hyde-Smith', where: 'Statewide · the whole State of Mississippi', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Cindy Hyde-Smith: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-1': { seat: 'mo-house-1', composer: true, alias: 'mo-cd-1', route: '/district/mo-cd-1', pid: '', usHouse: { state: 'Missouri', district: 1 }, h1: 'Missouri’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-1 district board', kickTitle: 'The district board for Missouri’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-2': { seat: 'mo-house-2', composer: true, alias: 'mo-cd-2', route: '/district/mo-cd-2', pid: '', usHouse: { state: 'Missouri', district: 2 }, h1: 'Missouri’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-2 district board', kickTitle: 'The district board for Missouri’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-3': { seat: 'mo-house-3', composer: true, alias: 'mo-cd-3', route: '/district/mo-cd-3', pid: '', usHouse: { state: 'Missouri', district: 3 }, h1: 'Missouri’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-3 district board', kickTitle: 'The district board for Missouri’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-4': { seat: 'mo-house-4', composer: true, alias: 'mo-cd-4', route: '/district/mo-cd-4', pid: '', usHouse: { state: 'Missouri', district: 4 }, h1: 'Missouri’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-4 district board', kickTitle: 'The district board for Missouri’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-5': { seat: 'mo-house-5', composer: true, alias: 'mo-cd-5', route: '/district/mo-cd-5', pid: '', usHouse: { state: 'Missouri', district: 5 }, h1: 'Missouri’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-5 district board', kickTitle: 'The district board for Missouri’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-house-7': { seat: 'mo-house-7', composer: true, alias: 'mo-cd-7', route: '/district/mo-cd-7', pid: '', usHouse: { state: 'Missouri', district: 7 }, h1: 'Missouri’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MO-7 district board', kickTitle: 'The district board for Missouri’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-us-senate-hawley': { seat: 'mo-us-senate-hawley', composer: true, alias: 'mo-us-senate-hawley', route: '/district/mo-us-senate-hawley', pid: 'hawley', statewide: true, h1: 'U.S. Senate · Josh Hawley', where: 'Statewide · the whole State of Missouri', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Josh Hawley: who is in the room and what is on the table. A place, not a scorecard.' },
    'mo-us-senate-schmitt': { seat: 'mo-us-senate-schmitt', composer: true, alias: 'mo-us-senate-schmitt', route: '/district/mo-us-senate-schmitt', pid: 'schmitt', statewide: true, h1: 'U.S. Senate · Eric Schmitt', where: 'Statewide · the whole State of Missouri', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Eric Schmitt: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-house-1': { seat: 'mt-house-1', composer: true, alias: 'mt-cd-1', route: '/district/mt-cd-1', pid: '', usHouse: { state: 'Montana', district: 1 }, h1: 'Montana’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'MT-1 district board', kickTitle: 'The district board for Montana’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-house-2': { seat: 'mt-house-2', composer: true, alias: 'mt-cd-2', route: '/district/mt-cd-2', pid: '', usHouse: { state: 'Montana', district: 2 }, h1: 'Montana’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MT-2 district board', kickTitle: 'The district board for Montana’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-us-senate-sheehy': { seat: 'mt-us-senate-sheehy', composer: true, alias: 'mt-us-senate-sheehy', route: '/district/mt-us-senate-sheehy', pid: 'sheehy', statewide: true, h1: 'U.S. Senate · Tim Sheehy', where: 'Statewide · the whole State of Montana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tim Sheehy: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-us-senate-daines': { seat: 'mt-us-senate-daines', composer: true, alias: 'mt-us-senate-daines', route: '/district/mt-us-senate-daines', pid: 'daines', statewide: true, h1: 'U.S. Senate · Steve Daines', where: 'Statewide · the whole State of Montana', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Steve Daines: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-house-1': { seat: 'ne-house-1', composer: true, alias: 'ne-cd-1', route: '/district/ne-cd-1', pid: '', usHouse: { state: 'Nebraska', district: 1 }, h1: 'Nebraska’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NE-1 district board', kickTitle: 'The district board for Nebraska’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-house-3': { seat: 'ne-house-3', composer: true, alias: 'ne-cd-3', route: '/district/ne-cd-3', pid: '', usHouse: { state: 'Nebraska', district: 3 }, h1: 'Nebraska’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NE-3 district board', kickTitle: 'The district board for Nebraska’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-us-senate-deb_fischer': { seat: 'ne-us-senate-deb_fischer', composer: true, alias: 'ne-us-senate-deb_fischer', route: '/district/ne-us-senate-deb_fischer', pid: 'deb_fischer', statewide: true, h1: 'U.S. Senate · Deb Fischer', where: 'Statewide · the whole State of Nebraska', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Deb Fischer: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-us-senate-ricketts': { seat: 'ne-us-senate-ricketts', composer: true, alias: 'ne-us-senate-ricketts', route: '/district/ne-us-senate-ricketts', pid: 'ricketts', statewide: true, h1: 'U.S. Senate · Pete Ricketts', where: 'Statewide · the whole State of Nebraska', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Pete Ricketts: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-house-1': { seat: 'nv-house-1', composer: true, alias: 'nv-cd-1', route: '/district/nv-cd-1', pid: '', usHouse: { state: 'Nevada', district: 1 }, h1: 'Nevada’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NV-1 district board', kickTitle: 'The district board for Nevada’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-house-2': { seat: 'nv-house-2', composer: true, alias: 'nv-cd-2', route: '/district/nv-cd-2', pid: '', usHouse: { state: 'Nevada', district: 2 }, h1: 'Nevada’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NV-2 district board', kickTitle: 'The district board for Nevada’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-house-3': { seat: 'nv-house-3', composer: true, alias: 'nv-cd-3', route: '/district/nv-cd-3', pid: '', usHouse: { state: 'Nevada', district: 3 }, h1: 'Nevada’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NV-3 district board', kickTitle: 'The district board for Nevada’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-house-4': { seat: 'nv-house-4', composer: true, alias: 'nv-cd-4', route: '/district/nv-cd-4', pid: '', usHouse: { state: 'Nevada', district: 4 }, h1: 'Nevada’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NV-4 district board', kickTitle: 'The district board for Nevada’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-us-senate-rosen': { seat: 'nv-us-senate-rosen', composer: true, alias: 'nv-us-senate-rosen', route: '/district/nv-us-senate-rosen', pid: 'rosen', statewide: true, h1: 'U.S. Senate · Jacky Rosen', where: 'Statewide · the whole State of Nevada', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jacky Rosen: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-us-senate-cortez_masto': { seat: 'nv-us-senate-cortez_masto', composer: true, alias: 'nv-us-senate-cortez_masto', route: '/district/nv-us-senate-cortez_masto', pid: 'cortez_masto', statewide: true, h1: 'U.S. Senate · Catherine Cortez Masto', where: 'Statewide · the whole State of Nevada', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Catherine Cortez Masto: who is in the room and what is on the table. A place, not a scorecard.' },
    'nh-house-1': { seat: 'nh-house-1', composer: true, alias: 'nh-cd-1', route: '/district/nh-cd-1', pid: '', usHouse: { state: 'New Hampshire', district: 1 }, h1: 'New Hampshire’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NH-1 district board', kickTitle: 'The district board for New Hampshire’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nh-house-2': { seat: 'nh-house-2', composer: true, alias: 'nh-cd-2', route: '/district/nh-cd-2', pid: '', usHouse: { state: 'New Hampshire', district: 2 }, h1: 'New Hampshire’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NH-2 district board', kickTitle: 'The district board for New Hampshire’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nh-us-senate-shaheen': { seat: 'nh-us-senate-shaheen', composer: true, alias: 'nh-us-senate-shaheen', route: '/district/nh-us-senate-shaheen', pid: 'shaheen', statewide: true, h1: 'U.S. Senate · Jeanne Shaheen', where: 'Statewide · the whole State of New Hampshire', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jeanne Shaheen: who is in the room and what is on the table. A place, not a scorecard.' },
    'nh-us-senate-maggie_hassan': { seat: 'nh-us-senate-maggie_hassan', composer: true, alias: 'nh-us-senate-maggie_hassan', route: '/district/nh-us-senate-maggie_hassan', pid: 'maggie_hassan', statewide: true, h1: 'U.S. Senate · Maggie Hassan', where: 'Statewide · the whole State of New Hampshire', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Maggie Hassan: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-1': { seat: 'nj-house-1', composer: true, alias: 'nj-cd-1', route: '/district/nj-cd-1', pid: '', usHouse: { state: 'New Jersey', district: 1 }, h1: 'New Jersey’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-1 district board', kickTitle: 'The district board for New Jersey’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-2': { seat: 'nj-house-2', composer: true, alias: 'nj-cd-2', route: '/district/nj-cd-2', pid: '', usHouse: { state: 'New Jersey', district: 2 }, h1: 'New Jersey’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-2 district board', kickTitle: 'The district board for New Jersey’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-3': { seat: 'nj-house-3', composer: true, alias: 'nj-cd-3', route: '/district/nj-cd-3', pid: '', usHouse: { state: 'New Jersey', district: 3 }, h1: 'New Jersey’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-3 district board', kickTitle: 'The district board for New Jersey’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-4': { seat: 'nj-house-4', composer: true, alias: 'nj-cd-4', route: '/district/nj-cd-4', pid: '', usHouse: { state: 'New Jersey', district: 4 }, h1: 'New Jersey’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-4 district board', kickTitle: 'The district board for New Jersey’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-7': { seat: 'nj-house-7', composer: true, alias: 'nj-cd-7', route: '/district/nj-cd-7', pid: '', usHouse: { state: 'New Jersey', district: 7 }, h1: 'New Jersey’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-7 district board', kickTitle: 'The district board for New Jersey’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-8': { seat: 'nj-house-8', composer: true, alias: 'nj-cd-8', route: '/district/nj-cd-8', pid: '', usHouse: { state: 'New Jersey', district: 8 }, h1: 'New Jersey’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-8 district board', kickTitle: 'The district board for New Jersey’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-9': { seat: 'nj-house-9', composer: true, alias: 'nj-cd-9', route: '/district/nj-cd-9', pid: '', usHouse: { state: 'New Jersey', district: 9 }, h1: 'New Jersey’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-9 district board', kickTitle: 'The district board for New Jersey’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-10': { seat: 'nj-house-10', composer: true, alias: 'nj-cd-10', route: '/district/nj-cd-10', pid: '', usHouse: { state: 'New Jersey', district: 10 }, h1: 'New Jersey’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-10 district board', kickTitle: 'The district board for New Jersey’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-11': { seat: 'nj-house-11', composer: true, alias: 'nj-cd-11', route: '/district/nj-cd-11', pid: '', usHouse: { state: 'New Jersey', district: 11 }, h1: 'New Jersey’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-11 district board', kickTitle: 'The district board for New Jersey’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-house-12': { seat: 'nj-house-12', composer: true, alias: 'nj-cd-12', route: '/district/nj-cd-12', pid: '', usHouse: { state: 'New Jersey', district: 12 }, h1: 'New Jersey’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NJ-12 district board', kickTitle: 'The district board for New Jersey’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-us-senate-booker': { seat: 'nj-us-senate-booker', composer: true, alias: 'nj-us-senate-booker', route: '/district/nj-us-senate-booker', pid: 'booker', statewide: true, h1: 'U.S. Senate · Cory Booker', where: 'Statewide · the whole State of New Jersey', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Cory Booker: who is in the room and what is on the table. A place, not a scorecard.' },
    'nj-us-senate-andy_kim': { seat: 'nj-us-senate-andy_kim', composer: true, alias: 'nj-us-senate-andy_kim', route: '/district/nj-us-senate-andy_kim', pid: 'andy_kim', statewide: true, h1: 'U.S. Senate · Andy Kim', where: 'Statewide · the whole State of New Jersey', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Andy Kim: who is in the room and what is on the table. A place, not a scorecard.' },
    'nm-house-1': { seat: 'nm-house-1', composer: true, alias: 'nm-cd-1', route: '/district/nm-cd-1', pid: '', usHouse: { state: 'New Mexico', district: 1 }, h1: 'New Mexico’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NM-1 district board', kickTitle: 'The district board for New Mexico’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nm-house-2': { seat: 'nm-house-2', composer: true, alias: 'nm-cd-2', route: '/district/nm-cd-2', pid: '', usHouse: { state: 'New Mexico', district: 2 }, h1: 'New Mexico’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NM-2 district board', kickTitle: 'The district board for New Mexico’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nm-house-3': { seat: 'nm-house-3', composer: true, alias: 'nm-cd-3', route: '/district/nm-cd-3', pid: '', usHouse: { state: 'New Mexico', district: 3 }, h1: 'New Mexico’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NM-3 district board', kickTitle: 'The district board for New Mexico’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nm-us-senate-heinrich': { seat: 'nm-us-senate-heinrich', composer: true, alias: 'nm-us-senate-heinrich', route: '/district/nm-us-senate-heinrich', pid: 'heinrich', statewide: true, h1: 'U.S. Senate · Martin Heinrich', where: 'Statewide · the whole State of New Mexico', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Martin Heinrich: who is in the room and what is on the table. A place, not a scorecard.' },
    'nm-us-senate-lujan': { seat: 'nm-us-senate-lujan', composer: true, alias: 'nm-us-senate-lujan', route: '/district/nm-us-senate-lujan', pid: 'lujan', statewide: true, h1: 'U.S. Senate · Ben Ray Luján', where: 'Statewide · the whole State of New Mexico', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ben Ray Luján: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-1': { seat: 'ny-house-1', composer: true, alias: 'ny-cd-1', route: '/district/ny-cd-1', pid: '', usHouse: { state: 'New York', district: 1 }, h1: 'New York’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-1 district board', kickTitle: 'The district board for New York’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-4': { seat: 'ny-house-4', composer: true, alias: 'ny-cd-4', route: '/district/ny-cd-4', pid: '', usHouse: { state: 'New York', district: 4 }, h1: 'New York’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-4 district board', kickTitle: 'The district board for New York’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-6': { seat: 'ny-house-6', composer: true, alias: 'ny-cd-6', route: '/district/ny-cd-6', pid: '', usHouse: { state: 'New York', district: 6 }, h1: 'New York’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-6 district board', kickTitle: 'The district board for New York’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-7': { seat: 'ny-house-7', composer: true, alias: 'ny-cd-7', route: '/district/ny-cd-7', pid: '', usHouse: { state: 'New York', district: 7 }, h1: 'New York’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-7 district board', kickTitle: 'The district board for New York’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-11': { seat: 'ny-house-11', composer: true, alias: 'ny-cd-11', route: '/district/ny-cd-11', pid: '', usHouse: { state: 'New York', district: 11 }, h1: 'New York’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-11 district board', kickTitle: 'The district board for New York’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-13': { seat: 'ny-house-13', composer: true, alias: 'ny-cd-13', route: '/district/ny-cd-13', pid: '', usHouse: { state: 'New York', district: 13 }, h1: 'New York’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-13 district board', kickTitle: 'The district board for New York’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-16': { seat: 'ny-house-16', composer: true, alias: 'ny-cd-16', route: '/district/ny-cd-16', pid: '', usHouse: { state: 'New York', district: 16 }, h1: 'New York’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-16 district board', kickTitle: 'The district board for New York’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-18': { seat: 'ny-house-18', composer: true, alias: 'ny-cd-18', route: '/district/ny-cd-18', pid: '', usHouse: { state: 'New York', district: 18 }, h1: 'New York’s 18th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-18 district board', kickTitle: 'The district board for New York’s 18th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-19': { seat: 'ny-house-19', composer: true, alias: 'ny-cd-19', route: '/district/ny-cd-19', pid: '', usHouse: { state: 'New York', district: 19 }, h1: 'New York’s 19th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-19 district board', kickTitle: 'The district board for New York’s 19th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-20': { seat: 'ny-house-20', composer: true, alias: 'ny-cd-20', route: '/district/ny-cd-20', pid: '', usHouse: { state: 'New York', district: 20 }, h1: 'New York’s 20th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-20 district board', kickTitle: 'The district board for New York’s 20th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-22': { seat: 'ny-house-22', composer: true, alias: 'ny-cd-22', route: '/district/ny-cd-22', pid: '', usHouse: { state: 'New York', district: 22 }, h1: 'New York’s 22nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-22 district board', kickTitle: 'The district board for New York’s 22nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-23': { seat: 'ny-house-23', composer: true, alias: 'ny-cd-23', route: '/district/ny-cd-23', pid: '', usHouse: { state: 'New York', district: 23 }, h1: 'New York’s 23rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-23 district board', kickTitle: 'The district board for New York’s 23rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-24': { seat: 'ny-house-24', composer: true, alias: 'ny-cd-24', route: '/district/ny-cd-24', pid: '', usHouse: { state: 'New York', district: 24 }, h1: 'New York’s 24th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-24 district board', kickTitle: 'The district board for New York’s 24th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-25': { seat: 'ny-house-25', composer: true, alias: 'ny-cd-25', route: '/district/ny-cd-25', pid: '', usHouse: { state: 'New York', district: 25 }, h1: 'New York’s 25th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-25 district board', kickTitle: 'The district board for New York’s 25th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-house-26': { seat: 'ny-house-26', composer: true, alias: 'ny-cd-26', route: '/district/ny-cd-26', pid: '', usHouse: { state: 'New York', district: 26 }, h1: 'New York’s 26th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NY-26 district board', kickTitle: 'The district board for New York’s 26th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-us-senate-schumer': { seat: 'ny-us-senate-schumer', composer: true, alias: 'ny-us-senate-schumer', route: '/district/ny-us-senate-schumer', pid: 'schumer', statewide: true, h1: 'U.S. Senate · Chuck Schumer', where: 'Statewide · the whole State of New York', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Chuck Schumer: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-us-senate-gillibrand': { seat: 'ny-us-senate-gillibrand', composer: true, alias: 'ny-us-senate-gillibrand', route: '/district/ny-us-senate-gillibrand', pid: 'gillibrand', statewide: true, h1: 'U.S. Senate · Kirsten Gillibrand', where: 'Statewide · the whole State of New York', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Kirsten Gillibrand: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-1': { seat: 'nc-house-1', composer: true, alias: 'nc-cd-1', route: '/district/nc-cd-1', pid: '', usHouse: { state: 'North Carolina', district: 1 }, h1: 'North Carolina’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-1 district board', kickTitle: 'The district board for North Carolina’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-2': { seat: 'nc-house-2', composer: true, alias: 'nc-cd-2', route: '/district/nc-cd-2', pid: '', usHouse: { state: 'North Carolina', district: 2 }, h1: 'North Carolina’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-2 district board', kickTitle: 'The district board for North Carolina’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-3': { seat: 'nc-house-3', composer: true, alias: 'nc-cd-3', route: '/district/nc-cd-3', pid: '', usHouse: { state: 'North Carolina', district: 3 }, h1: 'North Carolina’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-3 district board', kickTitle: 'The district board for North Carolina’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-4': { seat: 'nc-house-4', composer: true, alias: 'nc-cd-4', route: '/district/nc-cd-4', pid: '', usHouse: { state: 'North Carolina', district: 4 }, h1: 'North Carolina’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-4 district board', kickTitle: 'The district board for North Carolina’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-6': { seat: 'nc-house-6', composer: true, alias: 'nc-cd-6', route: '/district/nc-cd-6', pid: '', usHouse: { state: 'North Carolina', district: 6 }, h1: 'North Carolina’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-6 district board', kickTitle: 'The district board for North Carolina’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-7': { seat: 'nc-house-7', composer: true, alias: 'nc-cd-7', route: '/district/nc-cd-7', pid: '', usHouse: { state: 'North Carolina', district: 7 }, h1: 'North Carolina’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-7 district board', kickTitle: 'The district board for North Carolina’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-8': { seat: 'nc-house-8', composer: true, alias: 'nc-cd-8', route: '/district/nc-cd-8', pid: '', usHouse: { state: 'North Carolina', district: 8 }, h1: 'North Carolina’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-8 district board', kickTitle: 'The district board for North Carolina’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-10': { seat: 'nc-house-10', composer: true, alias: 'nc-cd-10', route: '/district/nc-cd-10', pid: '', usHouse: { state: 'North Carolina', district: 10 }, h1: 'North Carolina’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-10 district board', kickTitle: 'The district board for North Carolina’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-11': { seat: 'nc-house-11', composer: true, alias: 'nc-cd-11', route: '/district/nc-cd-11', pid: '', usHouse: { state: 'North Carolina', district: 11 }, h1: 'North Carolina’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-11 district board', kickTitle: 'The district board for North Carolina’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-12': { seat: 'nc-house-12', composer: true, alias: 'nc-cd-12', route: '/district/nc-cd-12', pid: '', usHouse: { state: 'North Carolina', district: 12 }, h1: 'North Carolina’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-12 district board', kickTitle: 'The district board for North Carolina’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-13': { seat: 'nc-house-13', composer: true, alias: 'nc-cd-13', route: '/district/nc-cd-13', pid: '', usHouse: { state: 'North Carolina', district: 13 }, h1: 'North Carolina’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-13 district board', kickTitle: 'The district board for North Carolina’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-house-14': { seat: 'nc-house-14', composer: true, alias: 'nc-cd-14', route: '/district/nc-cd-14', pid: '', usHouse: { state: 'North Carolina', district: 14 }, h1: 'North Carolina’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'NC-14 district board', kickTitle: 'The district board for North Carolina’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-us-senate-ted_budd': { seat: 'nc-us-senate-ted_budd', composer: true, alias: 'nc-us-senate-ted_budd', route: '/district/nc-us-senate-ted_budd', pid: 'ted_budd', statewide: true, h1: 'U.S. Senate · Ted Budd', where: 'Statewide · the whole State of North Carolina', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ted Budd: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-us-senate-tillis': { seat: 'nc-us-senate-tillis', composer: true, alias: 'nc-us-senate-tillis', route: '/district/nc-us-senate-tillis', pid: 'tillis', statewide: true, h1: 'U.S. Senate · Thom Tillis', where: 'Statewide · the whole State of North Carolina', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Thom Tillis: who is in the room and what is on the table. A place, not a scorecard.' },
    'nd-house-1': { seat: 'nd-house-1', composer: true, alias: 'nd-cd-1', route: '/district/nd-cd-1', pid: '', usHouse: { state: 'North Dakota', district: 1 }, h1: 'North Dakota’s At-Large Congressional District', where: 'The whole State of North Dakota, one at-large seat', kick: 'ND at-large district board', kickTitle: 'The district board for North Dakota’s At-Large Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'nd-us-senate-kevin_cramer': { seat: 'nd-us-senate-kevin_cramer', composer: true, alias: 'nd-us-senate-kevin_cramer', route: '/district/nd-us-senate-kevin_cramer', pid: 'kevin_cramer', statewide: true, h1: 'U.S. Senate · Kevin Cramer', where: 'Statewide · the whole State of North Dakota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Kevin Cramer: who is in the room and what is on the table. A place, not a scorecard.' },
    'nd-us-senate-hoeven': { seat: 'nd-us-senate-hoeven', composer: true, alias: 'nd-us-senate-hoeven', route: '/district/nd-us-senate-hoeven', pid: 'hoeven', statewide: true, h1: 'U.S. Senate · John Hoeven', where: 'Statewide · the whole State of North Dakota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Hoeven: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-2': { seat: 'oh-house-2', composer: true, alias: 'oh-cd-2', route: '/district/oh-cd-2', pid: '', usHouse: { state: 'Ohio', district: 2 }, h1: 'Ohio’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-2 district board', kickTitle: 'The district board for Ohio’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-3': { seat: 'oh-house-3', composer: true, alias: 'oh-cd-3', route: '/district/oh-cd-3', pid: '', usHouse: { state: 'Ohio', district: 3 }, h1: 'Ohio’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-3 district board', kickTitle: 'The district board for Ohio’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-5': { seat: 'oh-house-5', composer: true, alias: 'oh-cd-5', route: '/district/oh-cd-5', pid: '', usHouse: { state: 'Ohio', district: 5 }, h1: 'Ohio’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-5 district board', kickTitle: 'The district board for Ohio’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-6': { seat: 'oh-house-6', composer: true, alias: 'oh-cd-6', route: '/district/oh-cd-6', pid: '', usHouse: { state: 'Ohio', district: 6 }, h1: 'Ohio’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-6 district board', kickTitle: 'The district board for Ohio’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-7': { seat: 'oh-house-7', composer: true, alias: 'oh-cd-7', route: '/district/oh-cd-7', pid: '', usHouse: { state: 'Ohio', district: 7 }, h1: 'Ohio’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-7 district board', kickTitle: 'The district board for Ohio’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-8': { seat: 'oh-house-8', composer: true, alias: 'oh-cd-8', route: '/district/oh-cd-8', pid: '', usHouse: { state: 'Ohio', district: 8 }, h1: 'Ohio’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-8 district board', kickTitle: 'The district board for Ohio’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-9': { seat: 'oh-house-9', composer: true, alias: 'oh-cd-9', route: '/district/oh-cd-9', pid: '', usHouse: { state: 'Ohio', district: 9 }, h1: 'Ohio’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-9 district board', kickTitle: 'The district board for Ohio’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-10': { seat: 'oh-house-10', composer: true, alias: 'oh-cd-10', route: '/district/oh-cd-10', pid: '', usHouse: { state: 'Ohio', district: 10 }, h1: 'Ohio’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-10 district board', kickTitle: 'The district board for Ohio’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-11': { seat: 'oh-house-11', composer: true, alias: 'oh-cd-11', route: '/district/oh-cd-11', pid: '', usHouse: { state: 'Ohio', district: 11 }, h1: 'Ohio’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-11 district board', kickTitle: 'The district board for Ohio’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-12': { seat: 'oh-house-12', composer: true, alias: 'oh-cd-12', route: '/district/oh-cd-12', pid: '', usHouse: { state: 'Ohio', district: 12 }, h1: 'Ohio’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-12 district board', kickTitle: 'The district board for Ohio’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-13': { seat: 'oh-house-13', composer: true, alias: 'oh-cd-13', route: '/district/oh-cd-13', pid: '', usHouse: { state: 'Ohio', district: 13 }, h1: 'Ohio’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-13 district board', kickTitle: 'The district board for Ohio’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-14': { seat: 'oh-house-14', composer: true, alias: 'oh-cd-14', route: '/district/oh-cd-14', pid: '', usHouse: { state: 'Ohio', district: 14 }, h1: 'Ohio’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-14 district board', kickTitle: 'The district board for Ohio’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-house-15': { seat: 'oh-house-15', composer: true, alias: 'oh-cd-15', route: '/district/oh-cd-15', pid: '', usHouse: { state: 'Ohio', district: 15 }, h1: 'Ohio’s 15th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OH-15 district board', kickTitle: 'The district board for Ohio’s 15th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-us-senate-moreno': { seat: 'oh-us-senate-moreno', composer: true, alias: 'oh-us-senate-moreno', route: '/district/oh-us-senate-moreno', pid: 'moreno', statewide: true, h1: 'U.S. Senate · Bernie Moreno', where: 'Statewide · the whole State of Ohio', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Bernie Moreno: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-us-senate-jon_husted': { seat: 'oh-us-senate-jon_husted', composer: true, alias: 'oh-us-senate-jon_husted', route: '/district/oh-us-senate-jon_husted', pid: 'jon_husted', statewide: true, h1: 'U.S. Senate · Jon Husted', where: 'Statewide · the whole State of Ohio', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jon Husted: who is in the room and what is on the table. A place, not a scorecard.' },
    'ok-house-2': { seat: 'ok-house-2', composer: true, alias: 'ok-cd-2', route: '/district/ok-cd-2', pid: '', usHouse: { state: 'Oklahoma', district: 2 }, h1: 'Oklahoma’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OK-2 district board', kickTitle: 'The district board for Oklahoma’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ok-house-3': { seat: 'ok-house-3', composer: true, alias: 'ok-cd-3', route: '/district/ok-cd-3', pid: '', usHouse: { state: 'Oklahoma', district: 3 }, h1: 'Oklahoma’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OK-3 district board', kickTitle: 'The district board for Oklahoma’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ok-house-5': { seat: 'ok-house-5', composer: true, alias: 'ok-cd-5', route: '/district/ok-cd-5', pid: '', usHouse: { state: 'Oklahoma', district: 5 }, h1: 'Oklahoma’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OK-5 district board', kickTitle: 'The district board for Oklahoma’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ok-us-senate-lankford': { seat: 'ok-us-senate-lankford', composer: true, alias: 'ok-us-senate-lankford', route: '/district/ok-us-senate-lankford', pid: 'lankford', statewide: true, h1: 'U.S. Senate · James Lankford', where: 'Statewide · the whole State of Oklahoma', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · James Lankford: who is in the room and what is on the table. A place, not a scorecard.' },
    'ok-us-senate-alan_armstrong': { seat: 'ok-us-senate-alan_armstrong', composer: true, alias: 'ok-us-senate-alan_armstrong', route: '/district/ok-us-senate-alan_armstrong', pid: 'alan_armstrong', statewide: true, h1: 'U.S. Senate · Alan Armstrong', where: 'Statewide · the whole State of Oklahoma', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Alan Armstrong: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-1': { seat: 'or-house-1', composer: true, alias: 'or-cd-1', route: '/district/or-cd-1', pid: '', usHouse: { state: 'Oregon', district: 1 }, h1: 'Oregon’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-1 district board', kickTitle: 'The district board for Oregon’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-2': { seat: 'or-house-2', composer: true, alias: 'or-cd-2', route: '/district/or-cd-2', pid: '', usHouse: { state: 'Oregon', district: 2 }, h1: 'Oregon’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-2 district board', kickTitle: 'The district board for Oregon’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-3': { seat: 'or-house-3', composer: true, alias: 'or-cd-3', route: '/district/or-cd-3', pid: '', usHouse: { state: 'Oregon', district: 3 }, h1: 'Oregon’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-3 district board', kickTitle: 'The district board for Oregon’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-4': { seat: 'or-house-4', composer: true, alias: 'or-cd-4', route: '/district/or-cd-4', pid: '', usHouse: { state: 'Oregon', district: 4 }, h1: 'Oregon’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-4 district board', kickTitle: 'The district board for Oregon’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-5': { seat: 'or-house-5', composer: true, alias: 'or-cd-5', route: '/district/or-cd-5', pid: '', usHouse: { state: 'Oregon', district: 5 }, h1: 'Oregon’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-5 district board', kickTitle: 'The district board for Oregon’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-house-6': { seat: 'or-house-6', composer: true, alias: 'or-cd-6', route: '/district/or-cd-6', pid: '', usHouse: { state: 'Oregon', district: 6 }, h1: 'Oregon’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'OR-6 district board', kickTitle: 'The district board for Oregon’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-us-senate-wyden': { seat: 'or-us-senate-wyden', composer: true, alias: 'or-us-senate-wyden', route: '/district/or-us-senate-wyden', pid: 'wyden', statewide: true, h1: 'U.S. Senate · Ron Wyden', where: 'Statewide · the whole State of Oregon', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ron Wyden: who is in the room and what is on the table. A place, not a scorecard.' },
    'or-us-senate-merkley': { seat: 'or-us-senate-merkley', composer: true, alias: 'or-us-senate-merkley', route: '/district/or-us-senate-merkley', pid: 'merkley', statewide: true, h1: 'U.S. Senate · Jeff Merkley', where: 'Statewide · the whole State of Oregon', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jeff Merkley: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-3': { seat: 'pa-house-3', composer: true, alias: 'pa-cd-3', route: '/district/pa-cd-3', pid: '', usHouse: { state: 'Pennsylvania', district: 3 }, h1: 'Pennsylvania’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-3 district board', kickTitle: 'The district board for Pennsylvania’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-4': { seat: 'pa-house-4', composer: true, alias: 'pa-cd-4', route: '/district/pa-cd-4', pid: '', usHouse: { state: 'Pennsylvania', district: 4 }, h1: 'Pennsylvania’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-4 district board', kickTitle: 'The district board for Pennsylvania’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-5': { seat: 'pa-house-5', composer: true, alias: 'pa-cd-5', route: '/district/pa-cd-5', pid: '', usHouse: { state: 'Pennsylvania', district: 5 }, h1: 'Pennsylvania’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-5 district board', kickTitle: 'The district board for Pennsylvania’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-6': { seat: 'pa-house-6', composer: true, alias: 'pa-cd-6', route: '/district/pa-cd-6', pid: '', usHouse: { state: 'Pennsylvania', district: 6 }, h1: 'Pennsylvania’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-6 district board', kickTitle: 'The district board for Pennsylvania’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-7': { seat: 'pa-house-7', composer: true, alias: 'pa-cd-7', route: '/district/pa-cd-7', pid: '', usHouse: { state: 'Pennsylvania', district: 7 }, h1: 'Pennsylvania’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-7 district board', kickTitle: 'The district board for Pennsylvania’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-8': { seat: 'pa-house-8', composer: true, alias: 'pa-cd-8', route: '/district/pa-cd-8', pid: '', usHouse: { state: 'Pennsylvania', district: 8 }, h1: 'Pennsylvania’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-8 district board', kickTitle: 'The district board for Pennsylvania’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-9': { seat: 'pa-house-9', composer: true, alias: 'pa-cd-9', route: '/district/pa-cd-9', pid: '', usHouse: { state: 'Pennsylvania', district: 9 }, h1: 'Pennsylvania’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-9 district board', kickTitle: 'The district board for Pennsylvania’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-10': { seat: 'pa-house-10', composer: true, alias: 'pa-cd-10', route: '/district/pa-cd-10', pid: '', usHouse: { state: 'Pennsylvania', district: 10 }, h1: 'Pennsylvania’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-10 district board', kickTitle: 'The district board for Pennsylvania’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-11': { seat: 'pa-house-11', composer: true, alias: 'pa-cd-11', route: '/district/pa-cd-11', pid: '', usHouse: { state: 'Pennsylvania', district: 11 }, h1: 'Pennsylvania’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-11 district board', kickTitle: 'The district board for Pennsylvania’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-13': { seat: 'pa-house-13', composer: true, alias: 'pa-cd-13', route: '/district/pa-cd-13', pid: '', usHouse: { state: 'Pennsylvania', district: 13 }, h1: 'Pennsylvania’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-13 district board', kickTitle: 'The district board for Pennsylvania’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-14': { seat: 'pa-house-14', composer: true, alias: 'pa-cd-14', route: '/district/pa-cd-14', pid: '', usHouse: { state: 'Pennsylvania', district: 14 }, h1: 'Pennsylvania’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-14 district board', kickTitle: 'The district board for Pennsylvania’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-16': { seat: 'pa-house-16', composer: true, alias: 'pa-cd-16', route: '/district/pa-cd-16', pid: '', usHouse: { state: 'Pennsylvania', district: 16 }, h1: 'Pennsylvania’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-16 district board', kickTitle: 'The district board for Pennsylvania’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-house-17': { seat: 'pa-house-17', composer: true, alias: 'pa-cd-17', route: '/district/pa-cd-17', pid: '', usHouse: { state: 'Pennsylvania', district: 17 }, h1: 'Pennsylvania’s 17th Congressional District', where: 'The district as the current congressional map draws it', kick: 'PA-17 district board', kickTitle: 'The district board for Pennsylvania’s 17th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-us-senate-fetterman': { seat: 'pa-us-senate-fetterman', composer: true, alias: 'pa-us-senate-fetterman', route: '/district/pa-us-senate-fetterman', pid: 'fetterman', statewide: true, h1: 'U.S. Senate · John Fetterman', where: 'Statewide · the whole State of Pennsylvania', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Fetterman: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-us-senate-mccormick': { seat: 'pa-us-senate-mccormick', composer: true, alias: 'pa-us-senate-mccormick', route: '/district/pa-us-senate-mccormick', pid: 'mccormick', statewide: true, h1: 'U.S. Senate · Dave McCormick', where: 'Statewide · the whole State of Pennsylvania', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Dave McCormick: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-house-1': { seat: 'ri-house-1', composer: true, alias: 'ri-cd-1', route: '/district/ri-cd-1', pid: '', usHouse: { state: 'Rhode Island', district: 1 }, h1: 'Rhode Island’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'RI-1 district board', kickTitle: 'The district board for Rhode Island’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-house-2': { seat: 'ri-house-2', composer: true, alias: 'ri-cd-2', route: '/district/ri-cd-2', pid: '', usHouse: { state: 'Rhode Island', district: 2 }, h1: 'Rhode Island’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'RI-2 district board', kickTitle: 'The district board for Rhode Island’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-us-senate-reed': { seat: 'ri-us-senate-reed', composer: true, alias: 'ri-us-senate-reed', route: '/district/ri-us-senate-reed', pid: 'reed', statewide: true, h1: 'U.S. Senate · Jack Reed', where: 'Statewide · the whole State of Rhode Island', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jack Reed: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-us-senate-whitehouse': { seat: 'ri-us-senate-whitehouse', composer: true, alias: 'ri-us-senate-whitehouse', route: '/district/ri-us-senate-whitehouse', pid: 'whitehouse', statewide: true, h1: 'U.S. Senate · Sheldon Whitehouse', where: 'Statewide · the whole State of Rhode Island', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Sheldon Whitehouse: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-house-2': { seat: 'sc-house-2', composer: true, alias: 'sc-cd-2', route: '/district/sc-cd-2', pid: '', usHouse: { state: 'South Carolina', district: 2 }, h1: 'South Carolina’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'SC-2 district board', kickTitle: 'The district board for South Carolina’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-house-3': { seat: 'sc-house-3', composer: true, alias: 'sc-cd-3', route: '/district/sc-cd-3', pid: '', usHouse: { state: 'South Carolina', district: 3 }, h1: 'South Carolina’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'SC-3 district board', kickTitle: 'The district board for South Carolina’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-house-4': { seat: 'sc-house-4', composer: true, alias: 'sc-cd-4', route: '/district/sc-cd-4', pid: '', usHouse: { state: 'South Carolina', district: 4 }, h1: 'South Carolina’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'SC-4 district board', kickTitle: 'The district board for South Carolina’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-house-5': { seat: 'sc-house-5', composer: true, alias: 'sc-cd-5', route: '/district/sc-cd-5', pid: '', usHouse: { state: 'South Carolina', district: 5 }, h1: 'South Carolina’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'SC-5 district board', kickTitle: 'The district board for South Carolina’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-house-7': { seat: 'sc-house-7', composer: true, alias: 'sc-cd-7', route: '/district/sc-cd-7', pid: '', usHouse: { state: 'South Carolina', district: 7 }, h1: 'South Carolina’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'SC-7 district board', kickTitle: 'The district board for South Carolina’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-us-senate-graham': { seat: 'sc-us-senate-graham', composer: true, alias: 'sc-us-senate-graham', route: '/district/sc-us-senate-graham', pid: 'graham', statewide: true, h1: 'U.S. Senate · Lindsey Graham', where: 'Statewide · the whole State of South Carolina', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Lindsey Graham: who is in the room and what is on the table. A place, not a scorecard.' },
    'sc-us-senate-tim_scott': { seat: 'sc-us-senate-tim_scott', composer: true, alias: 'sc-us-senate-tim_scott', route: '/district/sc-us-senate-tim_scott', pid: 'tim_scott', statewide: true, h1: 'U.S. Senate · Tim Scott', where: 'Statewide · the whole State of South Carolina', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tim Scott: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-house-1': { seat: 'sd-house-1', composer: true, alias: 'sd-cd-1', route: '/district/sd-cd-1', pid: '', usHouse: { state: 'South Dakota', district: 1 }, h1: 'South Dakota’s At-Large Congressional District', where: 'The whole State of South Dakota, one at-large seat', kick: 'SD at-large district board', kickTitle: 'The district board for South Dakota’s At-Large Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-us-senate-thune': { seat: 'sd-us-senate-thune', composer: true, alias: 'sd-us-senate-thune', route: '/district/sd-us-senate-thune', pid: 'thune', statewide: true, h1: 'U.S. Senate · John Thune', where: 'Statewide · the whole State of South Dakota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Thune: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-us-senate-mike_rounds': { seat: 'sd-us-senate-mike_rounds', composer: true, alias: 'sd-us-senate-mike_rounds', route: '/district/sd-us-senate-mike_rounds', pid: 'mike_rounds', statewide: true, h1: 'U.S. Senate · Mike Rounds', where: 'Statewide · the whole State of South Dakota', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mike Rounds: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-1': { seat: 'tn-house-1', composer: true, alias: 'tn-cd-1', route: '/district/tn-cd-1', pid: '', usHouse: { state: 'Tennessee', district: 1 }, h1: 'Tennessee’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-1 district board', kickTitle: 'The district board for Tennessee’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-2': { seat: 'tn-house-2', composer: true, alias: 'tn-cd-2', route: '/district/tn-cd-2', pid: '', usHouse: { state: 'Tennessee', district: 2 }, h1: 'Tennessee’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-2 district board', kickTitle: 'The district board for Tennessee’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-3': { seat: 'tn-house-3', composer: true, alias: 'tn-cd-3', route: '/district/tn-cd-3', pid: '', usHouse: { state: 'Tennessee', district: 3 }, h1: 'Tennessee’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-3 district board', kickTitle: 'The district board for Tennessee’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-4': { seat: 'tn-house-4', composer: true, alias: 'tn-cd-4', route: '/district/tn-cd-4', pid: '', usHouse: { state: 'Tennessee', district: 4 }, h1: 'Tennessee’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-4 district board', kickTitle: 'The district board for Tennessee’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-5': { seat: 'tn-house-5', composer: true, alias: 'tn-cd-5', route: '/district/tn-cd-5', pid: '', usHouse: { state: 'Tennessee', district: 5 }, h1: 'Tennessee’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-5 district board', kickTitle: 'The district board for Tennessee’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-6': { seat: 'tn-house-6', composer: true, alias: 'tn-cd-6', route: '/district/tn-cd-6', pid: '', usHouse: { state: 'Tennessee', district: 6 }, h1: 'Tennessee’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-6 district board', kickTitle: 'The district board for Tennessee’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-7': { seat: 'tn-house-7', composer: true, alias: 'tn-cd-7', route: '/district/tn-cd-7', pid: '', usHouse: { state: 'Tennessee', district: 7 }, h1: 'Tennessee’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-7 district board', kickTitle: 'The district board for Tennessee’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-8': { seat: 'tn-house-8', composer: true, alias: 'tn-cd-8', route: '/district/tn-cd-8', pid: '', usHouse: { state: 'Tennessee', district: 8 }, h1: 'Tennessee’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-8 district board', kickTitle: 'The district board for Tennessee’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-house-9': { seat: 'tn-house-9', composer: true, alias: 'tn-cd-9', route: '/district/tn-cd-9', pid: '', usHouse: { state: 'Tennessee', district: 9 }, h1: 'Tennessee’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TN-9 district board', kickTitle: 'The district board for Tennessee’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-us-senate-hagerty': { seat: 'tn-us-senate-hagerty', composer: true, alias: 'tn-us-senate-hagerty', route: '/district/tn-us-senate-hagerty', pid: 'hagerty', statewide: true, h1: 'U.S. Senate · Bill Hagerty', where: 'Statewide · the whole State of Tennessee', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Bill Hagerty: who is in the room and what is on the table. A place, not a scorecard.' },
    'tn-us-senate-blackburn': { seat: 'tn-us-senate-blackburn', composer: true, alias: 'tn-us-senate-blackburn', route: '/district/tn-us-senate-blackburn', pid: 'blackburn', statewide: true, h1: 'U.S. Senate · Marsha Blackburn', where: 'Statewide · the whole State of Tennessee', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Marsha Blackburn: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-1': { seat: 'tx-house-1', composer: true, alias: 'tx-cd-1', route: '/district/tx-cd-1', pid: '', usHouse: { state: 'Texas', district: 1 }, h1: 'Texas’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-1 district board', kickTitle: 'The district board for Texas’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-3': { seat: 'tx-house-3', composer: true, alias: 'tx-cd-3', route: '/district/tx-cd-3', pid: '', usHouse: { state: 'Texas', district: 3 }, h1: 'Texas’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-3 district board', kickTitle: 'The district board for Texas’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-4': { seat: 'tx-house-4', composer: true, alias: 'tx-cd-4', route: '/district/tx-cd-4', pid: '', usHouse: { state: 'Texas', district: 4 }, h1: 'Texas’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-4 district board', kickTitle: 'The district board for Texas’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-5': { seat: 'tx-house-5', composer: true, alias: 'tx-cd-5', route: '/district/tx-cd-5', pid: '', usHouse: { state: 'Texas', district: 5 }, h1: 'Texas’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-5 district board', kickTitle: 'The district board for Texas’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-6': { seat: 'tx-house-6', composer: true, alias: 'tx-cd-6', route: '/district/tx-cd-6', pid: '', usHouse: { state: 'Texas', district: 6 }, h1: 'Texas’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-6 district board', kickTitle: 'The district board for Texas’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-7': { seat: 'tx-house-7', composer: true, alias: 'tx-cd-7', route: '/district/tx-cd-7', pid: '', usHouse: { state: 'Texas', district: 7 }, h1: 'Texas’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-7 district board', kickTitle: 'The district board for Texas’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-8': { seat: 'tx-house-8', composer: true, alias: 'tx-cd-8', route: '/district/tx-cd-8', pid: '', usHouse: { state: 'Texas', district: 8 }, h1: 'Texas’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-8 district board', kickTitle: 'The district board for Texas’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-9': { seat: 'tx-house-9', composer: true, alias: 'tx-cd-9', route: '/district/tx-cd-9', pid: '', usHouse: { state: 'Texas', district: 9 }, h1: 'Texas’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-9 district board', kickTitle: 'The district board for Texas’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-10': { seat: 'tx-house-10', composer: true, alias: 'tx-cd-10', route: '/district/tx-cd-10', pid: '', usHouse: { state: 'Texas', district: 10 }, h1: 'Texas’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-10 district board', kickTitle: 'The district board for Texas’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-12': { seat: 'tx-house-12', composer: true, alias: 'tx-cd-12', route: '/district/tx-cd-12', pid: '', usHouse: { state: 'Texas', district: 12 }, h1: 'Texas’s 12th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-12 district board', kickTitle: 'The district board for Texas’s 12th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-13': { seat: 'tx-house-13', composer: true, alias: 'tx-cd-13', route: '/district/tx-cd-13', pid: '', usHouse: { state: 'Texas', district: 13 }, h1: 'Texas’s 13th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-13 district board', kickTitle: 'The district board for Texas’s 13th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-14': { seat: 'tx-house-14', composer: true, alias: 'tx-cd-14', route: '/district/tx-cd-14', pid: '', usHouse: { state: 'Texas', district: 14 }, h1: 'Texas’s 14th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-14 district board', kickTitle: 'The district board for Texas’s 14th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-15': { seat: 'tx-house-15', composer: true, alias: 'tx-cd-15', route: '/district/tx-cd-15', pid: '', usHouse: { state: 'Texas', district: 15 }, h1: 'Texas’s 15th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-15 district board', kickTitle: 'The district board for Texas’s 15th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-16': { seat: 'tx-house-16', composer: true, alias: 'tx-cd-16', route: '/district/tx-cd-16', pid: '', usHouse: { state: 'Texas', district: 16 }, h1: 'Texas’s 16th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-16 district board', kickTitle: 'The district board for Texas’s 16th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-17': { seat: 'tx-house-17', composer: true, alias: 'tx-cd-17', route: '/district/tx-cd-17', pid: '', usHouse: { state: 'Texas', district: 17 }, h1: 'Texas’s 17th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-17 district board', kickTitle: 'The district board for Texas’s 17th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-18': { seat: 'tx-house-18', composer: true, alias: 'tx-cd-18', route: '/district/tx-cd-18', pid: '', usHouse: { state: 'Texas', district: 18 }, h1: 'Texas’s 18th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-18 district board', kickTitle: 'The district board for Texas’s 18th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-20': { seat: 'tx-house-20', composer: true, alias: 'tx-cd-20', route: '/district/tx-cd-20', pid: '', usHouse: { state: 'Texas', district: 20 }, h1: 'Texas’s 20th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-20 district board', kickTitle: 'The district board for Texas’s 20th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-22': { seat: 'tx-house-22', composer: true, alias: 'tx-cd-22', route: '/district/tx-cd-22', pid: '', usHouse: { state: 'Texas', district: 22 }, h1: 'Texas’s 22nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-22 district board', kickTitle: 'The district board for Texas’s 22nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-24': { seat: 'tx-house-24', composer: true, alias: 'tx-cd-24', route: '/district/tx-cd-24', pid: '', usHouse: { state: 'Texas', district: 24 }, h1: 'Texas’s 24th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-24 district board', kickTitle: 'The district board for Texas’s 24th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-26': { seat: 'tx-house-26', composer: true, alias: 'tx-cd-26', route: '/district/tx-cd-26', pid: '', usHouse: { state: 'Texas', district: 26 }, h1: 'Texas’s 26th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-26 district board', kickTitle: 'The district board for Texas’s 26th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-27': { seat: 'tx-house-27', composer: true, alias: 'tx-cd-27', route: '/district/tx-cd-27', pid: '', usHouse: { state: 'Texas', district: 27 }, h1: 'Texas’s 27th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-27 district board', kickTitle: 'The district board for Texas’s 27th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-28': { seat: 'tx-house-28', composer: true, alias: 'tx-cd-28', route: '/district/tx-cd-28', pid: '', usHouse: { state: 'Texas', district: 28 }, h1: 'Texas’s 28th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-28 district board', kickTitle: 'The district board for Texas’s 28th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-29': { seat: 'tx-house-29', composer: true, alias: 'tx-cd-29', route: '/district/tx-cd-29', pid: '', usHouse: { state: 'Texas', district: 29 }, h1: 'Texas’s 29th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-29 district board', kickTitle: 'The district board for Texas’s 29th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-31': { seat: 'tx-house-31', composer: true, alias: 'tx-cd-31', route: '/district/tx-cd-31', pid: '', usHouse: { state: 'Texas', district: 31 }, h1: 'Texas’s 31st Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-31 district board', kickTitle: 'The district board for Texas’s 31st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-32': { seat: 'tx-house-32', composer: true, alias: 'tx-cd-32', route: '/district/tx-cd-32', pid: '', usHouse: { state: 'Texas', district: 32 }, h1: 'Texas’s 32nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-32 district board', kickTitle: 'The district board for Texas’s 32nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-33': { seat: 'tx-house-33', composer: true, alias: 'tx-cd-33', route: '/district/tx-cd-33', pid: '', usHouse: { state: 'Texas', district: 33 }, h1: 'Texas’s 33rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-33 district board', kickTitle: 'The district board for Texas’s 33rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-34': { seat: 'tx-house-34', composer: true, alias: 'tx-cd-34', route: '/district/tx-cd-34', pid: '', usHouse: { state: 'Texas', district: 34 }, h1: 'Texas’s 34th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-34 district board', kickTitle: 'The district board for Texas’s 34th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-37': { seat: 'tx-house-37', composer: true, alias: 'tx-cd-37', route: '/district/tx-cd-37', pid: '', usHouse: { state: 'Texas', district: 37 }, h1: 'Texas’s 37th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-37 district board', kickTitle: 'The district board for Texas’s 37th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-house-38': { seat: 'tx-house-38', composer: true, alias: 'tx-cd-38', route: '/district/tx-cd-38', pid: '', usHouse: { state: 'Texas', district: 38 }, h1: 'Texas’s 38th Congressional District', where: 'The district as the current congressional map draws it', kick: 'TX-38 district board', kickTitle: 'The district board for Texas’s 38th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-us-senate-cruz': { seat: 'tx-us-senate-cruz', composer: true, alias: 'tx-us-senate-cruz', route: '/district/tx-us-senate-cruz', pid: 'cruz', statewide: true, h1: 'U.S. Senate · Ted Cruz', where: 'Statewide · the whole State of Texas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ted Cruz: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-us-senate-john_cornyn': { seat: 'tx-us-senate-john_cornyn', composer: true, alias: 'tx-us-senate-john_cornyn', route: '/district/tx-us-senate-john_cornyn', pid: 'john_cornyn', statewide: true, h1: 'U.S. Senate · John Cornyn', where: 'Statewide · the whole State of Texas', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Cornyn: who is in the room and what is on the table. A place, not a scorecard.' },
    'vt-house-1': { seat: 'vt-house-1', composer: true, alias: 'vt-cd-1', route: '/district/vt-cd-1', pid: '', usHouse: { state: 'Vermont', district: 1 }, h1: 'Vermont’s At-Large Congressional District', where: 'The whole State of Vermont, one at-large seat', kick: 'VT at-large district board', kickTitle: 'The district board for Vermont’s At-Large Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'vt-us-senate-welch': { seat: 'vt-us-senate-welch', composer: true, alias: 'vt-us-senate-welch', route: '/district/vt-us-senate-welch', pid: 'welch', statewide: true, h1: 'U.S. Senate · Peter Welch', where: 'Statewide · the whole State of Vermont', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Peter Welch: who is in the room and what is on the table. A place, not a scorecard.' },
    'vt-us-senate-sanders': { seat: 'vt-us-senate-sanders', composer: true, alias: 'vt-us-senate-sanders', route: '/district/vt-us-senate-sanders', pid: 'sanders', statewide: true, h1: 'U.S. Senate · Bernie Sanders', where: 'Statewide · the whole State of Vermont', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Bernie Sanders: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-1': { seat: 'va-house-1', composer: true, alias: 'va-cd-1', route: '/district/va-cd-1', pid: '', usHouse: { state: 'Virginia', district: 1 }, h1: 'Virginia’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-1 district board', kickTitle: 'The district board for Virginia’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-2': { seat: 'va-house-2', composer: true, alias: 'va-cd-2', route: '/district/va-cd-2', pid: '', usHouse: { state: 'Virginia', district: 2 }, h1: 'Virginia’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-2 district board', kickTitle: 'The district board for Virginia’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-4': { seat: 'va-house-4', composer: true, alias: 'va-cd-4', route: '/district/va-cd-4', pid: '', usHouse: { state: 'Virginia', district: 4 }, h1: 'Virginia’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-4 district board', kickTitle: 'The district board for Virginia’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-5': { seat: 'va-house-5', composer: true, alias: 'va-cd-5', route: '/district/va-cd-5', pid: '', usHouse: { state: 'Virginia', district: 5 }, h1: 'Virginia’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-5 district board', kickTitle: 'The district board for Virginia’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-6': { seat: 'va-house-6', composer: true, alias: 'va-cd-6', route: '/district/va-cd-6', pid: '', usHouse: { state: 'Virginia', district: 6 }, h1: 'Virginia’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-6 district board', kickTitle: 'The district board for Virginia’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-7': { seat: 'va-house-7', composer: true, alias: 'va-cd-7', route: '/district/va-cd-7', pid: '', usHouse: { state: 'Virginia', district: 7 }, h1: 'Virginia’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-7 district board', kickTitle: 'The district board for Virginia’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-8': { seat: 'va-house-8', composer: true, alias: 'va-cd-8', route: '/district/va-cd-8', pid: '', usHouse: { state: 'Virginia', district: 8 }, h1: 'Virginia’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-8 district board', kickTitle: 'The district board for Virginia’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-9': { seat: 'va-house-9', composer: true, alias: 'va-cd-9', route: '/district/va-cd-9', pid: '', usHouse: { state: 'Virginia', district: 9 }, h1: 'Virginia’s 9th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-9 district board', kickTitle: 'The district board for Virginia’s 9th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-10': { seat: 'va-house-10', composer: true, alias: 'va-cd-10', route: '/district/va-cd-10', pid: '', usHouse: { state: 'Virginia', district: 10 }, h1: 'Virginia’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-10 district board', kickTitle: 'The district board for Virginia’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-house-11': { seat: 'va-house-11', composer: true, alias: 'va-cd-11', route: '/district/va-cd-11', pid: '', usHouse: { state: 'Virginia', district: 11 }, h1: 'Virginia’s 11th Congressional District', where: 'The district as the current congressional map draws it', kick: 'VA-11 district board', kickTitle: 'The district board for Virginia’s 11th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-us-senate-kaine': { seat: 'va-us-senate-kaine', composer: true, alias: 'va-us-senate-kaine', route: '/district/va-us-senate-kaine', pid: 'kaine', statewide: true, h1: 'U.S. Senate · Tim Kaine', where: 'Statewide · the whole State of Virginia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tim Kaine: who is in the room and what is on the table. A place, not a scorecard.' },
    'va-us-senate-warner': { seat: 'va-us-senate-warner', composer: true, alias: 'va-us-senate-warner', route: '/district/va-us-senate-warner', pid: 'warner', statewide: true, h1: 'U.S. Senate · Mark Warner', where: 'Statewide · the whole State of Virginia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Mark Warner: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-house-4': { seat: 'wa-house-4', composer: true, alias: 'wa-cd-4', route: '/district/wa-cd-4', pid: '', usHouse: { state: 'Washington', district: 4 }, h1: 'Washington’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WA-4 district board', kickTitle: 'The district board for Washington’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-house-5': { seat: 'wa-house-5', composer: true, alias: 'wa-cd-5', route: '/district/wa-cd-5', pid: '', usHouse: { state: 'Washington', district: 5 }, h1: 'Washington’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WA-5 district board', kickTitle: 'The district board for Washington’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-house-6': { seat: 'wa-house-6', composer: true, alias: 'wa-cd-6', route: '/district/wa-cd-6', pid: '', usHouse: { state: 'Washington', district: 6 }, h1: 'Washington’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WA-6 district board', kickTitle: 'The district board for Washington’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-house-8': { seat: 'wa-house-8', composer: true, alias: 'wa-cd-8', route: '/district/wa-cd-8', pid: '', usHouse: { state: 'Washington', district: 8 }, h1: 'Washington’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WA-8 district board', kickTitle: 'The district board for Washington’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-house-10': { seat: 'wa-house-10', composer: true, alias: 'wa-cd-10', route: '/district/wa-cd-10', pid: '', usHouse: { state: 'Washington', district: 10 }, h1: 'Washington’s 10th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WA-10 district board', kickTitle: 'The district board for Washington’s 10th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-us-senate-murray': { seat: 'wa-us-senate-murray', composer: true, alias: 'wa-us-senate-murray', route: '/district/wa-us-senate-murray', pid: 'murray', statewide: true, h1: 'U.S. Senate · Patty Murray', where: 'Statewide · the whole State of Washington', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Patty Murray: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-us-senate-cantwell': { seat: 'wa-us-senate-cantwell', composer: true, alias: 'wa-us-senate-cantwell', route: '/district/wa-us-senate-cantwell', pid: 'cantwell', statewide: true, h1: 'U.S. Senate · Maria Cantwell', where: 'Statewide · the whole State of Washington', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Maria Cantwell: who is in the room and what is on the table. A place, not a scorecard.' },
    'wv-house-1': { seat: 'wv-house-1', composer: true, alias: 'wv-cd-1', route: '/district/wv-cd-1', pid: '', usHouse: { state: 'West Virginia', district: 1 }, h1: 'West Virginia’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'WV-1 district board', kickTitle: 'The district board for West Virginia’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wv-house-2': { seat: 'wv-house-2', composer: true, alias: 'wv-cd-2', route: '/district/wv-cd-2', pid: '', usHouse: { state: 'West Virginia', district: 2 }, h1: 'West Virginia’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'WV-2 district board', kickTitle: 'The district board for West Virginia’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wv-us-senate-capito': { seat: 'wv-us-senate-capito', composer: true, alias: 'wv-us-senate-capito', route: '/district/wv-us-senate-capito', pid: 'capito', statewide: true, h1: 'U.S. Senate · Shelley Moore Capito', where: 'Statewide · the whole State of West Virginia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Shelley Moore Capito: who is in the room and what is on the table. A place, not a scorecard.' },
    'wv-us-senate-jim_justice': { seat: 'wv-us-senate-jim_justice', composer: true, alias: 'wv-us-senate-jim_justice', route: '/district/wv-us-senate-jim_justice', pid: 'jim_justice', statewide: true, h1: 'U.S. Senate · Jim Justice', where: 'Statewide · the whole State of West Virginia', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Jim Justice: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-2': { seat: 'wi-house-2', composer: true, alias: 'wi-cd-2', route: '/district/wi-cd-2', pid: '', usHouse: { state: 'Wisconsin', district: 2 }, h1: 'Wisconsin’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-2 district board', kickTitle: 'The district board for Wisconsin’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-3': { seat: 'wi-house-3', composer: true, alias: 'wi-cd-3', route: '/district/wi-cd-3', pid: '', usHouse: { state: 'Wisconsin', district: 3 }, h1: 'Wisconsin’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-3 district board', kickTitle: 'The district board for Wisconsin’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-4': { seat: 'wi-house-4', composer: true, alias: 'wi-cd-4', route: '/district/wi-cd-4', pid: '', usHouse: { state: 'Wisconsin', district: 4 }, h1: 'Wisconsin’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-4 district board', kickTitle: 'The district board for Wisconsin’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-5': { seat: 'wi-house-5', composer: true, alias: 'wi-cd-5', route: '/district/wi-cd-5', pid: '', usHouse: { state: 'Wisconsin', district: 5 }, h1: 'Wisconsin’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-5 district board', kickTitle: 'The district board for Wisconsin’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-6': { seat: 'wi-house-6', composer: true, alias: 'wi-cd-6', route: '/district/wi-cd-6', pid: '', usHouse: { state: 'Wisconsin', district: 6 }, h1: 'Wisconsin’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-6 district board', kickTitle: 'The district board for Wisconsin’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-7': { seat: 'wi-house-7', composer: true, alias: 'wi-cd-7', route: '/district/wi-cd-7', pid: '', usHouse: { state: 'Wisconsin', district: 7 }, h1: 'Wisconsin’s 7th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-7 district board', kickTitle: 'The district board for Wisconsin’s 7th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-house-8': { seat: 'wi-house-8', composer: true, alias: 'wi-cd-8', route: '/district/wi-cd-8', pid: '', usHouse: { state: 'Wisconsin', district: 8 }, h1: 'Wisconsin’s 8th Congressional District', where: 'The district as the current congressional map draws it', kick: 'WI-8 district board', kickTitle: 'The district board for Wisconsin’s 8th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-us-senate-ron_johnson': { seat: 'wi-us-senate-ron_johnson', composer: true, alias: 'wi-us-senate-ron_johnson', route: '/district/wi-us-senate-ron_johnson', pid: 'ron_johnson', statewide: true, h1: 'U.S. Senate · Ron Johnson', where: 'Statewide · the whole State of Wisconsin', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Ron Johnson: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-us-senate-tammy_baldwin': { seat: 'wi-us-senate-tammy_baldwin', composer: true, alias: 'wi-us-senate-tammy_baldwin', route: '/district/wi-us-senate-tammy_baldwin', pid: 'tammy_baldwin', statewide: true, h1: 'U.S. Senate · Tammy Baldwin', where: 'Statewide · the whole State of Wisconsin', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Tammy Baldwin: who is in the room and what is on the table. A place, not a scorecard.' },
    'wy-house-1': { seat: 'wy-house-1', composer: true, alias: 'wy-cd-1', route: '/district/wy-cd-1', pid: '', usHouse: { state: 'Wyoming', district: 1 }, h1: 'Wyoming’s At-Large Congressional District', where: 'The whole State of Wyoming, one at-large seat', kick: 'WY at-large district board', kickTitle: 'The district board for Wyoming’s At-Large Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'wy-us-senate-barrasso': { seat: 'wy-us-senate-barrasso', composer: true, alias: 'wy-us-senate-barrasso', route: '/district/wy-us-senate-barrasso', pid: 'barrasso', statewide: true, h1: 'U.S. Senate · John Barrasso', where: 'Statewide · the whole State of Wyoming', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · John Barrasso: who is in the room and what is on the table. A place, not a scorecard.' },
    'wy-us-senate-lummis': { seat: 'wy-us-senate-lummis', composer: true, alias: 'wy-us-senate-lummis', route: '/district/wy-us-senate-lummis', pid: 'lummis', statewide: true, h1: 'U.S. Senate · Cynthia Lummis', where: 'Statewide · the whole State of Wyoming', kick: 'U.S. Senate board', kickTitle: 'The board for U.S. Senate · Cynthia Lummis: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statesenate-37': { seat: 'ga-statesenate-37', composer: false, alias: 'ga-sd-37', route: '/district/ga-sd-37', pid: 'setzler_ga', h1: 'Georgia Senate District 37', where: 'District 37 as Georgia’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Georgia Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statesenate-48': { seat: 'ga-statesenate-48', composer: false, alias: 'ga-sd-48', route: '/district/ga-sd-48', pid: 'still_ga', h1: 'Georgia Senate District 48', where: 'District 48 as Georgia’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Georgia Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-151': { seat: 'ga-statehouse-151', composer: false, alias: 'ga-hd-151', route: '/district/ga-hd-151', pid: 'cheokas_ga', h1: 'Georgia House District 151', where: 'District 151 as Georgia’s current legislative plan draws it', kick: 'House District 151 board', kickTitle: 'The district board for Georgia House District 151: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-105': { seat: 'ga-statehouse-105', composer: false, alias: 'ga-hd-105', route: '/district/ga-hd-105', pid: 'donatucci_ga', h1: 'Georgia House District 105', where: 'District 105 as Georgia’s current legislative plan draws it', kick: 'House District 105 board', kickTitle: 'The district board for Georgia House District 105: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-154': { seat: 'ga-statehouse-154', composer: false, alias: 'ga-hd-154', route: '/district/ga-hd-154', pid: 'greene_ga', h1: 'Georgia House District 154', where: 'District 154 as Georgia’s current legislative plan draws it', kick: 'House District 154 board', kickTitle: 'The district board for Georgia House District 154: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-48': { seat: 'ga-statehouse-48', composer: false, alias: 'ga-hd-48', route: '/district/ga-hd-48', pid: 'hilton_ga', h1: 'Georgia House District 48', where: 'District 48 as Georgia’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Georgia House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-44': { seat: 'ga-statehouse-44', composer: false, alias: 'ga-hd-44', route: '/district/ga-hd-44', pid: 'parsons_ga', h1: 'Georgia House District 44', where: 'District 44 as Georgia’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Georgia House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-99': { seat: 'ga-statehouse-99', composer: false, alias: 'ga-hd-99', route: '/district/ga-hd-99', pid: 'reeves_ga', h1: 'Georgia House District 99', where: 'District 99 as Georgia’s current legislative plan draws it', kick: 'House District 99 board', kickTitle: 'The district board for Georgia House District 99: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-53': { seat: 'ga-statehouse-53', composer: false, alias: 'ga-hd-53', route: '/district/ga-hd-53', pid: 'silcox_ga', h1: 'Georgia House District 53', where: 'District 53 as Georgia’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Georgia House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statesenate-35': { seat: 'mi-statesenate-35', composer: false, alias: 'mi-sd-35', route: '/district/mi-sd-35', pid: 'chedrick_greene_mi', h1: 'Michigan Senate District 35', where: 'District 35 as Michigan’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Michigan Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statesenate-9': { seat: 'mi-statesenate-9', composer: false, alias: 'mi-sd-9', route: '/district/mi-sd-9', pid: 'webber_mi', h1: 'Michigan Senate District 9', where: 'District 9 as Michigan’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Michigan Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-109': { seat: 'mi-statehouse-109', composer: false, alias: 'mi-hd-109', route: '/district/mi-hd-109', pid: 'bohnak_mi', h1: 'Michigan House District 109', where: 'District 109 as Michigan’s current legislative plan draws it', kick: 'House District 109 board', kickTitle: 'The district board for Michigan House District 109: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-86': { seat: 'mi-statehouse-86', composer: false, alias: 'mi-hd-86', route: '/district/mi-hd-86', pid: 'deboer_mi', h1: 'Michigan House District 86', where: 'District 86 as Michigan’s current legislative plan draws it', kick: 'House District 86 board', kickTitle: 'The district board for Michigan House District 86: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-44': { seat: 'mi-statehouse-44', composer: false, alias: 'mi-hd-44', route: '/district/mi-hd-44', pid: 'frisbie_mi', h1: 'Michigan House District 44', where: 'District 44 as Michigan’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Michigan House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-27': { seat: 'mi-statehouse-27', composer: false, alias: 'mi-hd-27', route: '/district/mi-hd-27', pid: 'linting_mi', h1: 'Michigan House District 27', where: 'District 27 as Michigan’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Michigan House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-46': { seat: 'mi-statehouse-46', composer: false, alias: 'mi-hd-46', route: '/district/mi-hd-46', pid: 'schmaltz_mi', h1: 'Michigan House District 46', where: 'District 46 as Michigan’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Michigan House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-28': { seat: 'mi-statehouse-28', composer: false, alias: 'mi-hd-28', route: '/district/mi-hd-28', pid: 'thompson_mi', h1: 'Michigan House District 28', where: 'District 28 as Michigan’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Michigan House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-55': { seat: 'mi-statehouse-55', composer: false, alias: 'mi-hd-55', route: '/district/mi-hd-55', pid: 'tisdel_mi', h1: 'Michigan House District 55', where: 'District 55 as Michigan’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Michigan House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-61': { seat: 'mi-statehouse-61', composer: false, alias: 'mi-hd-61', route: '/district/mi-hd-61', pid: 'mentzer_mi', h1: 'Michigan House District 61', where: 'District 61 as Michigan’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Michigan House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-7': { seat: 'nc-statesenate-7', composer: false, alias: 'nc-sd-7', route: '/district/nc-sd-7', pid: 'michael_lee_nc', h1: 'North Carolina Senate District 7', where: 'District 7 as North Carolina’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for North Carolina Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-11': { seat: 'nc-statesenate-11', composer: false, alias: 'nc-sd-11', route: '/district/nc-sd-11', pid: 'barnes_nc', h1: 'North Carolina Senate District 11', where: 'District 11 as North Carolina’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for North Carolina Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-42': { seat: 'nc-statesenate-42', composer: false, alias: 'nc-sd-42', route: '/district/nc-sd-42', pid: 'bradley_nc', h1: 'North Carolina Senate District 42', where: 'District 42 as North Carolina’s current legislative plan draws it', kick: 'Senate District 42 board', kickTitle: 'The district board for North Carolina Senate District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-18': { seat: 'nc-statesenate-18', composer: false, alias: 'nc-sd-18', route: '/district/nc-sd-18', pid: 'fatmi_nc', h1: 'North Carolina Senate District 18', where: 'District 18 as North Carolina’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for North Carolina Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-25': { seat: 'nc-statehouse-25', composer: false, alias: 'nc-hd-25', route: '/district/nc-hd-25', pid: 'chesser_nc', h1: 'North Carolina House District 25', where: 'District 25 as North Carolina’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for North Carolina House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-105': { seat: 'nc-statehouse-105', composer: false, alias: 'nc-hd-105', route: '/district/nc-hd-105', pid: 'cotham_nc', h1: 'North Carolina House District 105', where: 'District 105 as North Carolina’s current legislative plan draws it', kick: 'House District 105 board', kickTitle: 'The district board for North Carolina House District 105: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-98': { seat: 'nc-statehouse-98', composer: false, alias: 'nc-hd-98', route: '/district/nc-hd-98', pid: 'helfrich_nc', h1: 'North Carolina House District 98', where: 'District 98 as North Carolina’s current legislative plan draws it', kick: 'House District 98 board', kickTitle: 'The district board for North Carolina House District 98: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-37': { seat: 'nc-statehouse-37', composer: false, alias: 'nc-hd-37', route: '/district/nc-hd-37', pid: 'pare_nc', h1: 'North Carolina House District 37', where: 'District 37 as North Carolina’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for North Carolina House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-40': { seat: 'pa-statesenate-40', composer: false, alias: 'pa-sd-40', route: '/district/pa-sd-40', pid: 'rosemary_brown_pa', h1: 'Pennsylvania Senate District 40', where: 'District 40 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 40 board', kickTitle: 'The district board for Pennsylvania Senate District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-16': { seat: 'pa-statesenate-16', composer: false, alias: 'pa-sd-16', route: '/district/pa-sd-16', pid: 'coleman_pa', h1: 'Pennsylvania Senate District 16', where: 'District 16 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Pennsylvania Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-6': { seat: 'pa-statesenate-6', composer: false, alias: 'pa-sd-6', route: '/district/pa-sd-6', pid: 'farry_pa', h1: 'Pennsylvania Senate District 6', where: 'District 6 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Pennsylvania Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-36': { seat: 'pa-statesenate-36', composer: false, alias: 'pa-sd-36', route: '/district/pa-sd-36', pid: 'malone_pa', h1: 'Pennsylvania Senate District 36', where: 'District 36 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Pennsylvania Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-24': { seat: 'pa-statesenate-24', composer: false, alias: 'pa-sd-24', route: '/district/pa-sd-24', pid: 'pennycuick_pa', h1: 'Pennsylvania Senate District 24', where: 'District 24 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Pennsylvania Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-72': { seat: 'pa-statehouse-72', composer: false, alias: 'pa-hd-72', route: '/district/pa-hd-72', pid: 'burns_pa', h1: 'Pennsylvania House District 72', where: 'District 72 as Pennsylvania’s current legislative plan draws it', kick: 'House District 72 board', kickTitle: 'The district board for Pennsylvania House District 72: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-12': { seat: 'pa-statehouse-12', composer: false, alias: 'pa-hd-12', route: '/district/pa-hd-12', pid: 'dukes_pa', h1: 'Pennsylvania House District 12', where: 'District 12 as Pennsylvania’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Pennsylvania House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-137': { seat: 'pa-statehouse-137', composer: false, alias: 'pa-hd-137', route: '/district/pa-hd-137', pid: 'emrick_pa', h1: 'Pennsylvania House District 137', where: 'District 137 as Pennsylvania’s current legislative plan draws it', kick: 'House District 137 board', kickTitle: 'The district board for Pennsylvania House District 137: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-142': { seat: 'pa-statehouse-142', composer: false, alias: 'pa-hd-142', route: '/district/pa-hd-142', pid: 'hogan_pa', h1: 'Pennsylvania House District 142', where: 'District 142 as Pennsylvania’s current legislative plan draws it', kick: 'House District 142 board', kickTitle: 'The district board for Pennsylvania House District 142: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-144': { seat: 'pa-statehouse-144', composer: false, alias: 'pa-hd-144', route: '/district/pa-hd-144', pid: 'munroe_pa', h1: 'Pennsylvania House District 144', where: 'District 144 as Pennsylvania’s current legislative plan draws it', kick: 'House District 144 board', kickTitle: 'The district board for Pennsylvania House District 144: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-18': { seat: 'pa-statehouse-18', composer: false, alias: 'pa-hd-18', route: '/district/pa-hd-18', pid: 'tomlinson_pa', h1: 'Pennsylvania House District 18', where: 'District 18 as Pennsylvania’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Pennsylvania House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-160': { seat: 'pa-statehouse-160', composer: false, alias: 'pa-hd-160', route: '/district/pa-hd-160', pid: 'craig_williams_pa', h1: 'Pennsylvania House District 160', where: 'District 160 as Pennsylvania’s current legislative plan draws it', kick: 'House District 160 board', kickTitle: 'The district board for Pennsylvania House District 160: who is in the room and what is on the table. A place, not a scorecard.' },
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

  // The read asks for the baseline page — see the header on why that query and
  // not another. Band 3 prints EVERY printable row that page returns, in the
  // order the archive returned it; nothing here re-sorts, promotes, hides or
  // caps one for being inconvenient. (It used to stop at forty rows, which read
  // on a busy seat as though forty were a count of something.)
  var PAGE_SIZE = 100;

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

    // WHAT THE ROOM IS FOR, and it is the homepage card's sentence word for
    // word (index.html, .pdxhv-line). Painted once at the top of the board's
    // host, under the page title and above band 1, on every board — the hand
    // documents and the generated ones read it from here and nowhere else. It
    // is the introduction; voiceFoot below is the rule. They may repeat the
    // verified-resident sentence and may not disagree.
    purpose: 'This is where neighbors read the same record and speak to the seat — not the internet. ' +
             'Anyone can read a board. Only verified residents of that seat get a voice that counts.',

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
    utPinsLabel: 'Top issues in Utah',
    utPinEmpty: 'No measures on this seat for this issue yet.',
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
    // THE DOOR UNDER A MISS. Nothing on this seat answered, so the field offers
    // the seat's general conversation instead of a dead end. The second label
    // is the one used wherever the general room is on the page (generalPresent()).
    findDoor: 'Talk about it in the general room',
    findDoorThread: 'Start a thread about this',
    // The general room's frame, before district-composer.js fills it.
    generalHd: 'General',
    generalWait: 'Reading the general room…',
    // The reason under the locked line, printed under the general room. It
    // adds no gate and replaces nothing: the locked line stays as it is.
    roomFor: 'This room is for the people who live in this district. Outside noise stays outside.',
    tableUnfiled: 'Not filed under an issue',
    // How many issue categories have at least one measure on this seat. A count
    // of the groups the table actually prints, never a total of every topic the
    // vocabulary knows and never a limit.
    catCountOne: '1 issue category has a measure on this seat',
    // The toggle row under the search field.
    togglesLabel: 'Filter by type and time',
    tgType: 'Type',
    tgTime: 'Time',
    tgAll: 'All',
    tgTopics: 'Topics',
    tgMandates: 'Mandates',
    tgCurrent: 'Current',
    tgPast: 'Past',
    catCountMany: ' issue categories have a measure on this seat',
    // THE MANDATE ROWS, on the composer boards only. A mandate is a reform
    // proposal from /mandate that names this seat (its key in the proposal's
    // race links) or the member who sits in it. Its count is shows of support —
    // momentum, the Mandate lane's own word — never a vote and never a measure.
    catMandates: 'Mandates',
    mandateTag: 'Mandate',
    mandateStatus: 'Open proposal',
    // The composer boards' finder sits above the chips and also finds mandates.
    findLabelComposer: 'Find a topic or mandate',
    findPlaceholderComposer: 'Title, bill number or mandate',
    // The pinned strip above the parent list on the composer boards.
    pinnedHead: 'Live on this seat',
    pinAnswered: 'answered',
    pinCommented: 'commented',
    mandateHref: '/mandate',

    // THE GATE IS A RESIDENCY CHECK FOR THIS SEAT, nothing else. The second
    // sentence is district-composer.js's LOCKED_LINE, word for word, so the
    // board and the composer cannot describe two different gates. The third
    // says the room is the seat's: a verification for another seat opens
    // nothing here. One string, so every board — generated, statewide and the
    // five hand-written composer boards — carries the same footer.
    voiceFoot: 'The public record and this read-only board are free to everyone. ' +
               'Only verified residents of this seat get a voice that counts. ' +
               'This board is this seat’s room, and a flag for another seat does not open it.',
    // A board with no composer host says it is a reader, and nothing about
    // what might come. One string for every such board, generated or statewide.
    readOnlyLine: 'This room is read-only. Only verified residents of a seat with a ' +
                  'composer get a voice that counts.',

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

  // ── THE FACE IS THE ROSTER FIELD ──────────────────────────────────────────
  // A person has one portrait: `photo` on their roster record, read through
  // window.pdxPortrait (roster-portrait.js) — the live PROFILES record first,
  // then the bundled cmp-data.js row — which is also what the person file's
  // letterhead and the homepage record card read. This module holds no photo
  // table, no resolver of its own and no address; a board document without
  // roster-portrait.js paints the mark, never a guess.
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
  function faceUrl(pid) {
    if (!pid) return '';
    var u = '';
    try { u = fn(window.pdxPortrait) ? window.pdxPortrait(pid) : ''; } catch (e) { u = ''; }
    u = u ? String(u).trim() : '';
    return (u && !_deadFaces[u]) ? u : '';
  }
  function faceMark(row) {
    var m = row && row.icon ? String(row.icon).trim() : '';
    return m || '\uD83C\uDFDB';
  }

  // ── THE INTRODUCTION ──────────────────────────────────────────────────────
  // One line, the same on every board. Not a band: no heading, no count, no
  // control.
  function purposeHtml() {
    return '<p class="pdxdb-purpose" data-pdxdb-purpose="1">' + esc(COPY.purpose) + '</p>';
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
    for (var i = 0; i < list.length; i++) {
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
  // `type` and `time` are the toggle row under the search field: '' is All.
  //   type  'topics' hides the mandate rows; 'mandates' hides every measure.
  //   time  'current' keeps the measures from the seat's latest sitting (see
  //         sitOf()); 'past' keeps the older ones. Open mandates are current.
  var _view = { cat: '', q: '', open: {}, type: '', time: '', pin: '' };

  // ── UTAH'S THREE PINNED ISSUES ────────────────────────────────────────────
  // Hard-coded, Utah boards only (a seat key that opens "ut-"): a short row
  // above the category list naming the three issues that matter most in Utah
  // right now. NOT A SECOND TAXONOMY. Each pin is a button onto the existing
  // issue groups for its keys — existing ISSUE_MAP keys, no new one — and
  // wears the colour those groups' chips already wear. Data Centers opens all
  // three data-center groups together (growth, power, water), so the pin names
  // the topic without picking a side of it. A pin whose keys have no measure
  // on this seat still shows, and opens an empty group that says so.
  var UTAH_PINS = [
    { id: 'datacenters', label: 'Data Centers', keys: ['datacenter_growth', 'datacenter_power', 'datacenter_water'] },
    { id: 'public_lands', label: 'Protect Public Lands', keys: ['lands_preserve'] },
    { id: 'gsl_water', label: 'Great Salt Lake Water', keys: ['water'] }
  ];
  function utahSeat(seatKey) { return /^ut-/.test(String(seatKey || '')); }
  function pinsFor(seatKey) { return utahSeat(seatKey) ? UTAH_PINS : []; }
  // The seat this board is identified as — by its host element or its
  // document — the same way composerSeatDeclared() asks. A composer host whose
  // seat is not named reads the active board. A render that cannot say which
  // seat it is for prints no pins rather than borrowing the default seat's.
  function boardPins() {
    var b = board(hostSeat(_el)) || board(docSeat());
    if (!b && composerOwned()) b = ACTIVE;
    return pinsFor(b && b.seat);
  }
  function pinById(id) {
    for (var i = 0; i < UTAH_PINS.length; i++) if (UTAH_PINS[i].id === id) return UTAH_PINS[i];
    return null;
  }
  // The keys the pressed pin opens, or null when no pin is pressed.
  function pinKeys() {
    var p = _view.pin ? pinById(_view.pin) : null;
    return p ? p.keys : null;
  }

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

  // A measure is found by its title, its bill number and the labels of the
  // issues it is filed under — the three things its row prints.
  function findText(item) {
    var labels = [];
    var ks = rowIssues(item);
    for (var i = 0; i < ks.length; i++) labels.push(issueLabel(ks[i]));
    return (String(item.title || '') + ' ' + String(item.number || '') + ' ' + labels.join(' ')).toLowerCase();
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

  // ── THE EVERYDAY WORDS, A SECOND PASS ─────────────────────────────────────
  // People type "data centers", "ai", "water" or "taxes", not a bill number.
  // When the title-and-number pass above misses, the field also asks this one
  // shared table: issue key → the everyday words that find it, in the same
  // style as the person file's FIND_ALIASES (stance-tree.js). A hit opens the
  // GROUP for that issue, every row in it, and only a group THIS SEAT ALREADY
  // PRINTS: an alias on a key with no measure here points at nothing, so the
  // field never invents an issue or a measure. A miss is still a miss, and the
  // miss line offers the general conversation (see generalDoorHtml()).
  //
  // Whole words only, so "ai" finds Data Centers & AI Growth and not every
  // title that says "maintain". A word already in a label still reaches it
  // through the first pass; it is listed here only where the label does not
  // carry the reader's spelling.
  var FIND_ALIASES = {
    datacenter_growth: ['data center', 'data centers', 'data centre', 'data centres', 'datacenter', 'datacenters',
                        'ai', 'a i', 'artificial intelligence', 'hyperscale', 'hyperscaler'],
    datacenter_water:  ['data center', 'data centers', 'data centre', 'data centres', 'datacenter', 'datacenters', 'water'],
    datacenter_power:  ['data center', 'data centers', 'data centre', 'data centres', 'datacenter', 'datacenters',
                        'power', 'electricity', 'power bill', 'power bills', 'utility', 'utility bills', 'grid'],
    tech_innovation:   ['ai', 'a i', 'artificial intelligence', 'tech', 'technology'],
    tech_balance:      ['ai', 'a i', 'artificial intelligence', 'tech', 'technology'],
    water:             ['water', 'drought', 'great salt lake'],
    water_storage:     ['water', 'reservoir', 'reservoirs', 'dam', 'dams', 'drought'],
    lower_taxes:       ['tax', 'taxes', 'income tax', 'income taxes', 'taxation'],
    tax_middle_class:  ['tax', 'taxes', 'tax credit', 'tax credits', 'taxation'],
    prop_tax:          ['tax', 'taxes', 'property tax', 'property taxes', 'taxation'],
    property_tax:      ['tax', 'taxes', 'property tax', 'property taxes', 'taxation', 'housing'],
    public_schools:    ['school', 'schools', 'education', 'teacher', 'teachers', 'classroom', 'classrooms'],
    school_choice:     ['school', 'schools', 'education', 'voucher', 'vouchers', 'charter', 'charters'],
    edu_balance:       ['school', 'schools', 'education', 'teacher', 'teachers'],
    edu_parental:      ['school', 'schools', 'education', 'curriculum'],
    edu_college_cost:  ['education', 'college', 'tuition', 'student loans', 'student debt'],
    housing:           ['housing', 'rent', 'rents', 'home prices', 'homes', 'affordable housing'],
    housing_build:     ['housing', 'homes', 'zoning', 'home building'],
    housing_support:   ['housing', 'rent', 'rents', 'renters', 'affordable housing'],
    housing_first_time:['housing', 'homes', 'home prices', 'first home', 'mortgage'],
    homeless:          ['housing', 'homeless', 'homelessness']
  };
  function aliasNorm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[&+]/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  // The issue keys the typed words name, as a set. Empty for an empty query.
  // The query is the haystack: "data centers in utah" carries "data centers".
  function aliasKeys(q) {
    var out = {};
    var hay = ' ' + aliasNorm(q) + ' ';
    if (hay === '  ') return out;
    for (var k in FIND_ALIASES) {
      if (!Object.prototype.hasOwnProperty.call(FIND_ALIASES, k)) continue;
      var words = FIND_ALIASES[k];
      for (var i = 0; i < words.length; i++) {
        var w = aliasNorm(words[i]);
        if (w && hay.indexOf(' ' + w + ' ') !== -1) { out[k] = 1; break; }
      }
    }
    return out;
  }
  // Does the alias pass open the group printed under `key`? Unfiled rows ('')
  // never answer an alias: they have no issue to be the closest one.
  function aliasOpens(key, q) {
    return !!key && Object.prototype.hasOwnProperty.call(aliasKeys(q), key);
  }

  // ── THE TYPE AND TIME TOGGLES ─────────────────────────────────────────────
  // They HIDE rows and nothing else: no category is added or removed, no row is
  // re-sorted, and the archive read is the same 100-row page.
  //
  // WHICH SITTING IS CURRENT is read off the rows the seat already has. A
  // federal row carries its Congress number; the active Congress is the highest
  // one present on the seat, and every lower number is past. A Utah row carries
  // no Congress, only its general session ("2025GS"); there the latest session
  // year present on the seat is current. A row that names neither is in no
  // sitting and shows under All only. Computed per paint by sitContext().
  var _sit = { congress: 0, year: 0 };
  function congressOf(item) {
    var c = item && item.congress;
    return (typeof c === 'number' && isFinite(c) && c > 0) ? Math.floor(c) : 0;
  }
  function sessionYearOf(item) {
    var mi = item && item.measureIdent;
    var m = mi && typeof mi.session === 'string' ? /^(\d{4})/.exec(mi.session.trim()) : null;
    return m ? Number(m[1]) : 0;
  }
  function sitContext(rows) {
    var c = 0, y = 0;
    for (var i = 0; i < rows.length; i++) {
      var ci = congressOf(rows[i]);
      if (ci) { if (ci > c) c = ci; continue; }
      var yi = sessionYearOf(rows[i]);
      if (yi > y) y = yi;
    }
    return { congress: c, year: y };
  }
  // 'current', 'past', or '' when the row names no sitting.
  function sitOf(item) {
    var c = congressOf(item);
    if (c) return c >= _sit.congress ? 'current' : 'past';
    var y = sessionYearOf(item);
    if (y) return y >= _sit.year ? 'current' : 'past';
    return '';
  }
  function timeOk(sit) { return !_view.time || _view.time === sit; }
  // Is any filter narrowing the list? The search, or either toggle.
  function narrowing() { return !!(normQuery(_view.q) || _view.type || _view.time); }
  // One measure row: the search, the type and the time, all at once. `key` is
  // the group the row is printed under; the alias pass opens that whole group.
  function rowShown(item, key) {
    var q = normQuery(_view.q);
    return _view.type !== 'mandates' && timeOk(sitOf(item)) &&
      (matches(findText(item), q) || aliasOpens(key, q));
  }
  // One mandate row. An open proposal is current; it is not a topic.
  function mandateShown(m) {
    return _view.type !== 'topics' && timeOk('current') && matches(mandateFind(m), normQuery(_view.q));
  }

  // WHETHER A GROUP IS SHOWN AND WHETHER IT IS OPEN, decided in one place for
  // both the first render and every later filter change.
  function groupState(key, hits, stance) {
    var q = normQuery(_view.q);
    var pk = pinKeys();
    if (pk) {
      // A PRESSED PIN shows and opens exactly its own groups, like a chip
      // that covers more than one key; the search and toggles still narrow.
      var pshown = pk.indexOf(key) !== -1;
      if (pshown && narrowing() && !hits) pshown = false;
      return { shown: pshown, open: pshown };
    }
    var shown = !_view.cat || _view.cat === key;
    if (key === '') shown = !_view.cat;          // the unfiled rows: All only
    if (shown && narrowing() && !hits) shown = false;
    var open;
    if (q) open = hits > 0;
    // A chip opens its own group. On the composer boards it opens ONLY that
    // one: the groups it hides are closed too, so clearing the chip finds them
    // collapsed rather than open behind the filter.
    else if (_view.cat) open = composerBoard() ? _view.cat === key : true;
    else if (Object.prototype.hasOwnProperty.call(_view.open, key)) open = !!_view.open[key];
    // The composer boards: every group starts collapsed, except one the
    // visitor already holds a side on, which opens the way it always did on
    // the other boards.
    else if (composerBoard()) open = !!(key && stance[key]);
    else open = !!(key && stance[key]);
    return { shown: shown, open: open };
  }

  function measuresWord(n) { return n === 1 ? '1 measure' : n + ' measures'; }

  function groupHtml(key, label, rows, tally, stance) {
    var q = normQuery(_view.q);
    var hits = 0, body = '';
    for (var i = 0; i < rows.length; i++) {
      var hit = rowShown(rows[i], key);
      if (hit) hits++;
      body += measureRow(rows[i], tally, key, !hit);
    }
    var st = groupState(key, hits, stance);
    var head = key
      ? '<span class="pdxdb-group-l"' + issueSkin(key) + '>' + esc(label) + '</span>'
      : '<span class="pdxdb-group-l pdxdb-group-l--none">' + esc(COPY.tableUnfiled) + '</span>';
    var table = '<table class="pdxdb-table"><thead><tr>' +
          '<th scope="col">' + esc(COPY.colMeasure) + '</th>' +
          '<th scope="col" class="pdxdb-num">' + esc(COPY.colPolls) + '</th>' +
          '<th scope="col" class="pdxdb-num">' + esc(COPY.colComments) + '</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table>';
    // THE COMPOSER BOARDS SAY COLLAPSED IN THE MARKUP, not only through the
    // <details> element's own state: the header carries a collapsed class and
    // aria-expanded, and the body is hidden, so a closed group is closed under
    // any stylesheet. syncGroup() keeps all three in step with `open`. Every
    // other board prints the markup it always has.
    var composer = composerBoard();
    var summary = composer
      ? '<summary class="pdxdb-group-h' + (st.open ? '' : ' ' + COLLAPSED) + '"' +
          ' aria-expanded="' + (st.open ? 'true' : 'false') + '">'
      : '<summary class="pdxdb-group-h">';
    return '<details class="pdxdb-group' + (key ? '' : ' pdxdb-group--none') + '"' +
        ' data-pdxdb-group="' + esc(key) + '"' +
        (st.open ? ' open' : '') + (st.shown ? '' : ' hidden') + '>' +
        summary + head +
          '<span class="pdxdb-group-n" data-pdxdb-group-count="' + rows.length + '">' +
            esc(measuresWord(rows.length)) + '</span>' +
        '</summary>' +
        (composer
          ? '<div class="pdxdb-group-b" data-pdxdb-group-body=""' + (st.open ? '' : ' hidden') + '>' + table + '</div>'
          : table) +
      '</details>';
  }

  // The header class a collapsed group wears on the composer boards.
  var COLLAPSED = 'pdxdb-group-h--collapsed';

  // One group's open state, written to every place it is printed: the
  // <details> element, and — where the composer markup carries them — the
  // header's class and aria-expanded and the body's hidden flag. Idempotent, so
  // the `toggle` event it can cause re-enters harmlessly.
  function syncGroup(d, open) {
    if (!d) return;
    if (!!d.open !== !!open) d.open = !!open;
    try {
      var sum = fn(d.querySelector) ? d.querySelector('.pdxdb-group-h') : null;
      if (sum && sum.hasAttribute && sum.hasAttribute('aria-expanded')) {
        sum.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (sum.classList) {
          if (open) sum.classList.remove(COLLAPSED); else sum.classList.add(COLLAPSED);
        }
      }
      var b = fn(d.querySelector) ? d.querySelector('[data-pdxdb-group-body]') : null;
      if (b) b.hidden = !open;
    } catch (e) {}
  }

  // ── THE MANDATE ROWS ──────────────────────────────────────────────────────
  // NOT A GROUP: a flat list of rows above the issue groups, filtered by its
  // own chip in the same chip row. All shows them, "Mandates" shows only them,
  // any issue chip hides them. Printed only when at least one mandate names the
  // seat. The chip key is not an issue key — the leading '@' is a shape no
  // vocabulary key takes — so it can never collide with an issue group, and the
  // list is marked data-pdxdb-mandates rather than data-pdxdb-group, so the
  // poll module (which decorates every issue group) gives it no poll.
  var MANDATE_KEY = '@mandates';

  // The rows the read returned that can be printed: an integer id (the link
  // needs one) and a title. The read's own order is kept.
  function mandateRows(list) {
    var arr = Array.isArray(list) ? list : [];
    var out = [], seen = {};
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m) continue;
      var id = m.id;
      if (typeof id !== 'number' || !isFinite(id) || id < 1 || Math.floor(id) !== id) continue;
      if (!String(m.title || '').trim() || seen[id]) continue;
      seen[id] = 1;
      out.push(m);
    }
    return out;
  }

  // A mandate is found by its tag (the word "Mandate" and the proposal's own
  // category, when it has one) and its title — what its row prints.
  function mandateFind(m) {
    return (COPY.mandateTag + ' ' + mandateCategory(m) + ' ' + String(m.title || '')).toLowerCase();
  }
  function mandateCategory(m) { return String((m && m.category) || '').trim(); }

  // THE MANDATE MARKER. Every mandate row — in the table and in the pinned
  // strip — carries a small flag before its tag and the mandate colour class
  // (pdxdb-mandate-c, the gold token in district-board.css), never an issue
  // colour: a reform proposal is not a measure and must not read as one. No
  // issue row ever gets either.
  var MANDATE_FLAG = '\u2691';
  var MANDATE_CLASS = 'pdxdb-mandate-c';
  function mandateTagHtml(m) {
    var cat = mandateCategory(m);
    return '<span class="pdxdb-mandate-flag" aria-hidden="true">' + MANDATE_FLAG + '</span>' +
      '<span class="pdxdb-mandate-tag pdxdb-mandate-pill">' + esc(COPY.mandateTag) + '</span>' +
      (cat ? '<span class="pdxdb-mandate-cat">' + esc(cat) + '</span>' : '');
  }

  function supportWord(n) { return n === 1 ? '1 show of support' : n + ' shows of support'; }

  function mandateRow(m, hidden) {
    var title = String(m.title || '').trim();
    var n = whole(m.supportCount);
    var href = COPY.mandateHref + '#pp-card-' + m.id;
    return '<li class="pdxdb-mandate ' + MANDATE_CLASS + '" data-pdxdb-mandate="' + esc(String(m.id)) + '"' +
        ' data-pdxdb-find="' + esc(mandateFind(m)) + '" data-pdxdb-time="current"' + (hidden ? ' hidden' : '') + '>' +
        mandateTagHtml(m) +
        '<a class="pdxdb-m-link" href="' + esc(href) + '">' + esc(title) + '</a>' +
        '<span class="pdxdb-mandate-st">' + esc(COPY.mandateStatus + ' · ' + supportWord(n)) + '</span>' +
      '</li>';
  }

  function mandateState(hits) {
    var shown = !_view.pin && (!_view.cat || _view.cat === MANDATE_KEY);
    if (_view.type === 'topics' || !timeOk('current')) shown = false;
    if (shown && narrowing() && !hits) shown = false;
    return { shown: shown };
  }

  function mandatesHtml(rows) {
    var q = normQuery(_view.q);
    var hits = 0, body = '';
    for (var i = 0; i < rows.length; i++) {
      var hit = mandateShown(rows[i]);
      if (hit) hits++;
      body += mandateRow(rows[i], !hit);
    }
    var st = mandateState(hits);
    return '<ul class="pdxdb-mandates" data-pdxdb-mandates=""' + (st.shown ? '' : ' hidden') + '>' +
        body + '</ul>';
  }

  // `icClass` is the palette colour class (pdxdb-ic-<core>), passed only for
  // the chips nested in a composer board's parent, so a parent header and its
  // chips wear the same class. Every other chip prints exactly as before.
  function catChip(key, label, n, skin, icClass) {
    var on = (_view.cat || '') === key;
    return '<button type="button" class="pdxdb-cat' + (icClass ? ' ' + esc(icClass) : '') + '" data-pdxdb-cat="' + esc(key) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (skin || '') + '>' +
        esc(label) + '<span class="pdxdb-cat-n">' + n + '</span></button>';
  }

  // THE UTAH PIN ROW. One button per pin, in the colour class and inline
  // token its first key's chip already wears (the same issueSkin() and the
  // same palette class a parent's chips carry). No count: a pin is a door
  // onto the groups, and the groups print their own.
  function pinSkin(p) { return issueSkin(p.keys[0]); }
  function pinIc(p) {
    var c = coreFor(p.keys[0]);
    return (c && paletteHas(c.key) && pinSkin(p)) ? IC_PREFIX + c.key : '';
  }
  function utahPinsHtml(pins, groups) {
    if (!pins || !pins.length) return '';
    var body = '';
    for (var i = 0; i < pins.length; i++) {
      var p = pins[i], ic = pinIc(p);
      body += '<button type="button" class="pdxdb-cat pdxdb-utpin' + (ic ? ' ' + esc(ic) : '') + '"' +
        ' data-pdxdb-utpin="' + esc(p.id) + '"' +
        ' aria-pressed="' + (_view.pin === p.id ? 'true' : 'false') + '"' + pinSkin(p) + '>' +
        esc(p.label) + '</button>';
    }
    return '<div class="pdxdb-utpins" data-pdxdb-utpins="" role="group" aria-label="' + esc(COPY.utPinsLabel) + '">' +
        '<span class="pdxdb-utpins-l">' + esc(COPY.utPinsLabel) + '</span>' + body + '</div>';
  }
  // Does this seat print a group for any of the pin's keys?
  function pinHasGroup(p, groups) {
    for (var i = 0; i < groups.length; i++) if (p.keys.indexOf(groups[i].key) !== -1) return true;
    return false;
  }
  // THE EMPTY GROUP a pin opens on a seat with no measure on its issue: the
  // group's own shape, open, holding one line, and shown only while its pin
  // is pressed. It carries no data-pdxdb-group, so no count, chip or poll
  // ever reads it as a group of measures.
  function pinEmptyHtml(pins, groups) {
    var out = '';
    for (var i = 0; i < (pins || []).length; i++) {
      var p = pins[i];
      if (pinHasGroup(p, groups)) continue;
      out += '<details class="pdxdb-group pdxdb-group--pinempty" data-pdxdb-pin-empty="' + esc(p.id) + '" open' +
          (_view.pin === p.id ? '' : ' hidden') + '>' +
          '<summary class="pdxdb-group-h" aria-expanded="true">' +
            '<span class="pdxdb-group-l"' + pinSkin(p) + '>' + esc(p.label) + '</span>' +
            '<span class="pdxdb-group-n">' + esc(measuresWord(0)) + '</span>' +
          '</summary>' +
          '<p class="pdxdb-none">' + esc(COPY.utPinEmpty) + '</p>' +
        '</details>';
    }
    return out;
  }

  // `mandates` is optional: a caller that passes three arguments gets the
  // table exactly as it was before mandate rows existed.
  function tableHtml(state, items, rooms, mandates) {
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
    var mrows = mandateRows(mandates);
    var rows = tableRows(list);
    if (!rows.length && !mrows.length) {
      return band('table', COPY.tableBand, COPY.tableNote,
        '<p class="pdxdb-none">' + esc(COPY.tableEmpty) + '</p>', COPY.voiceFoot);
    }

    var tally = roomIndex(rooms);
    var stance = stanceKeys();
    _sit = sitContext(rows);
    var G = tableGroups(rows);
    // A chip that no longer has a group on this seat (a repaint dropped it)
    // falls back to All rather than showing an empty table under a live chip.
    var live = false;
    for (var c = 0; c < G.groups.length; c++) if (G.groups[c].key === _view.cat) live = true;
    if (mrows.length && _view.cat === MANDATE_KEY) live = true;
    if (!live) _view.cat = '';

    var composer = composerBoard();
    // THE COMPOSER BOARDS NEST ISSUES UNDER THEIR CORE (see parentsOf()): the
    // top chip row keeps All and Mandates, and each issue's chip moves into its
    // parent's body above that parent's groups. Every other board keeps the
    // flat chip row and the flat list of groups it always had.
    var P = composer ? parentsOf(G.groups) : null;
    var chips = catChip('', COPY.catAll, rows.length + mrows.length, '');
    if (!P) {
      for (var i = 0; i < G.groups.length; i++) {
        var g = G.groups[i];
        chips += catChip(g.key, g.label, g.rows.length, issueSkin(g.key));
      }
    }
    if (mrows.length) chips += catChip(MANDATE_KEY, COPY.catMandates, mrows.length, '');
    var groups = '';
    if (P) {
      for (var pi = 0; pi < P.parents.length; pi++) groups += parentHtml(P.parents[pi], tally, stance);
      for (var oi = 0; oi < P.loose.length; oi++) {
        groups += groupHtml(P.loose[oi].key, P.loose[oi].label, P.loose[oi].rows, tally, stance);
      }
    } else {
      for (var j = 0; j < G.groups.length; j++) {
        groups += groupHtml(G.groups[j].key, G.groups[j].label, G.groups[j].rows, tally, stance);
      }
    }
    if (G.unfiled.length) groups += groupHtml('', '', G.unfiled, tally, stance);
    // No measure on hand, but a mandate names the seat: the empty line still
    // says so, under the mandate rows.
    if (!rows.length) groups += '<p class="pdxdb-none">' + esc(COPY.tableEmpty) + '</p>';
    // The mandate rows lead the list, in the chip row's filter like any chip.
    if (mrows.length) groups = mandatesHtml(mrows) + groups;

    // THE COMPOSER BOARDS PUT THE FINDER ABOVE THE CHIPS and name what it
    // finds; every other board keeps the chips-then-search order it had.
    var cats = '<div class="pdxdb-cats" role="group" aria-label="' + esc(COPY.catsLabel) + '">' + chips + '</div>' +
      (G.groups.length ? '<p class="pdxdb-cat-count" data-pdxdb-cat-count="' + G.groups.length + '">' +
        esc(G.groups.length === 1 ? COPY.catCountOne : G.groups.length + COPY.catCountMany) + '</p>' : '');
    var find = '<label class="pdxdb-find"><span class="pdxdb-find-l">' +
        esc(composer ? COPY.findLabelComposer : COPY.findLabel) + '</span>' +
        '<input class="pdxdb-find-i" type="search" data-pdxdb-search autocomplete="off"' +
          ' placeholder="' + esc(composer ? COPY.findPlaceholderComposer : COPY.findPlaceholder) + '" value="' + esc(_view.q) + '" /></label>';

    var toggles = togglesHtml();
    var pins = boardPins();
    var utPins = utahPinsHtml(pins, G.groups);
    groups = pinEmptyHtml(pins, G.groups) + groups;
    return band('table', COPY.tableBand, COPY.tableNote,
      (composer ? find + toggles + utPins + cats + (P ? pinnedHtml(mrows, G.groups, tally) : '') : cats + find + toggles + utPins) +
      '<div class="pdxdb-groups"' + (P ? ' data-pdxdb-layout="parents"' : '') + '>' + groups + '</div>' +
      '<p class="pdxdb-none pdxdb-find-none" data-pdxdb-find-none' +
        (anyShown(G, mrows, pins) ? ' hidden' : '') + '>' + esc(COPY.findNone) + '</p>' +
      generalDoorHtml(anyShown(G, mrows, pins)),
      COPY.voiceFoot);
  }

  // ── THE PARENT LAYER (composer boards only) ───────────────────────────────
  // NO NEW TAXONOMY. A parent is the issue's CORE in CORE_NATIONAL_ISSUES —
  // the one parent table, where every published key sits under exactly one
  // core (scripts/test-issue-family.mjs holds that). It is asked through
  // PDXIssueFamily when that reader is on the document, else through
  // issue-map.js's own coreIssueForKey, which is the same table. Parents print
  // in that table's order; a group whose key has no core (the table absent,
  // or a key it does not file) stays a flat group after the parents, exactly
  // as it was, rather than being given an invented home.
  function coreFor(key) {
    try {
      var F = window.PDXIssueFamily;
      if (F && fn(F.coreOf) && fn(F.label)) {
        var id = F.coreOf(key);
        if (id) return { key: String(id), label: String(F.label(id) || '') };
      }
    } catch (e) {}
    try {
      if (fn(window.coreIssueForKey)) {
        var ci = window.coreIssueForKey(key);
        if (ci && ci.key) return { key: String(ci.key), label: String(ci.label || '') };
      }
    } catch (e) {}
    // The table itself, for a document where neither reader has published:
    // the same CORE_NATIONAL_ISSUES both of them read, first claim wins, as
    // coreIssueForKey builds it.
    try {
      var l = window.CORE_NATIONAL_ISSUES;
      if (Array.isArray(l)) {
        for (var i = 0; i < l.length; i++) {
          var c = l[i];
          if (c && c.key && Array.isArray(c.keys) && c.keys.indexOf(key) !== -1) return { key: String(c.key), label: String(c.label || '') };
        }
      }
    } catch (e) {}
    return null;
  }
  function coreRank(coreKey) {
    try {
      var l = window.CORE_NATIONAL_ISSUES;
      if (Array.isArray(l)) for (var i = 0; i < l.length; i++) if (l[i] && l[i].key === coreKey) return i;
    } catch (e) {}
    return 1e9;
  }
  function parentsOf(groups) {
    var byCore = {}, parents = [], loose = [];
    for (var i = 0; i < groups.length; i++) {
      var c = coreFor(groups[i].key);
      if (!c || !c.label) { loose.push(groups[i]); continue; }
      if (!byCore[c.key]) { byCore[c.key] = { key: c.key, label: c.label, groups: [] }; parents.push(byCore[c.key]); }
      byCore[c.key].groups.push(groups[i]);
    }
    parents.sort(function (a, b) { return coreRank(a.key) - coreRank(b.key); });
    return { parents: parents, loose: loose };
  }

  // The parent's open/shown state is DERIVED from its children's: shown when
  // any child group is shown (so an issue chip shows only its own parent, the
  // Mandates chip shows none, and a search shows the parents it hit); open
  // only while a chip or a search is choosing, or when the reader opened it by
  // hand. Otherwise collapsed. One function for the render and for applyView.
  function parentState(coreKey, anyChildShown, anyChildOpen) {
    var shown = !!anyChildShown;
    var open;
    if (normQuery(_view.q) || _view.cat || _view.pin) open = shown;
    else if (Object.prototype.hasOwnProperty.call(_view.open, PARENT_PREFIX + coreKey)) open = !!_view.open[PARENT_PREFIX + coreKey];
    // A child group open on the visitor's own side would be invisible inside a
    // closed parent, so its parent opens with it. Otherwise collapsed.
    else open = !!(shown && anyChildOpen);
    return { shown: shown, open: open };
  }
  var PARENT_PREFIX = '^';
  var PARENT_COLLAPSED = 'pdxdb-parent-h--collapsed';

  function rowHits(rows, key) {
    var n = 0;
    for (var i = 0; i < rows.length; i++) if (rowShown(rows[i], key)) n++;
    return n;
  }
  function issuesWord(n) { return n === 1 ? '1 issue' : n + ' issues'; }

  function parentHtml(par, tally, stance) {
    // THE PARENT WEARS ITS CHIPS' COLOUR. The colour CLASS pdxdb-ic-<core> is
    // the palette entry's own (district-board.css defines one per
    // PDXIssueColors core, off that module's --pdx-issue-<core> variables), and
    // the header element and every chip nested under it carry the same one.
    // The inline token issueSkin() hands the first chip rides along as before.
    // No palette entry, no class and no token — never a borrowed hue.
    var skin = par.groups.length ? issueSkin(par.groups[0].key) : '';
    var icName = (skin && paletteHas(par.key)) ? IC_PREFIX + par.key : '';
    var icClass = icName ? ' ' + icName : '';
    var any = false, anyOpen = false, chips = '', body = '';
    for (var i = 0; i < par.groups.length; i++) {
      var g = par.groups[i];
      var gst = groupState(g.key, rowHits(g.rows, g.key), stance);
      if (gst.shown) any = true;
      if (gst.shown && gst.open) anyOpen = true;
      chips += catChip(g.key, g.label, g.rows.length, issueSkin(g.key), icName);
      body += groupHtml(g.key, g.label, g.rows, tally, stance);
    }
    var st = parentState(par.key, any, anyOpen);
    return '<details class="pdxdb-parent" data-pdxdb-parent="' + esc(par.key) + '"' +
        (st.open ? ' open' : '') + (st.shown ? '' : ' hidden') + '>' +
        '<summary class="pdxdb-parent-h' + esc(icClass) + (st.open ? '' : ' ' + PARENT_COLLAPSED) + '"' +
          ' aria-expanded="' + (st.open ? 'true' : 'false') + '"' + (icClass ? skin : '') + '>' +
          '<span class="pdxdb-parent-l">' + esc(par.label) + '</span>' +
          '<span class="pdxdb-parent-n" data-pdxdb-parent-count="' + par.groups.length + '">' +
            esc(issuesWord(par.groups.length)) + '</span>' +
        '</summary>' +
        '<div class="pdxdb-parent-b" data-pdxdb-parent-body=""' + (st.open ? '' : ' hidden') + '>' +
          '<div class="pdxdb-cats pdxdb-cats--parent" role="group" aria-label="' + esc(COPY.catsLabel) + '">' + chips + '</div>' +
          '<div class="pdxdb-groups">' + body + '</div>' +
        '</div>' +
      '</details>';
  }

  // The palette class prefix, and the palette itself asked whether it holds a
  // core: PDXIssueColors.CORE_ISSUE_COLORS is the one table of issue colours.
  var IC_PREFIX = 'pdxdb-ic-';
  function paletteHas(coreKey) {
    try {
      var C = window.PDXIssueColors;
      return !!(C && C.CORE_ISSUE_COLORS && Object.prototype.hasOwnProperty.call(C.CORE_ISSUE_COLORS, coreKey));
    } catch (e) { return false; }
  }

  // ── THE PINNED STRIP (composer boards only) ───────────────────────────────
  // Above the parent list, and outside every collapse and filter, so a reader
  // who sees nothing else open still sees what is live on this seat: up to
  // PIN_MANDATES mandate rows that name the seat, in the order the Mandate read
  // returned them, and up to PIN_ISSUES issue groups ranked by how many PEOPLE
  // answered a poll or wrote a comment on them here (band 2's own per-issue
  // tally). An issue nobody has touched is not pinned; a strip with nothing in
  // it is not printed. A pinned issue is a button onto its group — the same
  // data-pdxdb-cat control as a chip — never a second copy of the group, so the
  // poll module still sees each issue once. The counts are people, never a
  // majority and never this district's position.
  // ── THE TOGGLE ROW ────────────────────────────────────────────────────────
  // Under the search field on every board: Type (All · Topics · Mandates) and
  // Time (All · Current · Past). Each button is a pressed/unpressed toggle; All
  // is the default and clears the other two.
  function toggleBtn(attr, val, label, cur) {
    return '<button type="button" class="pdxdb-tg" ' + attr + '="' + esc(val) + '"' +
      ' aria-pressed="' + (cur === val ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }
  function togglesHtml() {
    var ty = _view.type || '', ti = _view.time || '';
    return '<div class="pdxdb-toggles" role="group" aria-label="' + esc(COPY.togglesLabel) + '">' +
        '<span class="pdxdb-tg-set" role="group" aria-label="' + esc(COPY.tgType) + '">' +
          '<span class="pdxdb-tg-l">' + esc(COPY.tgType) + '</span>' +
          toggleBtn(TG_TYPE, '', COPY.tgAll, ty) +
          toggleBtn(TG_TYPE, 'topics', COPY.tgTopics, ty) +
          toggleBtn(TG_TYPE, 'mandates', COPY.tgMandates, ty) +
        '</span>' +
        '<span class="pdxdb-tg-set" role="group" aria-label="' + esc(COPY.tgTime) + '">' +
          '<span class="pdxdb-tg-l">' + esc(COPY.tgTime) + '</span>' +
          toggleBtn(TG_TIME, '', COPY.tgAll, ti) +
          toggleBtn(TG_TIME, 'current', COPY.tgCurrent, ti) +
          toggleBtn(TG_TIME, 'past', COPY.tgPast, ti) +
        '</span>' +
      '</div>';
  }
  var TG_TYPE = 'data-pdxdb-tg-type';
  var TG_TIME = 'data-pdxdb-tg-time';

  // THE PINNED STRIP UNDER THE TOGGLES. Which rows are pinned is decided
  // exactly as before; the toggles only hide a pin. A mandate pin is hidden by
  // Topics and by Past. An issue pin is hidden by Mandates, and by a Time
  // setting none of its group's measures falls in (its sittings ride on the
  // pin as data-pdxdb-pin-times). Search and the chips still leave the strip
  // alone. A strip with every pin hidden is hidden whole.
  function pinMandateShown() { return _view.type !== 'topics' && timeOk('current'); }
  function pinIssueShown(times) {
    if (_view.type === 'mandates') return false;
    if (!_view.time) return true;
    return (' ' + times + ' ').indexOf(' ' + _view.time + ' ') !== -1;
  }
  function groupTimes(rows) {
    var seen = {}, out = [];
    for (var i = 0; i < rows.length; i++) {
      var t = sitOf(rows[i]);
      if (t && !seen[t]) { seen[t] = 1; out.push(t); }
    }
    return out.join(' ');
  }

  var PIN_MANDATES = 2;
  var PIN_ISSUES = 3;
  function pinnedIssues(groups, tally) {
    var list = [];
    for (var i = 0; i < groups.length; i++) {
      var t = tally[groups[i].key];
      var n = t ? whole(t.polls) + whole(t.comments) : 0;
      if (n > 0) list.push({ g: groups[i], polls: whole(t.polls), comments: whole(t.comments), n: n, at: i });
    }
    list.sort(function (a, b) { return (b.n - a.n) || (a.at - b.at); });
    return list.slice(0, PIN_ISSUES);
  }
  function pinnedHtml(mrows, groups, tally) {
    var ms = mrows.slice(0, PIN_MANDATES);
    var is = pinnedIssues(groups, tally);
    if (!ms.length && !is.length) return '';
    var body = '', anyPin = false;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      var mShown = pinMandateShown();
      if (mShown) anyPin = true;
      body += '<li class="pdxdb-pin pdxdb-pin--mandate ' + MANDATE_CLASS + '" data-pdxdb-pin-mandate="' + esc(String(m.id)) + '"' +
          (mShown ? '' : ' hidden') + '>' +
          mandateTagHtml(m) +
          '<a class="pdxdb-m-link" href="' + esc(COPY.mandateHref + '#pp-card-' + m.id) + '">' + esc(String(m.title || '').trim()) + '</a>' +
          '<span class="pdxdb-mandate-st">' + esc(COPY.mandateStatus + ' · ' + supportWord(whole(m.supportCount))) + '</span>' +
        '</li>';
    }
    for (var j = 0; j < is.length; j++) {
      var p = is[j];
      var times = groupTimes(p.g.rows);
      var iShown = pinIssueShown(times);
      if (iShown) anyPin = true;
      body += '<li class="pdxdb-pin pdxdb-pin--issue" data-pdxdb-pin-issue="' + esc(p.g.key) + '"' +
          ' data-pdxdb-pin-times="' + esc(times) + '"' + (iShown ? '' : ' hidden') + '>' +
          '<button type="button" class="pdxdb-pin-i" data-pdxdb-cat="' + esc(p.g.key) + '"' +
            ' aria-pressed="' + (_view.cat === p.g.key ? 'true' : 'false') + '"' + issueSkin(p.g.key) + '>' +
            esc(p.g.label) + '</button>' +
          '<span class="pdxdb-mandate-st">' + esc(people(p.polls) + ' ' + COPY.pinAnswered + ' · ' +
            people(p.comments) + ' ' + COPY.pinCommented) + '</span>' +
        '</li>';
    }
    return '<section class="pdxdb-pinned" data-pdxdb-pinned="" aria-label="' + esc(COPY.pinnedHead) + '"' +
        (anyPin ? '' : ' hidden') + '>' +
        '<h3 class="pdxdb-pinned-h">' + esc(COPY.pinnedHead) + '</h3>' +
        '<ul class="pdxdb-pins">' + body + '</ul>' +
      '</section>';
  }

  // A parent's open state, written to the <details>, the header's class and
  // aria-expanded, and the body's hidden flag. Idempotent, like syncGroup().
  function syncParent(d, open) {
    if (!d) return;
    if (!!d.open !== !!open) d.open = !!open;
    try {
      var sum = fn(d.querySelector) ? d.querySelector('.pdxdb-parent-h') : null;
      if (sum && sum.setAttribute) {
        sum.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (sum.classList) {
          if (open) sum.classList.remove(PARENT_COLLAPSED); else sum.classList.add(PARENT_COLLAPSED);
        }
      }
      var b = fn(d.querySelector) ? d.querySelector('[data-pdxdb-parent-body]') : null;
      if (b) b.hidden = !open;
    } catch (e) {}
  }

  // ── THE DOOR UNDER THE MISS LINE ──────────────────────────────────────────
  // One control, shown exactly when the miss line is, and pointing only at a
  // room that is already there. Where the general room is on the page — every
  // board carrying the composer host, see generalSlotHtml() — the door reads
  // "Start a thread about this" and lands in that section (GENERAL_ROOM_HREF).
  // A document with no composer host has no general room, so the door keeps
  // "Talk about it in the general room" and the DOCUMENTED PLACEHOLDER, /voice,
  // the District Voice page that lists the rooms for a reader's seats. The door
  // never carries the query, never posts and never names an issue.
  var GENERAL_ROOM_ID = 'pdx-general-room';
  var GENERAL_ROOM_HREF = '#' + GENERAL_ROOM_ID;
  var GENERAL_ROOM_PLACEHOLDER = '/voice';
  function generalPresent() { return composerOwned(); }
  function generalDoorHref() {
    return generalPresent() ? GENERAL_ROOM_HREF : GENERAL_ROOM_PLACEHOLDER;
  }
  function generalDoorHtml(hidden) {
    return '<p class="pdxdb-find-door" data-pdxdb-find-door=""' + (hidden ? ' hidden' : '') + '>' +
        '<a class="pdxdb-find-door-a" href="' + esc(generalDoorHref()) + '">' +
          esc(generalPresent() ? COPY.findDoorThread : COPY.findDoor) + '</a></p>';
  }

  // ── THE GENERAL ROOM'S PLACE ON THE BOARD ─────────────────────────────────
  // The first thread on every board, under the seat and above the issue
  // groups. This module prints only the frame; district-composer.js — the one
  // owner of the gate, the posts and the likes — fills it on every repaint
  // (it listens for pdxdb:paint), so a band-2 refresh never loses the thread.
  // Printed only where that owner is on the page.
  function generalSlotHtml() {
    if (!generalPresent()) return '';
    return '<section class="pdxdb-band pdxdb-band--general" data-pdxdb-band="general"' +
        ' id="' + GENERAL_ROOM_ID + '" data-pdxdb-general="">' +
        '<h2 class="pdxdb-h2">' + esc(COPY.generalHd) + '</h2>' +
        '<p class="pdxdb-wait" role="status"><span class="pdxdb-dot" aria-hidden="true"></span>' +
          esc(COPY.generalWait) + '</p>' +
      '</section>' +
      // A sibling of the frame, not inside it: district-composer.js rewrites
      // the frame's contents on every paint, and this sentence is not its.
      '<p class="pdxdb-room-for" data-pdxdb-room-for="">' + esc(COPY.roomFor) + '</p>';
  }

  function anyShown(G, mrows, pins) {
    // A pressed pin with no group on this seat shows its empty group.
    var pp = _view.pin ? pinById(_view.pin) : null;
    if (pp && (pins || []).indexOf(pp) !== -1 && !pinHasGroup(pp, G.groups)) return true;
    if (mrows && mrows.length) {
      var mh = 0;
      for (var m = 0; m < mrows.length; m++) if (mandateShown(mrows[m])) mh++;
      if (mandateState(mh).shown) return true;
    }
    var all = G.groups.slice();
    if (G.unfiled.length) all.push({ key: '', rows: G.unfiled });
    for (var i = 0; i < all.length; i++) {
      if (groupState(all[i].key, rowHits(all[i].rows, all[i].key), {}).shown) return true;
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
      if (chips[c].hasAttribute && chips[c].hasAttribute('data-pdxdb-utpin')) continue;
      chips[c].setAttribute('aria-pressed', chips[c].getAttribute('data-pdxdb-cat') === _view.cat ? 'true' : 'false');
    }
    var any = false;
    // The Utah pins say which is pressed, and an empty pin group shows only
    // while its own pin is.
    var ups = el.querySelectorAll('[data-pdxdb-utpin]');
    for (var u = 0; u < ups.length; u++) {
      ups[u].setAttribute('aria-pressed', ups[u].getAttribute('data-pdxdb-utpin') === _view.pin ? 'true' : 'false');
    }
    var pes = el.querySelectorAll('[data-pdxdb-pin-empty]');
    for (var pe = 0; pe < pes.length; pe++) {
      var peOn = pes[pe].getAttribute('data-pdxdb-pin-empty') === _view.pin;
      pes[pe].hidden = !peOn;
      if (peOn) any = true;
    }
    var groups = el.querySelectorAll('[data-pdxdb-group]');
    for (var g = 0; g < groups.length; g++) {
      var key = groups[g].getAttribute('data-pdxdb-group') || '';
      var rows = groups[g].querySelectorAll('[data-pdxdb-find]');
      var hits = 0;
      var opened = aliasOpens(key, q);
      for (var r = 0; r < rows.length; r++) {
        var hit = _view.type !== 'mandates' && timeOk(rows[r].getAttribute('data-pdxdb-time') || '') &&
          (opened || matches(rows[r].getAttribute('data-pdxdb-find') || '', q));
        if (hit) hits++;
        rows[r].hidden = !hit;
      }
      var st = groupState(key, hits, stance);
      groups[g].hidden = !st.shown;
      syncGroup(groups[g], st.open);
      if (st.shown) any = true;
    }
    // Parents follow their children: shown when any child group is shown.
    var pars = el.querySelectorAll('[data-pdxdb-parent]');
    for (var p = 0; p < pars.length; p++) {
      var kids = fn(pars[p].querySelectorAll) ? pars[p].querySelectorAll('[data-pdxdb-group]') : [];
      var anyKid = false, anyKidOpen = false;
      for (var k = 0; k < kids.length; k++) {
        if (!kids[k].hidden) anyKid = true;
        if (!kids[k].hidden && kids[k].open) anyKidOpen = true;
      }
      var ps = parentState(pars[p].getAttribute('data-pdxdb-parent') || '', anyKid, anyKidOpen);
      pars[p].hidden = !ps.shown;
      syncParent(pars[p], ps.open);
    }
    var mb = el.querySelectorAll('[data-pdxdb-mandates]');
    for (var b = 0; b < mb.length; b++) {
      var mr = mb[b].querySelectorAll('[data-pdxdb-find]');
      var mh = 0;
      for (var x = 0; x < mr.length; x++) {
        var mhit = _view.type !== 'topics' && timeOk(mr[x].getAttribute('data-pdxdb-time') || '') &&
          matches(mr[x].getAttribute('data-pdxdb-find') || '', q);
        if (mhit) mh++;
        mr[x].hidden = !mhit;
      }
      var ms = mandateState(mh);
      mb[b].hidden = !ms.shown;
      if (ms.shown) any = true;
    }
    var none = el.querySelector('[data-pdxdb-find-none]');
    if (none) none.hidden = any;
    var door = el.querySelector('[data-pdxdb-find-door]');
    if (door) door.hidden = any;
    // The toggle buttons say which is pressed.
    var tgs = el.querySelectorAll('[' + TG_TYPE + '],[' + TG_TIME + ']');
    for (var tg = 0; tg < tgs.length; tg++) {
      var isType = tgs[tg].hasAttribute(TG_TYPE);
      var v = tgs[tg].getAttribute(isType ? TG_TYPE : TG_TIME) || '';
      tgs[tg].setAttribute('aria-pressed', v === (isType ? _view.type : _view.time) ? 'true' : 'false');
    }
    // The pinned strip follows the toggles (never the search or the chips).
    var strips = el.querySelectorAll('[data-pdxdb-pinned]');
    for (var sp = 0; sp < strips.length; sp++) {
      var pins = strips[sp].querySelectorAll('[data-pdxdb-pin-mandate],[data-pdxdb-pin-issue]');
      var anyPin = false;
      for (var pn = 0; pn < pins.length; pn++) {
        var pv = pins[pn].hasAttribute('data-pdxdb-pin-mandate')
          ? pinMandateShown()
          : pinIssueShown(pins[pn].getAttribute('data-pdxdb-pin-times') || '');
        pins[pn].hidden = !pv;
        if (pv) anyPin = true;
      }
      strips[sp].hidden = !anyPin;
    }
  }

  // Public setters, for the controls and for the suite. Each re-applies to the
  // mounted board if there is one.
  function setCategory(key) {
    _view.cat = String(key == null ? '' : key);
    _view.pin = '';   // a chip and a pin are one choice: picking one clears the other
    applyView(_el);
  }
  // A Utah pin. Pressing the pressed pin again clears it; an unknown id is none.
  function setPin(id) {
    id = String(id == null ? '' : id);
    _view.pin = (id && pinById(id) && id !== _view.pin) ? id : '';
    if (_view.pin) _view.cat = '';
    applyView(_el);
  }
  function setQuery(q) {
    _view.q = String(q == null ? '' : q);
    applyView(_el);
  }
  // The toggles. Anything but a known value is All.
  function setType(v) {
    v = String(v == null ? '' : v);
    _view.type = (v === 'topics' || v === 'mandates') ? v : '';
    applyView(_el);
  }
  function setTime(v) {
    v = String(v == null ? '' : v);
    _view.time = (v === 'current' || v === 'past') ? v : '';
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
      var utp = t && fn(t.closest) ? t.closest('[data-pdxdb-utpin]') : null;
      if (utp) { setPin(utp.getAttribute('data-pdxdb-utpin') || ''); return; }
      var chip = t && fn(t.closest) ? t.closest('[data-pdxdb-cat]') : null;
      if (chip) { setCategory(chip.getAttribute('data-pdxdb-cat') || ''); return; }
      var tgy = t && fn(t.closest) ? t.closest('[' + TG_TYPE + ']') : null;
      if (tgy) { setType(tgy.getAttribute(TG_TYPE) || ''); return; }
      var tgt = t && fn(t.closest) ? t.closest('[' + TG_TIME + ']') : null;
      if (tgt) { setTime(tgt.getAttribute(TG_TIME) || ''); return; }
      // A header opened or closed by hand is remembered for the next repaint —
      // only while no search is forcing groups open.
      var psum = t && fn(t.closest) ? t.closest('.pdxdb-parent-h') : null;
      if (psum && !normQuery(_view.q) && !_view.cat && !_view.pin) {
        var pd = psum.parentNode;
        if (pd && pd.getAttribute) _view.open[PARENT_PREFIX + (pd.getAttribute('data-pdxdb-parent') || '')] = !pd.open;
        return;
      }
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
    // A header opened or closed by hand: the <details> moved, so the header's
    // class, aria-expanded and the body follow it. `toggle` does not bubble.
    el.addEventListener('toggle', function (ev) {
      var d = ev && ev.target;
      if (d && d.hasAttribute && d.hasAttribute('data-pdxdb-group')) syncGroup(d, !!d.open);
      else if (d && d.hasAttribute && d.hasAttribute('data-pdxdb-parent')) syncParent(d, !!d.open);
    }, true);
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
        ' data-pdxdb-find="' + esc(findText(item)) + '" data-pdxdb-time="' + esc(sitOf(item)) + '"' +
        (hidden ? ' hidden' : '') + '>' +
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

  // ── THE READ-ONLY LINE ────────────────────────────────────────────────────
  // What a board with no composer host prints where a composer would sit: one
  // sentence, no field, no form, no handler. See the header.
  function readOnlyHtml() {
    return '<p class="pdxdb-readonly" data-pdxdb-readonly="1">' + esc(COPY.readOnlyLine) + '</p>';
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

  // THE MANDATE READ, on the composer boards only. The same store and the same
  // endpoint /mandate reads (/api/mandate-proposals), asked for the rows that
  // name this seat or its sitting member. Nothing is written. A read that fails
  // resolves to no rows: a mandate row is an addition to band 3, not one of its
  // three answers, so a failed read leaves the band exactly as it was rather
  // than printing a claim about the Mandate it could not check.
  var MANDATE_API = '/api/mandate-proposals';
  function fetchMandates() {
    try {
      if (!composerBoard()) return Promise.resolve([]);
      var pid = PID();
      var url = MANDATE_API + '?seat=' + encodeURIComponent(ALIAS()) +
        (pid ? '&member=' + encodeURIComponent(pid) : '');
      return fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('mandate-proposals ' + r.status);
          return r.json();
        })
        .then(function (data) {
          return (data && Array.isArray(data.proposals)) ? data.proposals : [];
        })
        .catch(function () { return []; });
    } catch (e) {
      return Promise.resolve([]);
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
  var _mandates = [];   // the mandate rows that name this seat (composer boards only)
  var _mandateMember = null; // the member the mandate read was asked with

  // ── THE ONE BOARD THAT TAKES A VOICE ──────────────────────────────────────
  // district-composer.js owns the composer on every board whose document
  // carries its host. Where the host exists this module leaves the posting slot to
  // it; everywhere else the board prints the read-only line and no field.
  function composerOwned() {
    try { return !!(typeof document !== 'undefined' && document.getElementById('pdx-district-composer')); }
    catch (e) { return false; }
  }

  // ── WHICH BOARDS GET THE COMPOSER LAYOUT ─────────────────────────────────
  // Band 3's composer-board layout (parent categories, collapsed groups, the
  // finder above the chips, the mandate rows) is decided by the SEAT, not only
  // by whether the composer's host happened to be found at paint time: a board
  // whose own seat declaration (host attribute, then the document's) names one
  // of the composer seats paints that layout, and so does any document
  // carrying the composer host. The list is district-composer.js's
  // COMPOSER_SEATS, same aliases; scripts/test-district-board-force-parents.mjs
  // holds the two copies equal. ACTIVE's default is NOT consulted: a document
  // that declares no seat is not a composer board. DERIVED from the
  // `composer: true` rows of BOARDS rather than written out a second time, the
  // same way BOARD_SEATS is.
  var COMPOSER_SEATS = {};
  (function () {
    for (var k in BOARDS) {
      if (Object.prototype.hasOwnProperty.call(BOARDS, k) && BOARDS[k].composer) COMPOSER_SEATS[BOARDS[k].alias] = 1;
    }
  })();
  function composerSeatDeclared() {
    var b = board(hostSeat(_el)) || board(docSeat());
    return !!(b && Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, b.alias));
  }
  function composerBoard() {
    return composerOwned() || composerSeatDeclared();
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
    loadMandates(el);
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
            // A member who resolved late is a member the mandate read did not
            // ask about; ask again, once, with them.
            if (composerBoard() && PID() !== _mandateMember) loadMandates(el);
            paint(el);
          } catch (e) {}
        });
      }
    } catch (e) {}
    return true;
  }

  // ── THE HEADING NAMES THE HOLDER, AND THE NAME IS THE DOOR ────────────────
  // "Utah House District 16 · Trevor Lee", with only the name a link to that
  // person's file, and under it one small "Current holder · Trevor Lee" chip to
  // the same address. The pid is pidOf()'s — who sits in the seat today, the
  // same answer band 1 prints — so a prior holder is never named here. The name
  // is the roster's: pdxRosterName() where the resolver is on the document,
  // weighing the CMP_DATA row band 1 already reads, and that row's own name
  // where it is not. '' is an answer: no name, no link, no chip, and the
  // heading stays exactly as the document served it. Never the pid as a label.
  function holderName(pid) {
    var id = String(pid || '');
    if (!id) return '';
    var row = null;
    try { row = (window.CMP_DATA && window.CMP_DATA[id]) || null; } catch (e) { row = null; }
    try {
      if (fn(window.pdxRosterName)) return String(window.pdxRosterName(id, row) || '').trim();
    } catch (e2) {}
    var n = (row && row.name != null) ? String(row.name).trim() : '';
    return n === id ? '' : n;
  }
  // The seat half of the heading: the board's own h1 with any " · <name>" it
  // already carries taken off, so a statewide heading is not named twice.
  function headingSeat(b) {
    return String((b && b.h1) || '').split(' \u00b7 ')[0].trim();
  }
  function personHref(pid) { return '/p/' + encodeURIComponent(String(pid)); }
  // The heading's markup, or '' when the roster cannot name the holder — in
  // which case the served heading is left untouched.
  function headingHtml(b) {
    var row = b || ACTIVE;
    var pid = pidOf(row);
    var name = holderName(pid);
    var seat = headingSeat(row);
    if (!pid || !name || !seat) return '';
    return esc(seat) + ' \u00b7 <a class="pdxdb-h1-name" href="' + esc(personHref(pid)) + '">' + esc(name) + '</a>';
  }
  function holderChipHtml(b) {
    var pid = pidOf(b || ACTIVE);
    var name = holderName(pid);
    if (!pid || !name) return '';
    return '<a class="pdxdb-holder-a" href="' + esc(personHref(pid)) + '">' +
      esc('Current holder \u00b7 ' + name) + '</a>';
  }
  var HOLDER_ID = 'pdx-db-holder';
  var _servedH1 = null;
  function paintHeading() {
    try {
      if (typeof document === 'undefined' || !fn(document.querySelector)) return;
      var h1 = document.querySelector('.pdxdb-h1');
      if (!h1) return;
      if (_servedH1 === null) _servedH1 = String(h1.innerHTML);
      var head = headingHtml(ACTIVE);
      var chip = head ? holderChipHtml(ACTIVE) : '';
      var want = head || _servedH1;
      if (h1.innerHTML !== want) h1.innerHTML = want;
      var host = fn(document.getElementById) ? document.getElementById(HOLDER_ID) : null;
      if (chip) {
        if (!host && fn(h1.insertAdjacentHTML)) {
          h1.insertAdjacentHTML('afterend', '<p class="pdxdb-holder" id="' + HOLDER_ID + '"></p>');
          host = document.getElementById(HOLDER_ID);
        }
        if (host && host.innerHTML !== chip) host.innerHTML = chip;
      } else if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }
    } catch (e) {}
  }

  function loadMandates(el) {
    if (!composerBoard()) return;
    _mandateMember = PID();
    fetchMandates().then(function (d) { _mandates = mandateRows(d); paint(el); });
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
    paintHeading();
    wireTable(el);
    // A repaint rebuilds the search field; if the reader was typing in it,
    // hand the caret back rather than dropping their focus mid-word.
    var typing = false;
    try { typing = !!(document.activeElement && document.activeElement.hasAttribute &&
      document.activeElement.hasAttribute('data-pdxdb-search') && el.contains && el.contains(document.activeElement)); } catch (e) {}
    el.innerHTML =
      purposeHtml() +
      seatHtml() +
      generalSlotHtml() +
      roomHtml(cState, _counts === FAILED ? null : _counts) +
      tableHtml(tState, items, rooms, _mandates) +
      stanceHtml(issues) +
      (composerOwned() ? '' : readOnlyHtml());
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
  // UTAH'S ROWS ONLY. That table is Utah's four districts keyed by number and
  // carries no state, so asked for another state's district 2 it would answer
  // Utah's member; every other state's congressional row asks the join or no one.
  function memberOf(b) {
    var p = pidOf(b);
    if (p || !b || !b.usHouse || fn(window._pdxUsHouseSeat)) return p;
    if (b.usHouse.state !== 'Utah') return '';
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

  // EVERY BOARD THIS PID HOLDS NOW, in the table's order, one per address.
  // boardForPid() answers the first; a member who holds more than one boarded
  // seat gets a general-thread door for each. Only the CURRENT holder matches —
  // memberOf() is who sits in the seat today, so a prior holder's file gets
  // nothing here even though their read-only thread still exists on the board.
  function boardsForPid(pid) {
    var want = String(pid || '');
    var out = [];
    if (!want) return out;
    var seen = {};
    for (var k in BOARDS) {
      if (!Object.prototype.hasOwnProperty.call(BOARDS, k)) continue;
      var b = BOARDS[k];
      if (!b || !b.route || seen[b.route]) continue;
      if (memberOf(b) !== want) continue;
      seen[b.route] = 1;
      out.push(b);
    }
    return out;
  }

  // ── "General thread · <district>" ON THE PERSON FILE ──────────────────────
  // The door straight into this person's general section on the board of each
  // seat they hold: the board's own route, ?general=<pid> (district-composer.js's
  // one parameter for opening a holder's thread) and the general room's anchor.
  // No count, no composer, no preview — just the door. A statewide board's
  // heading already carries the member ("Governor · Spencer Cox"), so the line
  // names the office alone rather than the person twice.
  function generalLabel(b) {
    var h = String((b && b.h1) || '').trim();
    if (b && b.statewide) h = h.split(' \u00b7 ')[0].trim();
    return h;
  }
  function generalHref(b, pid) {
    return b.route + '?general=' + encodeURIComponent(String(pid)) + '#' + GENERAL_ROOM_ID;
  }
  function generalLinksHtml(pid) {
    var id = String(pid || '');
    var rows = boardsForPid(id).map(function (b) {
      var label = generalLabel(b);
      if (!label) return '';
      return '<a class="pf-kick-general" href="' + esc(generalHref(b, id)) + '"' +
        ' data-pdxdb-general-for="' + esc(b.alias) + '">' +
        esc('General thread \u00b7 ' + label) + '</a>';
    }).filter(Boolean);
    if (!rows.length) return '';
    return '<span class="pf-kick-generals">' + rows.join('') + '</span>';
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
    boardsForPid: boardsForPid,
    generalLinksHtml: generalLinksHtml,
    holderName: holderName,
    headingHtml: headingHtml,
    holderChipHtml: holderChipHtml,
    // Exposed for the suite: each band's markup asserted directly against a
    // payload, rather than inferred from a live fetch.
    purposeHtml: purposeHtml,
    seatHtml: seatHtml,
    roomHtml: roomHtml,
    tableHtml: tableHtml,
    UTAH_PINS: UTAH_PINS,
    pinsFor: pinsFor,
    setPin: setPin,
    stanceHtml: stanceHtml,
    stanceDoor: stanceDoor,
    readOnlyHtml: readOnlyHtml,
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
    _mandateRows: mandateRows,
    _parentsOf: parentsOf,
    // The in-place filter, for the suite: applies the current view to a
    // painted band without re-rendering it.
    _applyView: applyView,
    // The everyday-words pass of the finder, and the door under its miss line.
    FIND_ALIASES: FIND_ALIASES,
    _aliasKeys: aliasKeys,
    _generalDoorHtml: generalDoorHtml,
    generalSlotHtml: generalSlotHtml,
    GENERAL_ROOM_ID: GENERAL_ROOM_ID,
    COMPOSER_SEATS: COMPOSER_SEATS,
    composerBoard: function () { return composerBoard(); },
    MANDATE_KEY: MANDATE_KEY,
    mandates: function () { return _mandates.slice(); },
    // THE READER'S VIEW OF BAND 3: a category chip ('' is All), a search, and
    // the Type and Time toggles ('' is All).
    setCategory: setCategory,
    setQuery: setQuery,
    setType: setType,
    setTime: setTime,
    view: function () { return { cat: _view.cat, q: _view.q, type: _view.type, time: _view.time }; },
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
