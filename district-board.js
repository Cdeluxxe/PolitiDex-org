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
    'co-house-1': { seat: 'co-house-1', composer: false, alias: 'co-cd-1', route: '/district/co-cd-1', pid: '', usHouse: { state: 'Colorado', district: 1 }, h1: 'Colorado’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-1 district board', kickTitle: 'The district board for Colorado’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-2': { seat: 'co-house-2', composer: false, alias: 'co-cd-2', route: '/district/co-cd-2', pid: '', usHouse: { state: 'Colorado', district: 2 }, h1: 'Colorado’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-2 district board', kickTitle: 'The district board for Colorado’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-3': { seat: 'co-house-3', composer: true, alias: 'co-cd-3', route: '/district/co-cd-3', pid: '', usHouse: { state: 'Colorado', district: 3 }, h1: 'Colorado’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-3 district board', kickTitle: 'The district board for Colorado’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-house-4': { seat: 'co-house-4', composer: false, alias: 'co-cd-4', route: '/district/co-cd-4', pid: '', usHouse: { state: 'Colorado', district: 4 }, h1: 'Colorado’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'CO-4 district board', kickTitle: 'The district board for Colorado’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
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
    'me-house-1': { seat: 'me-house-1', composer: false, alias: 'me-cd-1', route: '/district/me-cd-1', pid: '', usHouse: { state: 'Maine', district: 1 }, h1: 'Maine’s 1st Congressional District', where: 'The district as the current congressional map draws it', kick: 'ME-1 district board', kickTitle: 'The district board for Maine’s 1st Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-house-2': { seat: 'me-house-2', composer: false, alias: 'me-cd-2', route: '/district/me-cd-2', pid: '', usHouse: { state: 'Maine', district: 2 }, h1: 'Maine’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'ME-2 district board', kickTitle: 'The district board for Maine’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
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
    'mn-house-2': { seat: 'mn-house-2', composer: false, alias: 'mn-cd-2', route: '/district/mn-cd-2', pid: '', usHouse: { state: 'Minnesota', district: 2 }, h1: 'Minnesota’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-2 district board', kickTitle: 'The district board for Minnesota’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-3': { seat: 'mn-house-3', composer: true, alias: 'mn-cd-3', route: '/district/mn-cd-3', pid: '', usHouse: { state: 'Minnesota', district: 3 }, h1: 'Minnesota’s 3rd Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-3 district board', kickTitle: 'The district board for Minnesota’s 3rd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-4': { seat: 'mn-house-4', composer: true, alias: 'mn-cd-4', route: '/district/mn-cd-4', pid: '', usHouse: { state: 'Minnesota', district: 4 }, h1: 'Minnesota’s 4th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-4 district board', kickTitle: 'The district board for Minnesota’s 4th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-5': { seat: 'mn-house-5', composer: false, alias: 'mn-cd-5', route: '/district/mn-cd-5', pid: '', usHouse: { state: 'Minnesota', district: 5 }, h1: 'Minnesota’s 5th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-5 district board', kickTitle: 'The district board for Minnesota’s 5th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-house-6': { seat: 'mn-house-6', composer: false, alias: 'mn-cd-6', route: '/district/mn-cd-6', pid: '', usHouse: { state: 'Minnesota', district: 6 }, h1: 'Minnesota’s 6th Congressional District', where: 'The district as the current congressional map draws it', kick: 'MN-6 district board', kickTitle: 'The district board for Minnesota’s 6th Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
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
    'ne-house-2': { seat: 'ne-house-2', composer: false, alias: 'ne-cd-2', route: '/district/ne-cd-2', pid: '', usHouse: { state: 'Nebraska', district: 2 }, h1: 'Nebraska’s 2nd Congressional District', where: 'The district as the current congressional map draws it', kick: 'NE-2 district board', kickTitle: 'The district board for Nebraska’s 2nd Congressional District: who is in the room and what is on the table. A place, not a scorecard.' },
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
    'ak-gov': { seat: 'ak-gov', composer: false, alias: 'ak-gov', route: '/district/ak-gov', pid: 'dunleavy', statewide: true, h1: 'Governor · Mike Dunleavy', where: 'Statewide · the whole State of Alaska', kick: 'Governor board', kickTitle: 'The board for Governor · Mike Dunleavy: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-gov': { seat: 'co-gov', composer: false, alias: 'co-gov', route: '/district/co-gov', pid: 'jared_polis', statewide: true, h1: 'Governor · Jared Polis', where: 'Statewide · the whole State of Colorado', kick: 'Governor board', kickTitle: 'The board for Governor · Jared Polis: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-gov': { seat: 'id-gov', composer: false, alias: 'id-gov', route: '/district/id-gov', pid: 'brad_little', statewide: true, h1: 'Governor · Brad Little', where: 'Statewide · the whole State of Idaho', kick: 'Governor board', kickTitle: 'The board for Governor · Brad Little: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-gov': { seat: 'me-gov', composer: false, alias: 'me-gov', route: '/district/me-gov', pid: 'janet_mills', statewide: true, h1: 'Governor · Janet Mills', where: 'Statewide · the whole State of Maine', kick: 'Governor board', kickTitle: 'The board for Governor · Janet Mills: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-gov': { seat: 'mn-gov', composer: false, alias: 'mn-gov', route: '/district/mn-gov', pid: 'tim_walz', statewide: true, h1: 'Governor · Tim Walz', where: 'Statewide · the whole State of Minnesota', kick: 'Governor board', kickTitle: 'The board for Governor · Tim Walz: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-gov': { seat: 'mt-gov', composer: false, alias: 'mt-gov', route: '/district/mt-gov', pid: 'greg_gianforte', statewide: true, h1: 'Governor · Greg Gianforte', where: 'Statewide · the whole State of Montana', kick: 'Governor board', kickTitle: 'The board for Governor · Greg Gianforte: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-gov': { seat: 'ne-gov', composer: false, alias: 'ne-gov', route: '/district/ne-gov', pid: 'jim_pillen', statewide: true, h1: 'Governor · Jim Pillen', where: 'Statewide · the whole State of Nebraska', kick: 'Governor board', kickTitle: 'The board for Governor · Jim Pillen: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-gov': { seat: 'nv-gov', composer: false, alias: 'nv-gov', route: '/district/nv-gov', pid: 'joe_lombardo', statewide: true, h1: 'Governor · Joe Lombardo', where: 'Statewide · the whole State of Nevada', kick: 'Governor board', kickTitle: 'The board for Governor · Joe Lombardo: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-gov': { seat: 'ri-gov', composer: false, alias: 'ri-gov', route: '/district/ri-gov', pid: 'dan_mckee', statewide: true, h1: 'Governor · Dan McKee', where: 'Statewide · the whole State of Rhode Island', kick: 'Governor board', kickTitle: 'The board for Governor · Dan McKee: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-gov': { seat: 'sd-gov', composer: false, alias: 'sd-gov', route: '/district/sd-gov', pid: 'larry_rhoden', statewide: true, h1: 'Governor · Larry Rhoden', where: 'Statewide · the whole State of South Dakota', kick: 'Governor board', kickTitle: 'The board for Governor · Larry Rhoden: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-1': { seat: 'ak-statehouse-1', composer: false, alias: 'ak-hd-1', route: '/district/ak-hd-1', pid: 'bynum_ak', h1: 'Alaska House District 1', where: 'District 1 as Alaska’s current legislative plan draws it', kick: 'House District 1 board', kickTitle: 'The district board for Alaska House District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-10': { seat: 'ak-statehouse-10', composer: false, alias: 'ak-hd-10', route: '/district/ak-hd-10', pid: 'kopp_ak', h1: 'Alaska House District 10', where: 'District 10 as Alaska’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Alaska House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-11': { seat: 'ak-statehouse-11', composer: false, alias: 'ak-hd-11', route: '/district/ak-hd-11', pid: 'coulombe_ak', h1: 'Alaska House District 11', where: 'District 11 as Alaska’s current legislative plan draws it', kick: 'House District 11 board', kickTitle: 'The district board for Alaska House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-12': { seat: 'ak-statehouse-12', composer: false, alias: 'ak-hd-12', route: '/district/ak-hd-12', pid: 'schrage_ak', h1: 'Alaska House District 12', where: 'District 12 as Alaska’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Alaska House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-13': { seat: 'ak-statehouse-13', composer: false, alias: 'ak-hd-13', route: '/district/ak-hd-13', pid: 'josephson_ak', h1: 'Alaska House District 13', where: 'District 13 as Alaska’s current legislative plan draws it', kick: 'House District 13 board', kickTitle: 'The district board for Alaska House District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-14': { seat: 'ak-statehouse-14', composer: false, alias: 'ak-hd-14', route: '/district/ak-hd-14', pid: 'galvin_ak', h1: 'Alaska House District 14', where: 'District 14 as Alaska’s current legislative plan draws it', kick: 'House District 14 board', kickTitle: 'The district board for Alaska House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-15': { seat: 'ak-statehouse-15', composer: false, alias: 'ak-hd-15', route: '/district/ak-hd-15', pid: 'costello_ak', h1: 'Alaska House District 15', where: 'District 15 as Alaska’s current legislative plan draws it', kick: 'House District 15 board', kickTitle: 'The district board for Alaska House District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-16': { seat: 'ak-statehouse-16', composer: false, alias: 'ak-hd-16', route: '/district/ak-hd-16', pid: 'hall_ak', h1: 'Alaska House District 16', where: 'District 16 as Alaska’s current legislative plan draws it', kick: 'House District 16 board', kickTitle: 'The district board for Alaska House District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-17': { seat: 'ak-statehouse-17', composer: false, alias: 'ak-hd-17', route: '/district/ak-hd-17', pid: 'fields_ak', h1: 'Alaska House District 17', where: 'District 17 as Alaska’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Alaska House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-18': { seat: 'ak-statehouse-18', composer: false, alias: 'ak-hd-18', route: '/district/ak-hd-18', pid: 'nelson_ak', h1: 'Alaska House District 18', where: 'District 18 as Alaska’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Alaska House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-19': { seat: 'ak-statehouse-19', composer: false, alias: 'ak-hd-19', route: '/district/ak-hd-19', pid: 'mina_ak', h1: 'Alaska House District 19', where: 'District 19 as Alaska’s current legislative plan draws it', kick: 'House District 19 board', kickTitle: 'The district board for Alaska House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-2': { seat: 'ak-statehouse-2', composer: false, alias: 'ak-hd-2', route: '/district/ak-hd-2', pid: 'himschoot_ak', h1: 'Alaska House District 2', where: 'District 2 as Alaska’s current legislative plan draws it', kick: 'House District 2 board', kickTitle: 'The district board for Alaska House District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-20': { seat: 'ak-statehouse-20', composer: false, alias: 'ak-hd-20', route: '/district/ak-hd-20', pid: 'gray_ak', h1: 'Alaska House District 20', where: 'District 20 as Alaska’s current legislative plan draws it', kick: 'House District 20 board', kickTitle: 'The district board for Alaska House District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-21': { seat: 'ak-statehouse-21', composer: false, alias: 'ak-hd-21', route: '/district/ak-hd-21', pid: 'mears_ak', h1: 'Alaska House District 21', where: 'District 21 as Alaska’s current legislative plan draws it', kick: 'House District 21 board', kickTitle: 'The district board for Alaska House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-22': { seat: 'ak-statehouse-22', composer: false, alias: 'ak-hd-22', route: '/district/ak-hd-22', pid: 'eischeid_ak', h1: 'Alaska House District 22', where: 'District 22 as Alaska’s current legislative plan draws it', kick: 'House District 22 board', kickTitle: 'The district board for Alaska House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-23': { seat: 'ak-statehouse-23', composer: false, alias: 'ak-hd-23', route: '/district/ak-hd-23', pid: 'allard_ak', h1: 'Alaska House District 23', where: 'District 23 as Alaska’s current legislative plan draws it', kick: 'House District 23 board', kickTitle: 'The district board for Alaska House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-24': { seat: 'ak-statehouse-24', composer: false, alias: 'ak-hd-24', route: '/district/ak-hd-24', pid: 'saddler_ak', h1: 'Alaska House District 24', where: 'District 24 as Alaska’s current legislative plan draws it', kick: 'House District 24 board', kickTitle: 'The district board for Alaska House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-25': { seat: 'ak-statehouse-25', composer: false, alias: 'ak-hd-25', route: '/district/ak-hd-25', pid: 'johnson_ak', h1: 'Alaska House District 25', where: 'District 25 as Alaska’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for Alaska House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-26': { seat: 'ak-statehouse-26', composer: false, alias: 'ak-hd-26', route: '/district/ak-hd-26', pid: 'st_clair_ak', h1: 'Alaska House District 26', where: 'District 26 as Alaska’s current legislative plan draws it', kick: 'House District 26 board', kickTitle: 'The district board for Alaska House District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-27': { seat: 'ak-statehouse-27', composer: false, alias: 'ak-hd-27', route: '/district/ak-hd-27', pid: 'underwood_ak', h1: 'Alaska House District 27', where: 'District 27 as Alaska’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Alaska House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-28': { seat: 'ak-statehouse-28', composer: false, alias: 'ak-hd-28', route: '/district/ak-hd-28', pid: 'moore_ak', h1: 'Alaska House District 28', where: 'District 28 as Alaska’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Alaska House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-29': { seat: 'ak-statehouse-29', composer: false, alias: 'ak-hd-29', route: '/district/ak-hd-29', pid: 'garret_nelson_ak', h1: 'Alaska House District 29', where: 'District 29 as Alaska’s current legislative plan draws it', kick: 'House District 29 board', kickTitle: 'The district board for Alaska House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-3': { seat: 'ak-statehouse-3', composer: false, alias: 'ak-hd-3', route: '/district/ak-hd-3', pid: 'story_ak', h1: 'Alaska House District 3', where: 'District 3 as Alaska’s current legislative plan draws it', kick: 'House District 3 board', kickTitle: 'The district board for Alaska House District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-30': { seat: 'ak-statehouse-30', composer: false, alias: 'ak-hd-30', route: '/district/ak-hd-30', pid: 'mccabe_ak', h1: 'Alaska House District 30', where: 'District 30 as Alaska’s current legislative plan draws it', kick: 'House District 30 board', kickTitle: 'The district board for Alaska House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-31': { seat: 'ak-statehouse-31', composer: false, alias: 'ak-hd-31', route: '/district/ak-hd-31', pid: 'dibert_ak', h1: 'Alaska House District 31', where: 'District 31 as Alaska’s current legislative plan draws it', kick: 'House District 31 board', kickTitle: 'The district board for Alaska House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-32': { seat: 'ak-statehouse-32', composer: false, alias: 'ak-hd-32', route: '/district/ak-hd-32', pid: 'stapp_ak', h1: 'Alaska House District 32', where: 'District 32 as Alaska’s current legislative plan draws it', kick: 'House District 32 board', kickTitle: 'The district board for Alaska House District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-33': { seat: 'ak-statehouse-33', composer: false, alias: 'ak-hd-33', route: '/district/ak-hd-33', pid: 'prax_ak', h1: 'Alaska House District 33', where: 'District 33 as Alaska’s current legislative plan draws it', kick: 'House District 33 board', kickTitle: 'The district board for Alaska House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-34': { seat: 'ak-statehouse-34', composer: false, alias: 'ak-hd-34', route: '/district/ak-hd-34', pid: 'tomaszewski_ak', h1: 'Alaska House District 34', where: 'District 34 as Alaska’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Alaska House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-35': { seat: 'ak-statehouse-35', composer: false, alias: 'ak-hd-35', route: '/district/ak-hd-35', pid: 'carrick_ak', h1: 'Alaska House District 35', where: 'District 35 as Alaska’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Alaska House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-36': { seat: 'ak-statehouse-36', composer: false, alias: 'ak-hd-36', route: '/district/ak-hd-36', pid: 'schwanke_ak', h1: 'Alaska House District 36', where: 'District 36 as Alaska’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Alaska House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-37': { seat: 'ak-statehouse-37', composer: false, alias: 'ak-hd-37', route: '/district/ak-hd-37', pid: 'edgmon_ak', h1: 'Alaska House District 37', where: 'District 37 as Alaska’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Alaska House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-38': { seat: 'ak-statehouse-38', composer: false, alias: 'ak-hd-38', route: '/district/ak-hd-38', pid: 'jimmie_ak', h1: 'Alaska House District 38', where: 'District 38 as Alaska’s current legislative plan draws it', kick: 'House District 38 board', kickTitle: 'The district board for Alaska House District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-39': { seat: 'ak-statehouse-39', composer: false, alias: 'ak-hd-39', route: '/district/ak-hd-39', pid: 'foster_ak', h1: 'Alaska House District 39', where: 'District 39 as Alaska’s current legislative plan draws it', kick: 'House District 39 board', kickTitle: 'The district board for Alaska House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-4': { seat: 'ak-statehouse-4', composer: false, alias: 'ak-hd-4', route: '/district/ak-hd-4', pid: 'hannan_ak', h1: 'Alaska House District 4', where: 'District 4 as Alaska’s current legislative plan draws it', kick: 'House District 4 board', kickTitle: 'The district board for Alaska House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-40': { seat: 'ak-statehouse-40', composer: false, alias: 'ak-hd-40', route: '/district/ak-hd-40', pid: 'frier_ak', h1: 'Alaska House District 40', where: 'District 40 as Alaska’s current legislative plan draws it', kick: 'House District 40 board', kickTitle: 'The district board for Alaska House District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-5': { seat: 'ak-statehouse-5', composer: false, alias: 'ak-hd-5', route: '/district/ak-hd-5', pid: 'stutes_ak', h1: 'Alaska House District 5', where: 'District 5 as Alaska’s current legislative plan draws it', kick: 'House District 5 board', kickTitle: 'The district board for Alaska House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-6': { seat: 'ak-statehouse-6', composer: false, alias: 'ak-hd-6', route: '/district/ak-hd-6', pid: 'vance_ak', h1: 'Alaska House District 6', where: 'District 6 as Alaska’s current legislative plan draws it', kick: 'House District 6 board', kickTitle: 'The district board for Alaska House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-7': { seat: 'ak-statehouse-7', composer: false, alias: 'ak-hd-7', route: '/district/ak-hd-7', pid: 'ruffridge_ak', h1: 'Alaska House District 7', where: 'District 7 as Alaska’s current legislative plan draws it', kick: 'House District 7 board', kickTitle: 'The district board for Alaska House District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-8': { seat: 'ak-statehouse-8', composer: false, alias: 'ak-hd-8', route: '/district/ak-hd-8', pid: 'elam_ak', h1: 'Alaska House District 8', where: 'District 8 as Alaska’s current legislative plan draws it', kick: 'House District 8 board', kickTitle: 'The district board for Alaska House District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statehouse-9': { seat: 'ak-statehouse-9', composer: false, alias: 'ak-hd-9', route: '/district/ak-hd-9', pid: 'holland_ak', h1: 'Alaska House District 9', where: 'District 9 as Alaska’s current legislative plan draws it', kick: 'House District 9 board', kickTitle: 'The district board for Alaska House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-1': { seat: 'ak-statesenate-1', composer: false, alias: 'ak-sd-1', route: '/district/ak-sd-1', pid: 'bert_stedman', h1: 'Alaska Senate District A', where: 'District A as Alaska’s current legislative plan draws it', kick: 'Senate District A board', kickTitle: 'The district board for Alaska Senate District A: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-2': { seat: 'ak-statesenate-2', composer: false, alias: 'ak-sd-2', route: '/district/ak-sd-2', pid: 'kiehl_ak', h1: 'Alaska Senate District B', where: 'District B as Alaska’s current legislative plan draws it', kick: 'Senate District B board', kickTitle: 'The district board for Alaska Senate District B: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-3': { seat: 'ak-statesenate-3', composer: false, alias: 'ak-sd-3', route: '/district/ak-sd-3', pid: 'gary_stevens', h1: 'Alaska Senate District C', where: 'District C as Alaska’s current legislative plan draws it', kick: 'Senate District C board', kickTitle: 'The district board for Alaska Senate District C: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-4': { seat: 'ak-statesenate-4', composer: false, alias: 'ak-sd-4', route: '/district/ak-sd-4', pid: 'bjorkman_ak', h1: 'Alaska Senate District D', where: 'District D as Alaska’s current legislative plan draws it', kick: 'Senate District D board', kickTitle: 'The district board for Alaska Senate District D: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-5': { seat: 'ak-statesenate-5', composer: false, alias: 'ak-sd-5', route: '/district/ak-sd-5', pid: 'cathy_giessel', h1: 'Alaska Senate District E', where: 'District E as Alaska’s current legislative plan draws it', kick: 'Senate District E board', kickTitle: 'The district board for Alaska Senate District E: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-6': { seat: 'ak-statesenate-6', composer: false, alias: 'ak-sd-6', route: '/district/ak-sd-6', pid: 'kaufman_ak', h1: 'Alaska Senate District F', where: 'District F as Alaska’s current legislative plan draws it', kick: 'Senate District F board', kickTitle: 'The district board for Alaska Senate District F: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-7': { seat: 'ak-statesenate-7', composer: false, alias: 'ak-sd-7', route: '/district/ak-sd-7', pid: 'gray_jackson_ak', h1: 'Alaska Senate District G', where: 'District G as Alaska’s current legislative plan draws it', kick: 'Senate District G board', kickTitle: 'The district board for Alaska Senate District G: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-8': { seat: 'ak-statesenate-8', composer: false, alias: 'ak-sd-8', route: '/district/ak-sd-8', pid: 'claman_ak', h1: 'Alaska Senate District H', where: 'District H as Alaska’s current legislative plan draws it', kick: 'Senate District H board', kickTitle: 'The district board for Alaska Senate District H: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-9': { seat: 'ak-statesenate-9', composer: false, alias: 'ak-sd-9', route: '/district/ak-sd-9', pid: 'tobin_ak', h1: 'Alaska Senate District I', where: 'District I as Alaska’s current legislative plan draws it', kick: 'Senate District I board', kickTitle: 'The district board for Alaska Senate District I: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-10': { seat: 'ak-statesenate-10', composer: false, alias: 'ak-sd-10', route: '/district/ak-sd-10', pid: 'dunbar_ak', h1: 'Alaska Senate District J', where: 'District J as Alaska’s current legislative plan draws it', kick: 'Senate District J board', kickTitle: 'The district board for Alaska Senate District J: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-11': { seat: 'ak-statesenate-11', composer: false, alias: 'ak-sd-11', route: '/district/ak-sd-11', pid: 'wielechowski_ak', h1: 'Alaska Senate District K', where: 'District K as Alaska’s current legislative plan draws it', kick: 'Senate District K board', kickTitle: 'The district board for Alaska Senate District K: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-12': { seat: 'ak-statesenate-12', composer: false, alias: 'ak-sd-12', route: '/district/ak-sd-12', pid: 'merrick_ak', h1: 'Alaska Senate District L', where: 'District L as Alaska’s current legislative plan draws it', kick: 'Senate District L board', kickTitle: 'The district board for Alaska Senate District L: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-13': { seat: 'ak-statesenate-13', composer: false, alias: 'ak-sd-13', route: '/district/ak-sd-13', pid: 'tilton_ak', h1: 'Alaska Senate District M', where: 'District M as Alaska’s current legislative plan draws it', kick: 'Senate District M board', kickTitle: 'The district board for Alaska Senate District M: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-14': { seat: 'ak-statesenate-14', composer: false, alias: 'ak-sd-14', route: '/district/ak-sd-14', pid: 'yundt_ak', h1: 'Alaska Senate District N', where: 'District N as Alaska’s current legislative plan draws it', kick: 'Senate District N board', kickTitle: 'The district board for Alaska Senate District N: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-15': { seat: 'ak-statesenate-15', composer: false, alias: 'ak-sd-15', route: '/district/ak-sd-15', pid: 'rauscher_ak', h1: 'Alaska Senate District O', where: 'District O as Alaska’s current legislative plan draws it', kick: 'Senate District O board', kickTitle: 'The district board for Alaska Senate District O: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-16': { seat: 'ak-statesenate-16', composer: false, alias: 'ak-sd-16', route: '/district/ak-sd-16', pid: 'kawasaki_ak', h1: 'Alaska Senate District P', where: 'District P as Alaska’s current legislative plan draws it', kick: 'Senate District P board', kickTitle: 'The district board for Alaska Senate District P: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-17': { seat: 'ak-statesenate-17', composer: false, alias: 'ak-sd-17', route: '/district/ak-sd-17', pid: 'myers_ak', h1: 'Alaska Senate District Q', where: 'District Q as Alaska’s current legislative plan draws it', kick: 'Senate District Q board', kickTitle: 'The district board for Alaska Senate District Q: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-18': { seat: 'ak-statesenate-18', composer: false, alias: 'ak-sd-18', route: '/district/ak-sd-18', pid: 'cronk_ak', h1: 'Alaska Senate District R', where: 'District R as Alaska’s current legislative plan draws it', kick: 'Senate District R board', kickTitle: 'The district board for Alaska Senate District R: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-19': { seat: 'ak-statesenate-19', composer: false, alias: 'ak-sd-19', route: '/district/ak-sd-19', pid: 'hoffman_ak', h1: 'Alaska Senate District S', where: 'District S as Alaska’s current legislative plan draws it', kick: 'Senate District S board', kickTitle: 'The district board for Alaska Senate District S: who is in the room and what is on the table. A place, not a scorecard.' },
    'ak-statesenate-20': { seat: 'ak-statesenate-20', composer: false, alias: 'ak-sd-20', route: '/district/ak-sd-20', pid: 'olson_ak', h1: 'Alaska Senate District T', where: 'District T as Alaska’s current legislative plan draws it', kick: 'Senate District T board', kickTitle: 'The district board for Alaska Senate District T: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-statesenate-2': { seat: 'az-statesenate-2', composer: true, alias: 'az-sd-2', route: '/district/az-sd-2', pid: 'bolick_az', h1: 'Arizona Senate District 2', where: 'District 2 as Arizona’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Arizona Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-statesenate-23': { seat: 'az-statesenate-23', composer: true, alias: 'az-sd-23', route: '/district/az-sd-23', pid: 'fernandez_az', h1: 'Arizona Senate District 23', where: 'District 23 as Arizona’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Arizona Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-statesenate-9': { seat: 'az-statesenate-9', composer: true, alias: 'az-sd-9', route: '/district/az-sd-9', pid: 'sears_az', h1: 'Arizona Senate District 9', where: 'District 9 as Arizona’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Arizona Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'az-statesenate-4': { seat: 'az-statesenate-4', composer: true, alias: 'az-sd-4', route: '/district/az-sd-4', pid: 'werner_az', h1: 'Arizona Senate District 4', where: 'District 4 as Arizona’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Arizona Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statehouse-7': { seat: 'ca-statehouse-7', composer: true, alias: 'ca-hd-7', route: '/district/ca-hd-7', pid: 'hoover_ca', h1: 'California Assembly District 7', where: 'District 7 as California’s current legislative plan draws it', kick: 'Assembly District 7 board', kickTitle: 'The district board for California Assembly District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statehouse-36': { seat: 'ca-statehouse-36', composer: true, alias: 'ca-hd-36', route: '/district/ca-hd-36', pid: 'jeff_gonzalez_ca', h1: 'California Assembly District 36', where: 'District 36 as California’s current legislative plan draws it', kick: 'Assembly District 36 board', kickTitle: 'The district board for California Assembly District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statehouse-47': { seat: 'ca-statehouse-47', composer: true, alias: 'ca-hd-47', route: '/district/ca-hd-47', pid: 'wallis_ca', h1: 'California Assembly District 47', where: 'District 47 as California’s current legislative plan draws it', kick: 'Assembly District 47 board', kickTitle: 'The district board for California Assembly District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statehouse-58': { seat: 'ca-statehouse-58', composer: true, alias: 'ca-hd-58', route: '/district/ca-hd-58', pid: 'castillo_ca', h1: 'California Assembly District 58', where: 'District 58 as California’s current legislative plan draws it', kick: 'Assembly District 58 board', kickTitle: 'The district board for California Assembly District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statehouse-74': { seat: 'ca-statehouse-74', composer: true, alias: 'ca-hd-74', route: '/district/ca-hd-74', pid: 'davies_ca', h1: 'California Assembly District 74', where: 'District 74 as California’s current legislative plan draws it', kick: 'Assembly District 74 board', kickTitle: 'The district board for California Assembly District 74: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statesenate-16': { seat: 'ca-statesenate-16', composer: true, alias: 'ca-sd-16', route: '/district/ca-sd-16', pid: 'hurtado_ca', h1: 'California Senate District 16', where: 'District 16 as California’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for California Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ca-statesenate-38': { seat: 'ca-statesenate-38', composer: true, alias: 'ca-sd-38', route: '/district/ca-sd-38', pid: 'blakespear_ca', h1: 'California Senate District 38', where: 'District 38 as California’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for California Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-33': { seat: 'co-statesenate-33', composer: false, alias: 'co-sd-33', route: '/district/co-sd-33', pid: 'james_coleman', h1: 'Colorado Senate District 33', where: 'District 33 as Colorado’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Colorado Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-13': { seat: 'co-statehouse-13', composer: false, alias: 'co-hd-13', route: '/district/co-hd-13', pid: 'julie_mccluskie', h1: 'Colorado House District 13', where: 'District 13 as Colorado’s current legislative plan draws it', kick: 'House District 13 board', kickTitle: 'The district board for Colorado House District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-32': { seat: 'co-statesenate-32', composer: false, alias: 'co-sd-32', route: '/district/co-sd-32', pid: 'robert_rodriguez_co', h1: 'Colorado Senate District 32', where: 'District 32 as Colorado’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Colorado Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-6': { seat: 'co-statesenate-6', composer: false, alias: 'co-sd-6', route: '/district/co-sd-6', pid: 'cleave_simpson', h1: 'Colorado Senate District 6', where: 'District 6 as Colorado’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Colorado Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-11': { seat: 'co-statesenate-11', composer: true, alias: 'co-sd-11', route: '/district/co-sd-11', pid: 'exum_co', h1: 'Colorado Senate District 11', where: 'District 11 as Colorado’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Colorado Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-15': { seat: 'co-statesenate-15', composer: true, alias: 'co-sd-15', route: '/district/co-sd-15', pid: 'marchman_co', h1: 'Colorado Senate District 15', where: 'District 15 as Colorado’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Colorado Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-21': { seat: 'co-statesenate-21', composer: true, alias: 'co-sd-21', route: '/district/co-sd-21', pid: 'benavidez_co', h1: 'Colorado Senate District 21', where: 'District 21 as Colorado’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Colorado Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-30': { seat: 'co-statesenate-30', composer: true, alias: 'co-sd-30', route: '/district/co-sd-30', pid: 'carson_co', h1: 'Colorado Senate District 30', where: 'District 30 as Colorado’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Colorado Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-19': { seat: 'co-statehouse-19', composer: true, alias: 'co-hd-19', route: '/district/co-hd-19', pid: 'woog_co', h1: 'Colorado House District 19', where: 'District 19 as Colorado’s current legislative plan draws it', kick: 'House District 19 board', kickTitle: 'The district board for Colorado House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-25': { seat: 'co-statehouse-25', composer: true, alias: 'co-hd-25', route: '/district/co-hd-25', pid: 'story_co', h1: 'Colorado House District 25', where: 'District 25 as Colorado’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for Colorado House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-33': { seat: 'co-statehouse-33', composer: true, alias: 'co-hd-33', route: '/district/co-hd-33', pid: 'kenny_nguyen_co', h1: 'Colorado House District 33', where: 'District 33 as Colorado’s current legislative plan draws it', kick: 'House District 33 board', kickTitle: 'The district board for Colorado House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-43': { seat: 'co-statehouse-43', composer: true, alias: 'co-hd-43', route: '/district/co-hd-43', pid: 'bob_marshall_co', h1: 'Colorado House District 43', where: 'District 43 as Colorado’s current legislative plan draws it', kick: 'House District 43 board', kickTitle: 'The district board for Colorado House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-46': { seat: 'co-statehouse-46', composer: true, alias: 'co-hd-46', route: '/district/co-hd-46', pid: 'mauro_co', h1: 'Colorado House District 46', where: 'District 46 as Colorado’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Colorado House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-50': { seat: 'co-statehouse-50', composer: true, alias: 'co-hd-50', route: '/district/co-hd-50', pid: 'ryan_gonzalez_co', h1: 'Colorado House District 50', where: 'District 50 as Colorado’s current legislative plan draws it', kick: 'House District 50 board', kickTitle: 'The district board for Colorado House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-59': { seat: 'co-statehouse-59', composer: true, alias: 'co-hd-59', route: '/district/co-hd-59', pid: 'katie_stewart_co', h1: 'Colorado House District 59', where: 'District 59 as Colorado’s current legislative plan draws it', kick: 'House District 59 board', kickTitle: 'The district board for Colorado House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-1': { seat: 'co-statehouse-1', composer: false, alias: 'co-hd-1', route: '/district/co-hd-1', pid: 'mabrey_co', h1: 'Colorado House District 1', where: 'District 1 as Colorado’s current legislative plan draws it', kick: 'House District 1 board', kickTitle: 'The district board for Colorado House District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-2': { seat: 'co-statehouse-2', composer: false, alias: 'co-hd-2', route: '/district/co-hd-2', pid: 'woodrow_co', h1: 'Colorado House District 2', where: 'District 2 as Colorado’s current legislative plan draws it', kick: 'House District 2 board', kickTitle: 'The district board for Colorado House District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-3': { seat: 'co-statehouse-3', composer: false, alias: 'co-hd-3', route: '/district/co-hd-3', pid: 'froelich_co', h1: 'Colorado House District 3', where: 'District 3 as Colorado’s current legislative plan draws it', kick: 'House District 3 board', kickTitle: 'The district board for Colorado House District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-4': { seat: 'co-statehouse-4', composer: false, alias: 'co-hd-4', route: '/district/co-hd-4', pid: 'espenoza_co', h1: 'Colorado House District 4', where: 'District 4 as Colorado’s current legislative plan draws it', kick: 'House District 4 board', kickTitle: 'The district board for Colorado House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-5': { seat: 'co-statehouse-5', composer: false, alias: 'co-hd-5', route: '/district/co-hd-5', pid: 'valdez_co', h1: 'Colorado House District 5', where: 'District 5 as Colorado’s current legislative plan draws it', kick: 'House District 5 board', kickTitle: 'The district board for Colorado House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-6': { seat: 'co-statehouse-6', composer: false, alias: 'co-hd-6', route: '/district/co-hd-6', pid: 'camacho_co', h1: 'Colorado House District 6', where: 'District 6 as Colorado’s current legislative plan draws it', kick: 'House District 6 board', kickTitle: 'The district board for Colorado House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-7': { seat: 'co-statehouse-7', composer: false, alias: 'co-hd-7', route: '/district/co-hd-7', pid: 'bacon_co', h1: 'Colorado House District 7', where: 'District 7 as Colorado’s current legislative plan draws it', kick: 'House District 7 board', kickTitle: 'The district board for Colorado House District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-8': { seat: 'co-statehouse-8', composer: false, alias: 'co-hd-8', route: '/district/co-hd-8', pid: 'gilchrist_co', h1: 'Colorado House District 8', where: 'District 8 as Colorado’s current legislative plan draws it', kick: 'House District 8 board', kickTitle: 'The district board for Colorado House District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-9': { seat: 'co-statehouse-9', composer: false, alias: 'co-hd-9', route: '/district/co-hd-9', pid: 'sirota_co', h1: 'Colorado House District 9', where: 'District 9 as Colorado’s current legislative plan draws it', kick: 'House District 9 board', kickTitle: 'The district board for Colorado House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-10': { seat: 'co-statehouse-10', composer: false, alias: 'co-hd-10', route: '/district/co-hd-10', pid: 'joseph_co', h1: 'Colorado House District 10', where: 'District 10 as Colorado’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Colorado House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-11': { seat: 'co-statehouse-11', composer: false, alias: 'co-hd-11', route: '/district/co-hd-11', pid: 'mccormick_co', h1: 'Colorado House District 11', where: 'District 11 as Colorado’s current legislative plan draws it', kick: 'House District 11 board', kickTitle: 'The district board for Colorado House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-12': { seat: 'co-statehouse-12', composer: false, alias: 'co-hd-12', route: '/district/co-hd-12', pid: 'brown_co', h1: 'Colorado House District 12', where: 'District 12 as Colorado’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Colorado House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-14': { seat: 'co-statehouse-14', composer: false, alias: 'co-hd-14', route: '/district/co-hd-14', pid: 'flanell_co', h1: 'Colorado House District 14', where: 'District 14 as Colorado’s current legislative plan draws it', kick: 'House District 14 board', kickTitle: 'The district board for Colorado House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-15': { seat: 'co-statehouse-15', composer: false, alias: 'co-hd-15', route: '/district/co-hd-15', pid: 'bottoms_co', h1: 'Colorado House District 15', where: 'District 15 as Colorado’s current legislative plan draws it', kick: 'House District 15 board', kickTitle: 'The district board for Colorado House District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-16': { seat: 'co-statehouse-16', composer: false, alias: 'co-hd-16', route: '/district/co-hd-16', pid: 'keltie_co', h1: 'Colorado House District 16', where: 'District 16 as Colorado’s current legislative plan draws it', kick: 'House District 16 board', kickTitle: 'The district board for Colorado House District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-17': { seat: 'co-statehouse-17', composer: false, alias: 'co-hd-17', route: '/district/co-hd-17', pid: 'english_co', h1: 'Colorado House District 17', where: 'District 17 as Colorado’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Colorado House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-18': { seat: 'co-statehouse-18', composer: false, alias: 'co-hd-18', route: '/district/co-hd-18', pid: 'paschal_co', h1: 'Colorado House District 18', where: 'District 18 as Colorado’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Colorado House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-20': { seat: 'co-statehouse-20', composer: false, alias: 'co-hd-20', route: '/district/co-hd-20', pid: 'caldwell_co', h1: 'Colorado House District 20', where: 'District 20 as Colorado’s current legislative plan draws it', kick: 'House District 20 board', kickTitle: 'The district board for Colorado House District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-21': { seat: 'co-statehouse-21', composer: false, alias: 'co-hd-21', route: '/district/co-hd-21', pid: 'bradfield_co', h1: 'Colorado House District 21', where: 'District 21 as Colorado’s current legislative plan draws it', kick: 'House District 21 board', kickTitle: 'The district board for Colorado House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-22': { seat: 'co-statehouse-22', composer: false, alias: 'co-hd-22', route: '/district/co-hd-22', pid: 'degraaf_co', h1: 'Colorado House District 22', where: 'District 22 as Colorado’s current legislative plan draws it', kick: 'House District 22 board', kickTitle: 'The district board for Colorado House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-23': { seat: 'co-statehouse-23', composer: false, alias: 'co-hd-23', route: '/district/co-hd-23', pid: 'duran_co', h1: 'Colorado House District 23', where: 'District 23 as Colorado’s current legislative plan draws it', kick: 'House District 23 board', kickTitle: 'The district board for Colorado House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-24': { seat: 'co-statehouse-24', composer: false, alias: 'co-hd-24', route: '/district/co-hd-24', pid: 'feret_co', h1: 'Colorado House District 24', where: 'District 24 as Colorado’s current legislative plan draws it', kick: 'House District 24 board', kickTitle: 'The district board for Colorado House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-26': { seat: 'co-statehouse-26', composer: false, alias: 'co-hd-26', route: '/district/co-hd-26', pid: 'lukens_co', h1: 'Colorado House District 26', where: 'District 26 as Colorado’s current legislative plan draws it', kick: 'House District 26 board', kickTitle: 'The district board for Colorado House District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-27': { seat: 'co-statehouse-27', composer: false, alias: 'co-hd-27', route: '/district/co-hd-27', pid: 'titone_co', h1: 'Colorado House District 27', where: 'District 27 as Colorado’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Colorado House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-28': { seat: 'co-statehouse-28', composer: false, alias: 'co-hd-28', route: '/district/co-hd-28', pid: 'lieder_co', h1: 'Colorado House District 28', where: 'District 28 as Colorado’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Colorado House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-29': { seat: 'co-statehouse-29', composer: false, alias: 'co-hd-29', route: '/district/co-hd-29', pid: 'goldstein_co', h1: 'Colorado House District 29', where: 'District 29 as Colorado’s current legislative plan draws it', kick: 'House District 29 board', kickTitle: 'The district board for Colorado House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-30': { seat: 'co-statehouse-30', composer: false, alias: 'co-hd-30', route: '/district/co-hd-30', pid: 'stewart_co', h1: 'Colorado House District 30', where: 'District 30 as Colorado’s current legislative plan draws it', kick: 'House District 30 board', kickTitle: 'The district board for Colorado House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-31': { seat: 'co-statehouse-31', composer: false, alias: 'co-hd-31', route: '/district/co-hd-31', pid: 'phillips_co', h1: 'Colorado House District 31', where: 'District 31 as Colorado’s current legislative plan draws it', kick: 'House District 31 board', kickTitle: 'The district board for Colorado House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-32': { seat: 'co-statehouse-32', composer: false, alias: 'co-hd-32', route: '/district/co-hd-32', pid: 'gonzalez_co', h1: 'Colorado House District 32', where: 'District 32 as Colorado’s current legislative plan draws it', kick: 'House District 32 board', kickTitle: 'The district board for Colorado House District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-34': { seat: 'co-statehouse-34', composer: false, alias: 'co-hd-34', route: '/district/co-hd-34', pid: 'willford_co', h1: 'Colorado House District 34', where: 'District 34 as Colorado’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Colorado House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-35': { seat: 'co-statehouse-35', composer: false, alias: 'co-hd-35', route: '/district/co-hd-35', pid: 'garcia_co', h1: 'Colorado House District 35', where: 'District 35 as Colorado’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Colorado House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-36': { seat: 'co-statehouse-36', composer: false, alias: 'co-hd-36', route: '/district/co-hd-36', pid: 'carter_co', h1: 'Colorado House District 36', where: 'District 36 as Colorado’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Colorado House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-37': { seat: 'co-statehouse-37', composer: false, alias: 'co-hd-37', route: '/district/co-hd-37', pid: 'clifford_co', h1: 'Colorado House District 37', where: 'District 37 as Colorado’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Colorado House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-38': { seat: 'co-statehouse-38', composer: false, alias: 'co-hd-38', route: '/district/co-hd-38', pid: 'rydin_co', h1: 'Colorado House District 38', where: 'District 38 as Colorado’s current legislative plan draws it', kick: 'House District 38 board', kickTitle: 'The district board for Colorado House District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-39': { seat: 'co-statehouse-39', composer: false, alias: 'co-hd-39', route: '/district/co-hd-39', pid: 'bradley_co', h1: 'Colorado House District 39', where: 'District 39 as Colorado’s current legislative plan draws it', kick: 'House District 39 board', kickTitle: 'The district board for Colorado House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-40': { seat: 'co-statehouse-40', composer: false, alias: 'co-hd-40', route: '/district/co-hd-40', pid: 'ricks_co', h1: 'Colorado House District 40', where: 'District 40 as Colorado’s current legislative plan draws it', kick: 'House District 40 board', kickTitle: 'The district board for Colorado House District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-41': { seat: 'co-statehouse-41', composer: false, alias: 'co-hd-41', route: '/district/co-hd-41', pid: 'jackson_co', h1: 'Colorado House District 41', where: 'District 41 as Colorado’s current legislative plan draws it', kick: 'House District 41 board', kickTitle: 'The district board for Colorado House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-42': { seat: 'co-statehouse-42', composer: false, alias: 'co-hd-42', route: '/district/co-hd-42', pid: 'lindsay_co', h1: 'Colorado House District 42', where: 'District 42 as Colorado’s current legislative plan draws it', kick: 'House District 42 board', kickTitle: 'The district board for Colorado House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-44': { seat: 'co-statehouse-44', composer: false, alias: 'co-hd-44', route: '/district/co-hd-44', pid: 'hartsook_co', h1: 'Colorado House District 44', where: 'District 44 as Colorado’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Colorado House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-45': { seat: 'co-statehouse-45', composer: false, alias: 'co-hd-45', route: '/district/co-hd-45', pid: 'brooks_co', h1: 'Colorado House District 45', where: 'District 45 as Colorado’s current legislative plan draws it', kick: 'House District 45 board', kickTitle: 'The district board for Colorado House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-47': { seat: 'co-statehouse-47', composer: false, alias: 'co-hd-47', route: '/district/co-hd-47', pid: 'winter_co', h1: 'Colorado House District 47', where: 'District 47 as Colorado’s current legislative plan draws it', kick: 'House District 47 board', kickTitle: 'The district board for Colorado House District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-48': { seat: 'co-statehouse-48', composer: false, alias: 'co-hd-48', route: '/district/co-hd-48', pid: 'barron_co', h1: 'Colorado House District 48', where: 'District 48 as Colorado’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Colorado House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-49': { seat: 'co-statehouse-49', composer: false, alias: 'co-hd-49', route: '/district/co-hd-49', pid: 'smith_co', h1: 'Colorado House District 49', where: 'District 49 as Colorado’s current legislative plan draws it', kick: 'House District 49 board', kickTitle: 'The district board for Colorado House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-51': { seat: 'co-statehouse-51', composer: false, alias: 'co-hd-51', route: '/district/co-hd-51', pid: 'weinberg_co', h1: 'Colorado House District 51', where: 'District 51 as Colorado’s current legislative plan draws it', kick: 'House District 51 board', kickTitle: 'The district board for Colorado House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-52': { seat: 'co-statehouse-52', composer: false, alias: 'co-hd-52', route: '/district/co-hd-52', pid: 'zokaie_co', h1: 'Colorado House District 52', where: 'District 52 as Colorado’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Colorado House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-53': { seat: 'co-statehouse-53', composer: false, alias: 'co-hd-53', route: '/district/co-hd-53', pid: 'boesenecker_co', h1: 'Colorado House District 53', where: 'District 53 as Colorado’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Colorado House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-54': { seat: 'co-statehouse-54', composer: false, alias: 'co-hd-54', route: '/district/co-hd-54', pid: 'soper_co', h1: 'Colorado House District 54', where: 'District 54 as Colorado’s current legislative plan draws it', kick: 'House District 54 board', kickTitle: 'The district board for Colorado House District 54: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-55': { seat: 'co-statehouse-55', composer: false, alias: 'co-hd-55', route: '/district/co-hd-55', pid: 'taggart_co', h1: 'Colorado House District 55', where: 'District 55 as Colorado’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Colorado House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-56': { seat: 'co-statehouse-56', composer: false, alias: 'co-hd-56', route: '/district/co-hd-56', pid: 'richardson_co', h1: 'Colorado House District 56', where: 'District 56 as Colorado’s current legislative plan draws it', kick: 'House District 56 board', kickTitle: 'The district board for Colorado House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-57': { seat: 'co-statehouse-57', composer: false, alias: 'co-hd-57', route: '/district/co-hd-57', pid: 'velasco_co', h1: 'Colorado House District 57', where: 'District 57 as Colorado’s current legislative plan draws it', kick: 'House District 57 board', kickTitle: 'The district board for Colorado House District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-58': { seat: 'co-statehouse-58', composer: false, alias: 'co-hd-58', route: '/district/co-hd-58', pid: 'suckla_co', h1: 'Colorado House District 58', where: 'District 58 as Colorado’s current legislative plan draws it', kick: 'House District 58 board', kickTitle: 'The district board for Colorado House District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-60': { seat: 'co-statehouse-60', composer: false, alias: 'co-hd-60', route: '/district/co-hd-60', pid: 'luck_co', h1: 'Colorado House District 60', where: 'District 60 as Colorado’s current legislative plan draws it', kick: 'House District 60 board', kickTitle: 'The district board for Colorado House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-61': { seat: 'co-statehouse-61', composer: false, alias: 'co-hd-61', route: '/district/co-hd-61', pid: 'hamrick_co', h1: 'Colorado House District 61', where: 'District 61 as Colorado’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Colorado House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-62': { seat: 'co-statehouse-62', composer: false, alias: 'co-hd-62', route: '/district/co-hd-62', pid: 'martinez_co', h1: 'Colorado House District 62', where: 'District 62 as Colorado’s current legislative plan draws it', kick: 'House District 62 board', kickTitle: 'The district board for Colorado House District 62: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-63': { seat: 'co-statehouse-63', composer: false, alias: 'co-hd-63', route: '/district/co-hd-63', pid: 'johnson_co', h1: 'Colorado House District 63', where: 'District 63 as Colorado’s current legislative plan draws it', kick: 'House District 63 board', kickTitle: 'The district board for Colorado House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-64': { seat: 'co-statehouse-64', composer: false, alias: 'co-hd-64', route: '/district/co-hd-64', pid: 'slaugh_co', h1: 'Colorado House District 64', where: 'District 64 as Colorado’s current legislative plan draws it', kick: 'House District 64 board', kickTitle: 'The district board for Colorado House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statehouse-65': { seat: 'co-statehouse-65', composer: false, alias: 'co-hd-65', route: '/district/co-hd-65', pid: 'garcia_sander_co', h1: 'Colorado House District 65', where: 'District 65 as Colorado’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Colorado House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-1': { seat: 'co-statesenate-1', composer: false, alias: 'co-sd-1', route: '/district/co-sd-1', pid: 'pelton_co', h1: 'Colorado Senate District 1', where: 'District 1 as Colorado’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Colorado Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-2': { seat: 'co-statesenate-2', composer: false, alias: 'co-sd-2', route: '/district/co-sd-2', pid: 'frizell_co', h1: 'Colorado Senate District 2', where: 'District 2 as Colorado’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Colorado Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-3': { seat: 'co-statesenate-3', composer: false, alias: 'co-sd-3', route: '/district/co-sd-3', pid: 'hinrichsen_co', h1: 'Colorado Senate District 3', where: 'District 3 as Colorado’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Colorado Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-5': { seat: 'co-statesenate-5', composer: false, alias: 'co-sd-5', route: '/district/co-sd-5', pid: 'catlin_co', h1: 'Colorado Senate District 5', where: 'District 5 as Colorado’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Colorado Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-7': { seat: 'co-statesenate-7', composer: false, alias: 'co-sd-7', route: '/district/co-sd-7', pid: 'rich_co', h1: 'Colorado Senate District 7', where: 'District 7 as Colorado’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Colorado Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-8': { seat: 'co-statesenate-8', composer: false, alias: 'co-sd-8', route: '/district/co-sd-8', pid: 'roberts_co', h1: 'Colorado Senate District 8', where: 'District 8 as Colorado’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Colorado Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-9': { seat: 'co-statesenate-9', composer: false, alias: 'co-sd-9', route: '/district/co-sd-9', pid: 'zamora_wilson_co', h1: 'Colorado Senate District 9', where: 'District 9 as Colorado’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Colorado Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-10': { seat: 'co-statesenate-10', composer: false, alias: 'co-sd-10', route: '/district/co-sd-10', pid: 'liston_co', h1: 'Colorado Senate District 10', where: 'District 10 as Colorado’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Colorado Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-12': { seat: 'co-statesenate-12', composer: false, alias: 'co-sd-12', route: '/district/co-sd-12', pid: 'snyder_co', h1: 'Colorado Senate District 12', where: 'District 12 as Colorado’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Colorado Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-13': { seat: 'co-statesenate-13', composer: false, alias: 'co-sd-13', route: '/district/co-sd-13', pid: 'bright_co', h1: 'Colorado Senate District 13', where: 'District 13 as Colorado’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Colorado Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-14': { seat: 'co-statesenate-14', composer: false, alias: 'co-sd-14', route: '/district/co-sd-14', pid: 'kipp_co', h1: 'Colorado Senate District 14', where: 'District 14 as Colorado’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Colorado Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-16': { seat: 'co-statesenate-16', composer: false, alias: 'co-sd-16', route: '/district/co-sd-16', pid: 'kolker_co', h1: 'Colorado Senate District 16', where: 'District 16 as Colorado’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Colorado Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-17': { seat: 'co-statesenate-17', composer: false, alias: 'co-sd-17', route: '/district/co-sd-17', pid: 'wallace_co', h1: 'Colorado Senate District 17', where: 'District 17 as Colorado’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Colorado Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-18': { seat: 'co-statesenate-18', composer: false, alias: 'co-sd-18', route: '/district/co-sd-18', pid: 'amabile_co', h1: 'Colorado Senate District 18', where: 'District 18 as Colorado’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Colorado Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-19': { seat: 'co-statesenate-19', composer: false, alias: 'co-sd-19', route: '/district/co-sd-19', pid: 'daugherty_co', h1: 'Colorado Senate District 19', where: 'District 19 as Colorado’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Colorado Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-20': { seat: 'co-statesenate-20', composer: false, alias: 'co-sd-20', route: '/district/co-sd-20', pid: 'cutter_co', h1: 'Colorado Senate District 20', where: 'District 20 as Colorado’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Colorado Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-22': { seat: 'co-statesenate-22', composer: false, alias: 'co-sd-22', route: '/district/co-sd-22', pid: 'danielson_co', h1: 'Colorado Senate District 22', where: 'District 22 as Colorado’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Colorado Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-23': { seat: 'co-statesenate-23', composer: false, alias: 'co-sd-23', route: '/district/co-sd-23', pid: 'kirkmeyer_co', h1: 'Colorado Senate District 23', where: 'District 23 as Colorado’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Colorado Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-24': { seat: 'co-statesenate-24', composer: false, alias: 'co-sd-24', route: '/district/co-sd-24', pid: 'mullica_co', h1: 'Colorado Senate District 24', where: 'District 24 as Colorado’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Colorado Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-25': { seat: 'co-statesenate-25', composer: false, alias: 'co-sd-25', route: '/district/co-sd-25', pid: 'lindstedt_co', h1: 'Colorado Senate District 25', where: 'District 25 as Colorado’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Colorado Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-26': { seat: 'co-statesenate-26', composer: false, alias: 'co-sd-26', route: '/district/co-sd-26', pid: 'bridges_co', h1: 'Colorado Senate District 26', where: 'District 26 as Colorado’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Colorado Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-27': { seat: 'co-statesenate-27', composer: false, alias: 'co-sd-27', route: '/district/co-sd-27', pid: 'sullivan_co', h1: 'Colorado Senate District 27', where: 'District 27 as Colorado’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Colorado Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-28': { seat: 'co-statesenate-28', composer: false, alias: 'co-sd-28', route: '/district/co-sd-28', pid: 'weissman_co', h1: 'Colorado Senate District 28', where: 'District 28 as Colorado’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Colorado Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-29': { seat: 'co-statesenate-29', composer: false, alias: 'co-sd-29', route: '/district/co-sd-29', pid: 'jodeh_co', h1: 'Colorado Senate District 29', where: 'District 29 as Colorado’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Colorado Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-31': { seat: 'co-statesenate-31', composer: false, alias: 'co-sd-31', route: '/district/co-sd-31', pid: 'ball_co', h1: 'Colorado Senate District 31', where: 'District 31 as Colorado’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Colorado Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-34': { seat: 'co-statesenate-34', composer: false, alias: 'co-sd-34', route: '/district/co-sd-34', pid: 'gonzales_co', h1: 'Colorado Senate District 34', where: 'District 34 as Colorado’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Colorado Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-35': { seat: 'co-statesenate-35', composer: false, alias: 'co-sd-35', route: '/district/co-sd-35', pid: 'rod_pelton_co', h1: 'Colorado Senate District 35', where: 'District 35 as Colorado’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Colorado Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'co-statesenate-4': { seat: 'co-statesenate-4', composer: false, alias: 'co-sd-4', route: '/district/co-sd-4', pid: 'mark_baisley', h1: 'Colorado Senate District 4', where: 'District 4 as Colorado’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Colorado Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-35': { seat: 'fl-statehouse-35', composer: true, alias: 'fl-hd-35', route: '/district/fl-hd-35', pid: 'booth_fl', h1: 'Florida House District 35', where: 'District 35 as Florida’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Florida House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-65': { seat: 'fl-statehouse-65', composer: true, alias: 'fl-hd-65', route: '/district/fl-hd-65', pid: 'gonzalez_pittman_fl', h1: 'Florida House District 65', where: 'District 65 as Florida’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Florida House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-87': { seat: 'fl-statehouse-87', composer: true, alias: 'fl-hd-87', route: '/district/fl-hd-87', pid: 'gregory_fl', h1: 'Florida House District 87', where: 'District 87 as Florida’s current legislative plan draws it', kick: 'House District 87 board', kickTitle: 'The district board for Florida House District 87: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-89': { seat: 'fl-statehouse-89', composer: true, alias: 'fl-hd-89', route: '/district/fl-hd-89', pid: 'tendrich_fl', h1: 'Florida House District 89', where: 'District 89 as Florida’s current legislative plan draws it', kick: 'House District 89 board', kickTitle: 'The district board for Florida House District 89: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-93': { seat: 'fl-statehouse-93', composer: true, alias: 'fl-hd-93', route: '/district/fl-hd-93', pid: 'gerwig_fl', h1: 'Florida House District 93', where: 'District 93 as Florida’s current legislative plan draws it', kick: 'House District 93 board', kickTitle: 'The district board for Florida House District 93: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-101': { seat: 'fl-statehouse-101', composer: true, alias: 'fl-hd-101', route: '/district/fl-hd-101', pid: 'cassel_fl', h1: 'Florida House District 101', where: 'District 101 as Florida’s current legislative plan draws it', kick: 'House District 101 board', kickTitle: 'The district board for Florida House District 101: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statehouse-106': { seat: 'fl-statehouse-106', composer: true, alias: 'fl-hd-106', route: '/district/fl-hd-106', pid: 'basabe_fl', h1: 'Florida House District 106', where: 'District 106 as Florida’s current legislative plan draws it', kick: 'House District 106 board', kickTitle: 'The district board for Florida House District 106: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statesenate-10': { seat: 'fl-statesenate-10', composer: true, alias: 'fl-sd-10', route: '/district/fl-sd-10', pid: 'brodeur_fl', h1: 'Florida Senate District 10', where: 'District 10 as Florida’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Florida Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statesenate-14': { seat: 'fl-statesenate-14', composer: true, alias: 'fl-sd-14', route: '/district/fl-sd-14', pid: 'nathan_fl', h1: 'Florida Senate District 14', where: 'District 14 as Florida’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Florida Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'fl-statesenate-38': { seat: 'fl-statesenate-38', composer: true, alias: 'fl-sd-38', route: '/district/fl-sd-38', pid: 'calatayud_fl', h1: 'Florida Senate District 38', where: 'District 38 as Florida’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for Florida Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statesenate-37': { seat: 'ga-statesenate-37', composer: true, alias: 'ga-sd-37', route: '/district/ga-sd-37', pid: 'setzler_ga', h1: 'Georgia Senate District 37', where: 'District 37 as Georgia’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Georgia Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statesenate-48': { seat: 'ga-statesenate-48', composer: true, alias: 'ga-sd-48', route: '/district/ga-sd-48', pid: 'still_ga', h1: 'Georgia Senate District 48', where: 'District 48 as Georgia’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Georgia Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-151': { seat: 'ga-statehouse-151', composer: true, alias: 'ga-hd-151', route: '/district/ga-hd-151', pid: 'cheokas_ga', h1: 'Georgia House District 151', where: 'District 151 as Georgia’s current legislative plan draws it', kick: 'House District 151 board', kickTitle: 'The district board for Georgia House District 151: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-105': { seat: 'ga-statehouse-105', composer: true, alias: 'ga-hd-105', route: '/district/ga-hd-105', pid: 'donatucci_ga', h1: 'Georgia House District 105', where: 'District 105 as Georgia’s current legislative plan draws it', kick: 'House District 105 board', kickTitle: 'The district board for Georgia House District 105: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-154': { seat: 'ga-statehouse-154', composer: true, alias: 'ga-hd-154', route: '/district/ga-hd-154', pid: 'greene_ga', h1: 'Georgia House District 154', where: 'District 154 as Georgia’s current legislative plan draws it', kick: 'House District 154 board', kickTitle: 'The district board for Georgia House District 154: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-48': { seat: 'ga-statehouse-48', composer: true, alias: 'ga-hd-48', route: '/district/ga-hd-48', pid: 'hilton_ga', h1: 'Georgia House District 48', where: 'District 48 as Georgia’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Georgia House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-44': { seat: 'ga-statehouse-44', composer: true, alias: 'ga-hd-44', route: '/district/ga-hd-44', pid: 'parsons_ga', h1: 'Georgia House District 44', where: 'District 44 as Georgia’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Georgia House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-99': { seat: 'ga-statehouse-99', composer: true, alias: 'ga-hd-99', route: '/district/ga-hd-99', pid: 'reeves_ga', h1: 'Georgia House District 99', where: 'District 99 as Georgia’s current legislative plan draws it', kick: 'House District 99 board', kickTitle: 'The district board for Georgia House District 99: who is in the room and what is on the table. A place, not a scorecard.' },
    'ga-statehouse-53': { seat: 'ga-statehouse-53', composer: true, alias: 'ga-hd-53', route: '/district/ga-hd-53', pid: 'silcox_ga', h1: 'Georgia House District 53', where: 'District 53 as Georgia’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Georgia House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-10-p1': { seat: 'id-statehouse-10-p1', composer: false, alias: 'id-hd-10-p1', route: '/district/id-hd-10-p1', pid: 'moyle_id', h1: 'Idaho House District 10, Position A', where: 'District 10 as Idaho’s current legislative plan draws it', kick: 'House District 10, Position A board', kickTitle: 'The district board for Idaho House District 10, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-10-p2': { seat: 'id-statehouse-10-p2', composer: false, alias: 'id-hd-10-p2', route: '/district/id-hd-10-p2', pid: 'skaug_id', h1: 'Idaho House District 10, Position B', where: 'District 10 as Idaho’s current legislative plan draws it', kick: 'House District 10, Position B board', kickTitle: 'The district board for Idaho House District 10, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-11-p1': { seat: 'id-statehouse-11-p1', composer: false, alias: 'id-hd-11-p1', route: '/district/id-hd-11-p1', pid: 'marmon_id', h1: 'Idaho House District 11, Position A', where: 'District 11 as Idaho’s current legislative plan draws it', kick: 'House District 11, Position A board', kickTitle: 'The district board for Idaho House District 11, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-11-p2': { seat: 'id-statehouse-11-p2', composer: false, alias: 'id-hd-11-p2', route: '/district/id-hd-11-p2', pid: 'cayler_id', h1: 'Idaho House District 11, Position B', where: 'District 11 as Idaho’s current legislative plan draws it', kick: 'House District 11, Position B board', kickTitle: 'The district board for Idaho House District 11, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-12-p1': { seat: 'id-statehouse-12-p1', composer: false, alias: 'id-hd-12-p1', route: '/district/id-hd-12-p1', pid: 'cornilles_id', h1: 'Idaho House District 12, Position A', where: 'District 12 as Idaho’s current legislative plan draws it', kick: 'House District 12, Position A board', kickTitle: 'The district board for Idaho House District 12, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-12-p2': { seat: 'id-statehouse-12-p2', composer: false, alias: 'id-hd-12-p2', route: '/district/id-hd-12-p2', pid: 'crane_id', h1: 'Idaho House District 12, Position B', where: 'District 12 as Idaho’s current legislative plan draws it', kick: 'House District 12, Position B board', kickTitle: 'The district board for Idaho House District 12, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-13-p1': { seat: 'id-statehouse-13-p1', composer: false, alias: 'id-hd-13-p1', route: '/district/id-hd-13-p1', pid: 'brent_crane_id', h1: 'Idaho House District 13, Position A', where: 'District 13 as Idaho’s current legislative plan draws it', kick: 'House District 13, Position A board', kickTitle: 'The district board for Idaho House District 13, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-13-p2': { seat: 'id-statehouse-13-p2', composer: false, alias: 'id-hd-13-p2', route: '/district/id-hd-13-p2', pid: 'tanner_id', h1: 'Idaho House District 13, Position B', where: 'District 13 as Idaho’s current legislative plan draws it', kick: 'House District 13, Position B board', kickTitle: 'The district board for Idaho House District 13, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-14-p1': { seat: 'id-statehouse-14-p1', composer: false, alias: 'id-hd-14-p1', route: '/district/id-hd-14-p1', pid: 'hill_id', h1: 'Idaho House District 14, Position A', where: 'District 14 as Idaho’s current legislative plan draws it', kick: 'House District 14, Position A board', kickTitle: 'The district board for Idaho House District 14, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-14-p2': { seat: 'id-statehouse-14-p2', composer: false, alias: 'id-hd-14-p2', route: '/district/id-hd-14-p2', pid: 'josh_tanner_id', h1: 'Idaho House District 14, Position B', where: 'District 14 as Idaho’s current legislative plan draws it', kick: 'House District 14, Position B board', kickTitle: 'The district board for Idaho House District 14, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-15-p1': { seat: 'id-statehouse-15-p1', composer: false, alias: 'id-hd-15-p1', route: '/district/id-hd-15-p1', pid: 'berch_id', h1: 'Idaho House District 15, Position A', where: 'District 15 as Idaho’s current legislative plan draws it', kick: 'House District 15, Position A board', kickTitle: 'The district board for Idaho House District 15, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-15-p2': { seat: 'id-statehouse-15-p2', composer: false, alias: 'id-hd-15-p2', route: '/district/id-hd-15-p2', pid: 'healey_id', h1: 'Idaho House District 15, Position B', where: 'District 15 as Idaho’s current legislative plan draws it', kick: 'House District 15, Position B board', kickTitle: 'The district board for Idaho House District 15, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-16-p1': { seat: 'id-statehouse-16-p1', composer: false, alias: 'id-hd-16-p1', route: '/district/id-hd-16-p1', pid: 'galaviz_id', h1: 'Idaho House District 16, Position A', where: 'District 16 as Idaho’s current legislative plan draws it', kick: 'House District 16, Position A board', kickTitle: 'The district board for Idaho House District 16, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-16-p2': { seat: 'id-statehouse-16-p2', composer: false, alias: 'id-hd-16-p2', route: '/district/id-hd-16-p2', pid: 'henderson_haws_id', h1: 'Idaho House District 16, Position B', where: 'District 16 as Idaho’s current legislative plan draws it', kick: 'House District 16, Position B board', kickTitle: 'The district board for Idaho House District 16, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-17-p1': { seat: 'id-statehouse-17-p1', composer: false, alias: 'id-hd-17-p1', route: '/district/id-hd-17-p1', pid: 'gannon_id', h1: 'Idaho House District 17, Position A', where: 'District 17 as Idaho’s current legislative plan draws it', kick: 'House District 17, Position A board', kickTitle: 'The district board for Idaho House District 17, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-17-p2': { seat: 'id-statehouse-17-p2', composer: false, alias: 'id-hd-17-p2', route: '/district/id-hd-17-p2', pid: 'egbert_id', h1: 'Idaho House District 17, Position B', where: 'District 17 as Idaho’s current legislative plan draws it', kick: 'House District 17, Position B board', kickTitle: 'The district board for Idaho House District 17, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-18-p1': { seat: 'id-statehouse-18-p1', composer: false, alias: 'id-hd-18-p1', route: '/district/id-hd-18-p1', pid: 'rubel_id', h1: 'Idaho House District 18, Position A', where: 'District 18 as Idaho’s current legislative plan draws it', kick: 'House District 18, Position A board', kickTitle: 'The district board for Idaho House District 18, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-18-p2': { seat: 'id-statehouse-18-p2', composer: false, alias: 'id-hd-18-p2', route: '/district/id-hd-18-p2', pid: 'green_id', h1: 'Idaho House District 18, Position B', where: 'District 18 as Idaho’s current legislative plan draws it', kick: 'House District 18, Position B board', kickTitle: 'The district board for Idaho House District 18, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-19-p1': { seat: 'id-statehouse-19-p1', composer: false, alias: 'id-hd-19-p1', route: '/district/id-hd-19-p1', pid: 'church_id', h1: 'Idaho House District 19, Position A', where: 'District 19 as Idaho’s current legislative plan draws it', kick: 'House District 19, Position A board', kickTitle: 'The district board for Idaho House District 19, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-19-p2': { seat: 'id-statehouse-19-p2', composer: false, alias: 'id-hd-19-p2', route: '/district/id-hd-19-p2', pid: 'mathias_id', h1: 'Idaho House District 19, Position B', where: 'District 19 as Idaho’s current legislative plan draws it', kick: 'House District 19, Position B board', kickTitle: 'The district board for Idaho House District 19, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-1-p1': { seat: 'id-statehouse-1-p1', composer: false, alias: 'id-hd-1-p1', route: '/district/id-hd-1-p1', pid: 'sauter_id', h1: 'Idaho House District 1, Position A', where: 'District 1 as Idaho’s current legislative plan draws it', kick: 'House District 1, Position A board', kickTitle: 'The district board for Idaho House District 1, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-1-p2': { seat: 'id-statehouse-1-p2', composer: false, alias: 'id-hd-1-p2', route: '/district/id-hd-1-p2', pid: 'rasor_id', h1: 'Idaho House District 1, Position B', where: 'District 1 as Idaho’s current legislative plan draws it', kick: 'House District 1, Position B board', kickTitle: 'The district board for Idaho House District 1, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-20-p1': { seat: 'id-statehouse-20-p1', composer: false, alias: 'id-hd-20-p1', route: '/district/id-hd-20-p1', pid: 'palmer_id', h1: 'Idaho House District 20, Position A', where: 'District 20 as Idaho’s current legislative plan draws it', kick: 'House District 20, Position A board', kickTitle: 'The district board for Idaho House District 20, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-20-p2': { seat: 'id-statehouse-20-p2', composer: false, alias: 'id-hd-20-p2', route: '/district/id-hd-20-p2', pid: 'holtzclaw_id', h1: 'Idaho House District 20, Position B', where: 'District 20 as Idaho’s current legislative plan draws it', kick: 'House District 20, Position B board', kickTitle: 'The district board for Idaho House District 20, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-21-p1': { seat: 'id-statehouse-21-p1', composer: false, alias: 'id-hd-21-p1', route: '/district/id-hd-21-p1', pid: 'petzke_id', h1: 'Idaho House District 21, Position A', where: 'District 21 as Idaho’s current legislative plan draws it', kick: 'House District 21, Position A board', kickTitle: 'The district board for Idaho House District 21, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-21-p2': { seat: 'id-statehouse-21-p2', composer: false, alias: 'id-hd-21-p2', route: '/district/id-hd-21-p2', pid: 'ehlers_id', h1: 'Idaho House District 21, Position B', where: 'District 21 as Idaho’s current legislative plan draws it', kick: 'House District 21, Position B board', kickTitle: 'The district board for Idaho House District 21, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-22-p1': { seat: 'id-statehouse-22-p1', composer: false, alias: 'id-hd-22-p1', route: '/district/id-hd-22-p1', pid: 'vander_woude_id', h1: 'Idaho House District 22, Position A', where: 'District 22 as Idaho’s current legislative plan draws it', kick: 'House District 22, Position A board', kickTitle: 'The district board for Idaho House District 22, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-22-p2': { seat: 'id-statehouse-22-p2', composer: false, alias: 'id-hd-22-p2', route: '/district/id-hd-22-p2', pid: 'monks_id', h1: 'Idaho House District 22, Position B', where: 'District 22 as Idaho’s current legislative plan draws it', kick: 'House District 22, Position B board', kickTitle: 'The district board for Idaho House District 22, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-23-p1': { seat: 'id-statehouse-23-p1', composer: false, alias: 'id-hd-23-p1', route: '/district/id-hd-23-p1', pid: 'bruce_id', h1: 'Idaho House District 23, Position A', where: 'District 23 as Idaho’s current legislative plan draws it', kick: 'House District 23, Position A board', kickTitle: 'The district board for Idaho House District 23, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-23-p2': { seat: 'id-statehouse-23-p2', composer: false, alias: 'id-hd-23-p2', route: '/district/id-hd-23-p2', pid: 'dygert_id', h1: 'Idaho House District 23, Position B', where: 'District 23 as Idaho’s current legislative plan draws it', kick: 'House District 23, Position B board', kickTitle: 'The district board for Idaho House District 23, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-24-p1': { seat: 'id-statehouse-24-p1', composer: false, alias: 'id-hd-24-p1', route: '/district/id-hd-24-p1', pid: 'hostetler_id', h1: 'Idaho House District 24, Position A', where: 'District 24 as Idaho’s current legislative plan draws it', kick: 'House District 24, Position A board', kickTitle: 'The district board for Idaho House District 24, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-24-p2': { seat: 'id-statehouse-24-p2', composer: false, alias: 'id-hd-24-p2', route: '/district/id-hd-24-p2', pid: 'miller_id', h1: 'Idaho House District 24, Position B', where: 'District 24 as Idaho’s current legislative plan draws it', kick: 'House District 24, Position B board', kickTitle: 'The district board for Idaho House District 24, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-25-p1': { seat: 'id-statehouse-25-p1', composer: false, alias: 'id-hd-25-p1', route: '/district/id-hd-25-p1', pid: 'hall_id', h1: 'Idaho House District 25, Position A', where: 'District 25 as Idaho’s current legislative plan draws it', kick: 'House District 25, Position A board', kickTitle: 'The district board for Idaho House District 25, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-25-p2': { seat: 'id-statehouse-25-p2', composer: false, alias: 'id-hd-25-p2', route: '/district/id-hd-25-p2', pid: 'leavitt_id', h1: 'Idaho House District 25, Position B', where: 'District 25 as Idaho’s current legislative plan draws it', kick: 'House District 25, Position B board', kickTitle: 'The district board for Idaho House District 25, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-26-p1': { seat: 'id-statehouse-26-p1', composer: false, alias: 'id-hd-26-p1', route: '/district/id-hd-26-p1', pid: 'pohanka_id', h1: 'Idaho House District 26, Position A', where: 'District 26 as Idaho’s current legislative plan draws it', kick: 'House District 26, Position A board', kickTitle: 'The district board for Idaho House District 26, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-26-p2': { seat: 'id-statehouse-26-p2', composer: false, alias: 'id-hd-26-p2', route: '/district/id-hd-26-p2', pid: 'nelsen_id', h1: 'Idaho House District 26, Position B', where: 'District 26 as Idaho’s current legislative plan draws it', kick: 'House District 26, Position B board', kickTitle: 'The district board for Idaho House District 26, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-27-p1': { seat: 'id-statehouse-27-p1', composer: false, alias: 'id-hd-27-p1', route: '/district/id-hd-27-p1', pid: 'pickett_id', h1: 'Idaho House District 27, Position A', where: 'District 27 as Idaho’s current legislative plan draws it', kick: 'House District 27, Position A board', kickTitle: 'The district board for Idaho House District 27, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-27-p2': { seat: 'id-statehouse-27-p2', composer: false, alias: 'id-hd-27-p2', route: '/district/id-hd-27-p2', pid: 'handy_id', h1: 'Idaho House District 27, Position B', where: 'District 27 as Idaho’s current legislative plan draws it', kick: 'House District 27, Position B board', kickTitle: 'The district board for Idaho House District 27, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-28-p1': { seat: 'id-statehouse-28-p1', composer: false, alias: 'id-hd-28-p1', route: '/district/id-hd-28-p1', pid: 'cheatum_id', h1: 'Idaho House District 28, Position A', where: 'District 28 as Idaho’s current legislative plan draws it', kick: 'House District 28, Position A board', kickTitle: 'The district board for Idaho House District 28, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-28-p2': { seat: 'id-statehouse-28-p2', composer: false, alias: 'id-hd-28-p2', route: '/district/id-hd-28-p2', pid: 'garner_id', h1: 'Idaho House District 28, Position B', where: 'District 28 as Idaho’s current legislative plan draws it', kick: 'House District 28, Position B board', kickTitle: 'The district board for Idaho House District 28, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-29-p1': { seat: 'id-statehouse-29-p1', composer: false, alias: 'id-hd-29-p1', route: '/district/id-hd-29-p1', pid: 'manwaring_id', h1: 'Idaho House District 29, Position A', where: 'District 29 as Idaho’s current legislative plan draws it', kick: 'House District 29, Position A board', kickTitle: 'The district board for Idaho House District 29, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-29-p2': { seat: 'id-statehouse-29-p2', composer: false, alias: 'id-hd-29-p2', route: '/district/id-hd-29-p2', pid: 'burgoyne_id', h1: 'Idaho House District 29, Position B', where: 'District 29 as Idaho’s current legislative plan draws it', kick: 'House District 29, Position B board', kickTitle: 'The district board for Idaho House District 29, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-2-p1': { seat: 'id-statehouse-2-p1', composer: false, alias: 'id-hd-2-p1', route: '/district/id-hd-2-p1', pid: 'scott_id', h1: 'Idaho House District 2, Position A', where: 'District 2 as Idaho’s current legislative plan draws it', kick: 'House District 2, Position A board', kickTitle: 'The district board for Idaho House District 2, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-2-p2': { seat: 'id-statehouse-2-p2', composer: false, alias: 'id-hd-2-p2', route: '/district/id-hd-2-p2', pid: 'hawkins_id', h1: 'Idaho House District 2, Position B', where: 'District 2 as Idaho’s current legislative plan draws it', kick: 'House District 2, Position B board', kickTitle: 'The district board for Idaho House District 2, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-30-p1': { seat: 'id-statehouse-30-p1', composer: false, alias: 'id-hd-30-p1', route: '/district/id-hd-30-p1', pid: 'cannon_id', h1: 'Idaho House District 30, Position A', where: 'District 30 as Idaho’s current legislative plan draws it', kick: 'House District 30, Position A board', kickTitle: 'The district board for Idaho House District 30, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-30-p2': { seat: 'id-statehouse-30-p2', composer: false, alias: 'id-hd-30-p2', route: '/district/id-hd-30-p2', pid: 'fuhriman_id', h1: 'Idaho House District 30, Position B', where: 'District 30 as Idaho’s current legislative plan draws it', kick: 'House District 30, Position B board', kickTitle: 'The district board for Idaho House District 30, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-31-p1': { seat: 'id-statehouse-31-p1', composer: false, alias: 'id-hd-31-p1', route: '/district/id-hd-31-p1', pid: 'raymond_id', h1: 'Idaho House District 31, Position A', where: 'District 31 as Idaho’s current legislative plan draws it', kick: 'House District 31, Position A board', kickTitle: 'The district board for Idaho House District 31, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-31-p2': { seat: 'id-statehouse-31-p2', composer: false, alias: 'id-hd-31-p2', route: '/district/id-hd-31-p2', pid: 'furniss_id', h1: 'Idaho House District 31, Position B', where: 'District 31 as Idaho’s current legislative plan draws it', kick: 'House District 31, Position B board', kickTitle: 'The district board for Idaho House District 31, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-32-p1': { seat: 'id-statehouse-32-p1', composer: false, alias: 'id-hd-32-p1', route: '/district/id-hd-32-p1', pid: 'mickelsen_id', h1: 'Idaho House District 32, Position A', where: 'District 32 as Idaho’s current legislative plan draws it', kick: 'House District 32, Position A board', kickTitle: 'The district board for Idaho House District 32, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-32-p2': { seat: 'id-statehouse-32-p2', composer: false, alias: 'id-hd-32-p2', route: '/district/id-hd-32-p2', pid: 'bingham_id', h1: 'Idaho House District 32, Position B', where: 'District 32 as Idaho’s current legislative plan draws it', kick: 'House District 32, Position B board', kickTitle: 'The district board for Idaho House District 32, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-33-p1': { seat: 'id-statehouse-33-p1', composer: false, alias: 'id-hd-33-p1', route: '/district/id-hd-33-p1', pid: 'ehardt_id', h1: 'Idaho House District 33, Position A', where: 'District 33 as Idaho’s current legislative plan draws it', kick: 'House District 33, Position A board', kickTitle: 'The district board for Idaho House District 33, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-33-p2': { seat: 'id-statehouse-33-p2', composer: false, alias: 'id-hd-33-p2', route: '/district/id-hd-33-p2', pid: 'erickson_id', h1: 'Idaho House District 33, Position B', where: 'District 33 as Idaho’s current legislative plan draws it', kick: 'House District 33, Position B board', kickTitle: 'The district board for Idaho House District 33, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-34-p1': { seat: 'id-statehouse-34-p1', composer: false, alias: 'id-hd-34-p1', route: '/district/id-hd-34-p1', pid: 'weber_id', h1: 'Idaho House District 34, Position A', where: 'District 34 as Idaho’s current legislative plan draws it', kick: 'House District 34, Position A board', kickTitle: 'The district board for Idaho House District 34, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-34-p2': { seat: 'id-statehouse-34-p2', composer: false, alias: 'id-hd-34-p2', route: '/district/id-hd-34-p2', pid: 'raybould_id', h1: 'Idaho House District 34, Position B', where: 'District 34 as Idaho’s current legislative plan draws it', kick: 'House District 34, Position B board', kickTitle: 'The district board for Idaho House District 34, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-35-p1': { seat: 'id-statehouse-35-p1', composer: false, alias: 'id-hd-35-p1', route: '/district/id-hd-35-p1', pid: 'veile_id', h1: 'Idaho House District 35, Position A', where: 'District 35 as Idaho’s current legislative plan draws it', kick: 'House District 35, Position A board', kickTitle: 'The district board for Idaho House District 35, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-35-p2': { seat: 'id-statehouse-35-p2', composer: false, alias: 'id-hd-35-p2', route: '/district/id-hd-35-p2', pid: 'wheeler_id', h1: 'Idaho House District 35, Position B', where: 'District 35 as Idaho’s current legislative plan draws it', kick: 'House District 35, Position B board', kickTitle: 'The district board for Idaho House District 35, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-3-p1': { seat: 'id-statehouse-3-p1', composer: false, alias: 'id-hd-3-p1', route: '/district/id-hd-3-p1', pid: 'barbieri_id', h1: 'Idaho House District 3, Position A', where: 'District 3 as Idaho’s current legislative plan draws it', kick: 'House District 3, Position A board', kickTitle: 'The district board for Idaho House District 3, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-3-p2': { seat: 'id-statehouse-3-p2', composer: false, alias: 'id-hd-3-p2', route: '/district/id-hd-3-p2', pid: 'redman_id', h1: 'Idaho House District 3, Position B', where: 'District 3 as Idaho’s current legislative plan draws it', kick: 'House District 3, Position B board', kickTitle: 'The district board for Idaho House District 3, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-4-p1': { seat: 'id-statehouse-4-p1', composer: false, alias: 'id-hd-4-p1', route: '/district/id-hd-4-p1', pid: 'alfieri_id', h1: 'Idaho House District 4, Position A', where: 'District 4 as Idaho’s current legislative plan draws it', kick: 'House District 4, Position A board', kickTitle: 'The district board for Idaho House District 4, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-4-p2': { seat: 'id-statehouse-4-p2', composer: false, alias: 'id-hd-4-p2', route: '/district/id-hd-4-p2', pid: 'price_id', h1: 'Idaho House District 4, Position B', where: 'District 4 as Idaho’s current legislative plan draws it', kick: 'House District 4, Position B board', kickTitle: 'The district board for Idaho House District 4, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-5-p1': { seat: 'id-statehouse-5-p1', composer: false, alias: 'id-hd-5-p1', route: '/district/id-hd-5-p1', pid: 'mendive_id', h1: 'Idaho House District 5, Position A', where: 'District 5 as Idaho’s current legislative plan draws it', kick: 'House District 5, Position A board', kickTitle: 'The district board for Idaho House District 5, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-5-p2': { seat: 'id-statehouse-5-p2', composer: false, alias: 'id-hd-5-p2', route: '/district/id-hd-5-p2', pid: 'wisniewski_id', h1: 'Idaho House District 5, Position B', where: 'District 5 as Idaho’s current legislative plan draws it', kick: 'House District 5, Position B board', kickTitle: 'The district board for Idaho House District 5, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-6-p1': { seat: 'id-statehouse-6-p1', composer: false, alias: 'id-hd-6-p1', route: '/district/id-hd-6-p1', pid: 'mccann_id', h1: 'Idaho House District 6, Position A', where: 'District 6 as Idaho’s current legislative plan draws it', kick: 'House District 6, Position A board', kickTitle: 'The district board for Idaho House District 6, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-6-p2': { seat: 'id-statehouse-6-p2', composer: false, alias: 'id-hd-6-p2', route: '/district/id-hd-6-p2', pid: 'mitchell_id', h1: 'Idaho House District 6, Position B', where: 'District 6 as Idaho’s current legislative plan draws it', kick: 'House District 6, Position B board', kickTitle: 'The district board for Idaho House District 6, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-7-p1': { seat: 'id-statehouse-7-p1', composer: false, alias: 'id-hd-7-p1', route: '/district/id-hd-7-p1', pid: 'harris_id', h1: 'Idaho House District 7, Position A', where: 'District 7 as Idaho’s current legislative plan draws it', kick: 'House District 7, Position A board', kickTitle: 'The district board for Idaho House District 7, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-7-p2': { seat: 'id-statehouse-7-p2', composer: false, alias: 'id-hd-7-p2', route: '/district/id-hd-7-p2', pid: 'shepherd_id', h1: 'Idaho House District 7, Position B', where: 'District 7 as Idaho’s current legislative plan draws it', kick: 'House District 7, Position B board', kickTitle: 'The district board for Idaho House District 7, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-8-p1': { seat: 'id-statehouse-8-p1', composer: false, alias: 'id-hd-8-p1', route: '/district/id-hd-8-p1', pid: 'beiswenger_id', h1: 'Idaho House District 8, Position A', where: 'District 8 as Idaho’s current legislative plan draws it', kick: 'House District 8, Position A board', kickTitle: 'The district board for Idaho House District 8, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-8-p2': { seat: 'id-statehouse-8-p2', composer: false, alias: 'id-hd-8-p2', route: '/district/id-hd-8-p2', pid: 'thompson_id', h1: 'Idaho House District 8, Position B', where: 'District 8 as Idaho’s current legislative plan draws it', kick: 'House District 8, Position B board', kickTitle: 'The district board for Idaho House District 8, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-9-p1': { seat: 'id-statehouse-9-p1', composer: false, alias: 'id-hd-9-p1', route: '/district/id-hd-9-p1', pid: 'shirts_id', h1: 'Idaho House District 9, Position A', where: 'District 9 as Idaho’s current legislative plan draws it', kick: 'House District 9, Position A board', kickTitle: 'The district board for Idaho House District 9, Position A: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statehouse-9-p2': { seat: 'id-statehouse-9-p2', composer: false, alias: 'id-hd-9-p2', route: '/district/id-hd-9-p2', pid: 'boyle_id', h1: 'Idaho House District 9, Position B', where: 'District 9 as Idaho’s current legislative plan draws it', kick: 'House District 9, Position B board', kickTitle: 'The district board for Idaho House District 9, Position B: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-1': { seat: 'id-statesenate-1', composer: false, alias: 'id-sd-1', route: '/district/id-sd-1', pid: 'woodward_id', h1: 'Idaho Senate District 1', where: 'District 1 as Idaho’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Idaho Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-10': { seat: 'id-statesenate-10', composer: false, alias: 'id-sd-10', route: '/district/id-sd-10', pid: 'nichols_id', h1: 'Idaho Senate District 10', where: 'District 10 as Idaho’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Idaho Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-11': { seat: 'id-statesenate-11', composer: false, alias: 'id-sd-11', route: '/district/id-sd-11', pid: 'blaylock_id', h1: 'Idaho Senate District 11', where: 'District 11 as Idaho’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Idaho Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-12': { seat: 'id-statesenate-12', composer: false, alias: 'id-sd-12', route: '/district/id-sd-12', pid: 'adams_id', h1: 'Idaho Senate District 12', where: 'District 12 as Idaho’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Idaho Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-13': { seat: 'id-statesenate-13', composer: false, alias: 'id-sd-13', route: '/district/id-sd-13', pid: 'lenney_id', h1: 'Idaho Senate District 13', where: 'District 13 as Idaho’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Idaho Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-14': { seat: 'id-statesenate-14', composer: false, alias: 'id-sd-14', route: '/district/id-sd-14', pid: 'grow_id', h1: 'Idaho Senate District 14', where: 'District 14 as Idaho’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Idaho Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-15': { seat: 'id-statesenate-15', composer: false, alias: 'id-sd-15', route: '/district/id-sd-15', pid: 'galloway_id', h1: 'Idaho Senate District 15', where: 'District 15 as Idaho’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Idaho Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-16': { seat: 'id-statesenate-16', composer: false, alias: 'id-sd-16', route: '/district/id-sd-16', pid: 'rabe_id', h1: 'Idaho Senate District 16', where: 'District 16 as Idaho’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Idaho Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-17': { seat: 'id-statesenate-17', composer: false, alias: 'id-sd-17', route: '/district/id-sd-17', pid: 'semmelroth_id', h1: 'Idaho Senate District 17', where: 'District 17 as Idaho’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Idaho Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-18': { seat: 'id-statesenate-18', composer: false, alias: 'id-sd-18', route: '/district/id-sd-18', pid: 'ward_engelking_id', h1: 'Idaho Senate District 18', where: 'District 18 as Idaho’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Idaho Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-19': { seat: 'id-statesenate-19', composer: false, alias: 'id-sd-19', route: '/district/id-sd-19', pid: 'melissa_wintrow', h1: 'Idaho Senate District 19', where: 'District 19 as Idaho’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Idaho Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-2': { seat: 'id-statesenate-2', composer: false, alias: 'id-sd-2', route: '/district/id-sd-2', pid: 'hart_id', h1: 'Idaho Senate District 2', where: 'District 2 as Idaho’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Idaho Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-20': { seat: 'id-statesenate-20', composer: false, alias: 'id-sd-20', route: '/district/id-sd-20', pid: 'keyser_id', h1: 'Idaho Senate District 20', where: 'District 20 as Idaho’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Idaho Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-21': { seat: 'id-statesenate-21', composer: false, alias: 'id-sd-21', route: '/district/id-sd-21', pid: 'bernt_id', h1: 'Idaho Senate District 21', where: 'District 21 as Idaho’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Idaho Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-22': { seat: 'id-statesenate-22', composer: false, alias: 'id-sd-22', route: '/district/id-sd-22', pid: 'lori_den_hartog', h1: 'Idaho Senate District 22', where: 'District 22 as Idaho’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Idaho Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-23': { seat: 'id-statesenate-23', composer: false, alias: 'id-sd-23', route: '/district/id-sd-23', pid: 'lakey_id', h1: 'Idaho Senate District 23', where: 'District 23 as Idaho’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Idaho Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-24': { seat: 'id-statesenate-24', composer: false, alias: 'id-sd-24', route: '/district/id-sd-24', pid: 'zuiderveld_id', h1: 'Idaho Senate District 24', where: 'District 24 as Idaho’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Idaho Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-25': { seat: 'id-statesenate-25', composer: false, alias: 'id-sd-25', route: '/district/id-sd-25', pid: 'kohl_id', h1: 'Idaho Senate District 25', where: 'District 25 as Idaho’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Idaho Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-26': { seat: 'id-statesenate-26', composer: false, alias: 'id-sd-26', route: '/district/id-sd-26', pid: 'taylor_id', h1: 'Idaho Senate District 26', where: 'District 26 as Idaho’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Idaho Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-27': { seat: 'id-statesenate-27', composer: false, alias: 'id-sd-27', route: '/district/id-sd-27', pid: 'kelly_anthon', h1: 'Idaho Senate District 27', where: 'District 27 as Idaho’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Idaho Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-28': { seat: 'id-statesenate-28', composer: false, alias: 'id-sd-28', route: '/district/id-sd-28', pid: 'guthrie_id', h1: 'Idaho Senate District 28', where: 'District 28 as Idaho’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Idaho Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-29': { seat: 'id-statesenate-29', composer: false, alias: 'id-sd-29', route: '/district/id-sd-29', pid: 'ruchti_id', h1: 'Idaho Senate District 29', where: 'District 29 as Idaho’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Idaho Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-3': { seat: 'id-statesenate-3', composer: false, alias: 'id-sd-3', route: '/district/id-sd-3', pid: 'okuniewicz_id', h1: 'Idaho Senate District 3', where: 'District 3 as Idaho’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Idaho Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-30': { seat: 'id-statesenate-30', composer: false, alias: 'id-sd-30', route: '/district/id-sd-30', pid: 'vanorden_id', h1: 'Idaho Senate District 30', where: 'District 30 as Idaho’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Idaho Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-31': { seat: 'id-statesenate-31', composer: false, alias: 'id-sd-31', route: '/district/id-sd-31', pid: 'burtenshaw_id', h1: 'Idaho Senate District 31', where: 'District 31 as Idaho’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Idaho Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-32': { seat: 'id-statesenate-32', composer: false, alias: 'id-sd-32', route: '/district/id-sd-32', pid: 'cook_id', h1: 'Idaho Senate District 32', where: 'District 32 as Idaho’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Idaho Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-33': { seat: 'id-statesenate-33', composer: false, alias: 'id-sd-33', route: '/district/id-sd-33', pid: 'lent_id', h1: 'Idaho Senate District 33', where: 'District 33 as Idaho’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Idaho Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-34': { seat: 'id-statesenate-34', composer: false, alias: 'id-sd-34', route: '/district/id-sd-34', pid: 'ricks_id', h1: 'Idaho Senate District 34', where: 'District 34 as Idaho’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Idaho Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-35': { seat: 'id-statesenate-35', composer: false, alias: 'id-sd-35', route: '/district/id-sd-35', pid: 'mark_harris_id', h1: 'Idaho Senate District 35', where: 'District 35 as Idaho’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Idaho Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-4': { seat: 'id-statesenate-4', composer: false, alias: 'id-sd-4', route: '/district/id-sd-4', pid: 'toews_id', h1: 'Idaho Senate District 4', where: 'District 4 as Idaho’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Idaho Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-5': { seat: 'id-statesenate-5', composer: false, alias: 'id-sd-5', route: '/district/id-sd-5', pid: 'bjerke_id', h1: 'Idaho Senate District 5', where: 'District 5 as Idaho’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Idaho Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-6': { seat: 'id-statesenate-6', composer: false, alias: 'id-sd-6', route: '/district/id-sd-6', pid: 'foreman_id', h1: 'Idaho Senate District 6', where: 'District 6 as Idaho’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Idaho Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-7': { seat: 'id-statesenate-7', composer: false, alias: 'id-sd-7', route: '/district/id-sd-7', pid: 'carlson_id', h1: 'Idaho Senate District 7', where: 'District 7 as Idaho’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Idaho Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-8': { seat: 'id-statesenate-8', composer: false, alias: 'id-sd-8', route: '/district/id-sd-8', pid: 'zito_id', h1: 'Idaho Senate District 8', where: 'District 8 as Idaho’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Idaho Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'id-statesenate-9': { seat: 'id-statesenate-9', composer: false, alias: 'id-sd-9', route: '/district/id-sd-9', pid: 'shippy_id', h1: 'Idaho Senate District 9', where: 'District 9 as Idaho’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Idaho Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-57': { seat: 'il-statesenate-57', composer: true, alias: 'il-sd-57', route: '/district/il-sd-57', pid: 'belt_il', h1: 'Illinois Senate District 57', where: 'District 57 as Illinois’s current legislative plan draws it', kick: 'Senate District 57 board', kickTitle: 'The district board for Illinois Senate District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-36': { seat: 'il-statesenate-36', composer: true, alias: 'il-sd-36', route: '/district/il-sd-36', pid: 'halpin_il', h1: 'Illinois Senate District 36', where: 'District 36 as Illinois’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Illinois Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-56': { seat: 'il-statesenate-56', composer: true, alias: 'il-sd-56', route: '/district/il-sd-56', pid: 'harriss_il', h1: 'Illinois Senate District 56', where: 'District 56 as Illinois’s current legislative plan draws it', kick: 'Senate District 56 board', kickTitle: 'The district board for Illinois Senate District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-26': { seat: 'il-statesenate-26', composer: true, alias: 'il-sd-26', route: '/district/il-sd-26', pid: 'hills_il', h1: 'Illinois Senate District 26', where: 'District 26 as Illinois’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Illinois Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-24': { seat: 'il-statesenate-24', composer: true, alias: 'il-sd-24', route: '/district/il-sd-24', pid: 'lewis_il', h1: 'Illinois Senate District 24', where: 'District 24 as Illinois’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Illinois Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statesenate-48': { seat: 'il-statesenate-48', composer: true, alias: 'il-sd-48', route: '/district/il-sd-48', pid: 'doris_turner_il', h1: 'Illinois Senate District 48', where: 'District 48 as Illinois’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Illinois Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-76': { seat: 'il-statehouse-76', composer: true, alias: 'il-hd-76', route: '/district/il-hd-76', pid: 'briel_il', h1: 'Illinois House District 76', where: 'District 76 as Illinois’s current legislative plan draws it', kick: 'House District 76 board', kickTitle: 'The district board for Illinois House District 76: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-97': { seat: 'il-statehouse-97', composer: true, alias: 'il-hd-97', route: '/district/il-hd-97', pid: 'heitman_il', h1: 'Illinois House District 97', where: 'District 97 as Illinois’s current legislative plan draws it', kick: 'House District 97 board', kickTitle: 'The district board for Illinois House District 97: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-70': { seat: 'il-statehouse-70', composer: true, alias: 'il-hd-70', route: '/district/il-hd-70', pid: 'keicher_il', h1: 'Illinois House District 70', where: 'District 70 as Illinois’s current legislative plan draws it', kick: 'House District 70 board', kickTitle: 'The district board for Illinois House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-52': { seat: 'il-statehouse-52', composer: true, alias: 'il-hd-52', route: '/district/il-hd-52', pid: 'mclaughlin_il', h1: 'Illinois House District 52', where: 'District 52 as Illinois’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Illinois House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-114': { seat: 'il-statehouse-114', composer: true, alias: 'il-hd-114', route: '/district/il-hd-114', pid: 'schmidt_il', h1: 'Illinois House District 114', where: 'District 114 as Illinois’s current legislative plan draws it', kick: 'House District 114 board', kickTitle: 'The district board for Illinois House District 114: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-104': { seat: 'il-statehouse-104', composer: true, alias: 'il-hd-104', route: '/district/il-hd-104', pid: 'schweizer_il', h1: 'Illinois House District 104', where: 'District 104 as Illinois’s current legislative plan draws it', kick: 'House District 104 board', kickTitle: 'The district board for Illinois House District 104: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-112': { seat: 'il-statehouse-112', composer: true, alias: 'il-hd-112', route: '/district/il-hd-112', pid: 'stuart_il', h1: 'Illinois House District 112', where: 'District 112 as Illinois’s current legislative plan draws it', kick: 'House District 112 board', kickTitle: 'The district board for Illinois House District 112: who is in the room and what is on the table. A place, not a scorecard.' },
    'il-statehouse-65': { seat: 'il-statehouse-65', composer: true, alias: 'il-hd-65', route: '/district/il-hd-65', pid: 'ugaste_il', h1: 'Illinois House District 65', where: 'District 65 as Illinois’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Illinois House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-132': { seat: 'me-statehouse-132', composer: false, alias: 'me-hd-132', route: '/district/me-hd-132', pid: 'ryan_fecteau', h1: 'Maine House District 132', where: 'District 132 as Maine’s current legislative plan draws it', kick: 'House District 132 board', kickTitle: 'The district board for Maine House District 132: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-1': { seat: 'me-statehouse-1', composer: false, alias: 'me-hd-1', route: '/district/me-hd-1', pid: 'daigle_me', h1: 'Maine House District 1', where: 'District 1 as Maine’s current legislative plan draws it', kick: 'House District 1 board', kickTitle: 'The district board for Maine House District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-2': { seat: 'me-statehouse-2', composer: false, alias: 'me-hd-2', route: '/district/me-hd-2', pid: 'albert_me', h1: 'Maine House District 2', where: 'District 2 as Maine’s current legislative plan draws it', kick: 'House District 2 board', kickTitle: 'The district board for Maine House District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-3': { seat: 'me-statehouse-3', composer: false, alias: 'me-hd-3', route: '/district/me-hd-3', pid: 'babin_me', h1: 'Maine House District 3', where: 'District 3 as Maine’s current legislative plan draws it', kick: 'House District 3 board', kickTitle: 'The district board for Maine House District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-4': { seat: 'me-statehouse-4', composer: false, alias: 'me-hd-4', route: '/district/me-hd-4', pid: 'guerrette_me', h1: 'Maine House District 4', where: 'District 4 as Maine’s current legislative plan draws it', kick: 'House District 4 board', kickTitle: 'The district board for Maine House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-5': { seat: 'me-statehouse-5', composer: false, alias: 'me-hd-5', route: '/district/me-hd-5', pid: 'underwood_me', h1: 'Maine House District 5', where: 'District 5 as Maine’s current legislative plan draws it', kick: 'House District 5 board', kickTitle: 'The district board for Maine House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-6': { seat: 'me-statehouse-6', composer: false, alias: 'me-hd-6', route: '/district/me-hd-6', pid: 'ardell_me', h1: 'Maine House District 6', where: 'District 6 as Maine’s current legislative plan draws it', kick: 'House District 6 board', kickTitle: 'The district board for Maine House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-7': { seat: 'me-statehouse-7', composer: false, alias: 'me-hd-7', route: '/district/me-hd-7', pid: 'swallow_me', h1: 'Maine House District 7', where: 'District 7 as Maine’s current legislative plan draws it', kick: 'House District 7 board', kickTitle: 'The district board for Maine House District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-8': { seat: 'me-statehouse-8', composer: false, alias: 'me-hd-8', route: '/district/me-hd-8', pid: 'quint_me', h1: 'Maine House District 8', where: 'District 8 as Maine’s current legislative plan draws it', kick: 'House District 8 board', kickTitle: 'The district board for Maine House District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-9': { seat: 'me-statehouse-9', composer: false, alias: 'me-hd-9', route: '/district/me-hd-9', pid: 'mingo_me', h1: 'Maine House District 9', where: 'District 9 as Maine’s current legislative plan draws it', kick: 'House District 9 board', kickTitle: 'The district board for Maine House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-10': { seat: 'me-statehouse-10', composer: false, alias: 'me-hd-10', route: '/district/me-hd-10', pid: 'tuell_me', h1: 'Maine House District 10', where: 'District 10 as Maine’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Maine House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-11': { seat: 'me-statehouse-11', composer: false, alias: 'me-hd-11', route: '/district/me-hd-11', pid: 'strout_me', h1: 'Maine House District 11', where: 'District 11 as Maine’s current legislative plan draws it', kick: 'House District 11 board', kickTitle: 'The district board for Maine House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-12': { seat: 'me-statehouse-12', composer: false, alias: 'me-hd-12', route: '/district/me-hd-12', pid: 'faulkingham_me', h1: 'Maine House District 12', where: 'District 12 as Maine’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Maine House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-13': { seat: 'me-statehouse-13', composer: false, alias: 'me-hd-13', route: '/district/me-hd-13', pid: 'white_me', h1: 'Maine House District 13', where: 'District 13 as Maine’s current legislative plan draws it', kick: 'House District 13 board', kickTitle: 'The district board for Maine House District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-14': { seat: 'me-statehouse-14', composer: false, alias: 'me-hd-14', route: '/district/me-hd-14', pid: 'friedmann_me', h1: 'Maine House District 14', where: 'District 14 as Maine’s current legislative plan draws it', kick: 'House District 14 board', kickTitle: 'The district board for Maine House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-15': { seat: 'me-statehouse-15', composer: false, alias: 'me-hd-15', route: '/district/me-hd-15', pid: 'eaton_me', h1: 'Maine House District 15', where: 'District 15 as Maine’s current legislative plan draws it', kick: 'House District 15 board', kickTitle: 'The district board for Maine House District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-16': { seat: 'me-statehouse-16', composer: false, alias: 'me-hd-16', route: '/district/me-hd-16', pid: 'milliken_me', h1: 'Maine House District 16', where: 'District 16 as Maine’s current legislative plan draws it', kick: 'House District 16 board', kickTitle: 'The district board for Maine House District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-17': { seat: 'me-statehouse-17', composer: false, alias: 'me-hd-17', route: '/district/me-hd-17', pid: 'bishop_me', h1: 'Maine House District 17', where: 'District 17 as Maine’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Maine House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-18': { seat: 'me-statehouse-18', composer: false, alias: 'me-hd-18', route: '/district/me-hd-18', pid: 'mcintyre_me', h1: 'Maine House District 18', where: 'District 18 as Maine’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Maine House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-19': { seat: 'me-statehouse-19', composer: false, alias: 'me-hd-19', route: '/district/me-hd-19', pid: 'campbell_me', h1: 'Maine House District 19', where: 'District 19 as Maine’s current legislative plan draws it', kick: 'House District 19 board', kickTitle: 'The district board for Maine House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-20': { seat: 'me-statehouse-20', composer: false, alias: 'me-hd-20', route: '/district/me-hd-20', pid: 'o_halloran_me', h1: 'Maine House District 20', where: 'District 20 as Maine’s current legislative plan draws it', kick: 'House District 20 board', kickTitle: 'The district board for Maine House District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-21': { seat: 'me-statehouse-21', composer: false, alias: 'me-hd-21', route: '/district/me-hd-21', pid: 'rana_me', h1: 'Maine House District 21', where: 'District 21 as Maine’s current legislative plan draws it', kick: 'House District 21 board', kickTitle: 'The district board for Maine House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-22': { seat: 'me-statehouse-22', composer: false, alias: 'me-hd-22', route: '/district/me-hd-22', pid: 'supica_me', h1: 'Maine House District 22', where: 'District 22 as Maine’s current legislative plan draws it', kick: 'House District 22 board', kickTitle: 'The district board for Maine House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-23': { seat: 'me-statehouse-23', composer: false, alias: 'me-hd-23', route: '/district/me-hd-23', pid: 'roeder_me', h1: 'Maine House District 23', where: 'District 23 as Maine’s current legislative plan draws it', kick: 'House District 23 board', kickTitle: 'The district board for Maine House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-24': { seat: 'me-statehouse-24', composer: false, alias: 'me-hd-24', route: '/district/me-hd-24', pid: 'faircloth_me', h1: 'Maine House District 24', where: 'District 24 as Maine’s current legislative plan draws it', kick: 'House District 24 board', kickTitle: 'The district board for Maine House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-25': { seat: 'me-statehouse-25', composer: false, alias: 'me-hd-25', route: '/district/me-hd-25', pid: 'osher_me', h1: 'Maine House District 25', where: 'District 25 as Maine’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for Maine House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-26': { seat: 'me-statehouse-26', composer: false, alias: 'me-hd-26', route: '/district/me-hd-26', pid: 'dill_me', h1: 'Maine House District 26', where: 'District 26 as Maine’s current legislative plan draws it', kick: 'House District 26 board', kickTitle: 'The district board for Maine House District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-27': { seat: 'me-statehouse-27', composer: false, alias: 'me-hd-27', route: '/district/me-hd-27', pid: 'drinkwater_me', h1: 'Maine House District 27', where: 'District 27 as Maine’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Maine House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-28': { seat: 'me-statehouse-28', composer: false, alias: 'me-hd-28', route: '/district/me-hd-28', pid: 'gifford_me', h1: 'Maine House District 28', where: 'District 28 as Maine’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Maine House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-29': { seat: 'me-statehouse-29', composer: false, alias: 'me-hd-29', route: '/district/me-hd-29', pid: 'theriault_me', h1: 'Maine House District 29', where: 'District 29 as Maine’s current legislative plan draws it', kick: 'House District 29 board', kickTitle: 'The district board for Maine House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-30': { seat: 'me-statehouse-30', composer: false, alias: 'me-hd-30', route: '/district/me-hd-30', pid: 'jim_white_me', h1: 'Maine House District 30', where: 'District 30 as Maine’s current legislative plan draws it', kick: 'House District 30 board', kickTitle: 'The district board for Maine House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-31': { seat: 'me-statehouse-31', composer: false, alias: 'me-hd-31', route: '/district/me-hd-31', pid: 'perkins_me', h1: 'Maine House District 31', where: 'District 31 as Maine’s current legislative plan draws it', kick: 'House District 31 board', kickTitle: 'The district board for Maine House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-32': { seat: 'me-statehouse-32', composer: false, alias: 'me-hd-32', route: '/district/me-hd-32', pid: 'foster_me', h1: 'Maine House District 32', where: 'District 32 as Maine’s current legislative plan draws it', kick: 'House District 32 board', kickTitle: 'The district board for Maine House District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-33': { seat: 'me-statehouse-33', composer: false, alias: 'me-hd-33', route: '/district/me-hd-33', pid: 'fredette_me', h1: 'Maine House District 33', where: 'District 33 as Maine’s current legislative plan draws it', kick: 'House District 33 board', kickTitle: 'The district board for Maine House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-34': { seat: 'me-statehouse-34', composer: false, alias: 'me-hd-34', route: '/district/me-hd-34', pid: 'griffin_me', h1: 'Maine House District 34', where: 'District 34 as Maine’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Maine House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-35': { seat: 'me-statehouse-35', composer: false, alias: 'me-hd-35', route: '/district/me-hd-35', pid: 'thorne_me', h1: 'Maine House District 35', where: 'District 35 as Maine’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Maine House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-36': { seat: 'me-statehouse-36', composer: false, alias: 'me-hd-36', route: '/district/me-hd-36', pid: 'haggan_me', h1: 'Maine House District 36', where: 'District 36 as Maine’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Maine House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-37': { seat: 'me-statehouse-37', composer: false, alias: 'me-hd-37', route: '/district/me-hd-37', pid: 'paul_me', h1: 'Maine House District 37', where: 'District 37 as Maine’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Maine House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-38': { seat: 'me-statehouse-38', composer: false, alias: 'me-hd-38', route: '/district/me-hd-38', pid: 'hymes_me', h1: 'Maine House District 38', where: 'District 38 as Maine’s current legislative plan draws it', kick: 'House District 38 board', kickTitle: 'The district board for Maine House District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-39': { seat: 'me-statehouse-39', composer: false, alias: 'me-hd-39', route: '/district/me-hd-39', pid: 'dodge_me', h1: 'Maine House District 39', where: 'District 39 as Maine’s current legislative plan draws it', kick: 'House District 39 board', kickTitle: 'The district board for Maine House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-40': { seat: 'me-statehouse-40', composer: false, alias: 'me-hd-40', route: '/district/me-hd-40', pid: 'ray_me', h1: 'Maine House District 40', where: 'District 40 as Maine’s current legislative plan draws it', kick: 'House District 40 board', kickTitle: 'The district board for Maine House District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-41': { seat: 'me-statehouse-41', composer: false, alias: 'me-hd-41', route: '/district/me-hd-41', pid: 'doudera_me', h1: 'Maine House District 41', where: 'District 41 as Maine’s current legislative plan draws it', kick: 'House District 41 board', kickTitle: 'The district board for Maine House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-42': { seat: 'me-statehouse-42', composer: false, alias: 'me-hd-42', route: '/district/me-hd-42', pid: 'geiger_me', h1: 'Maine House District 42', where: 'District 42 as Maine’s current legislative plan draws it', kick: 'House District 42 board', kickTitle: 'The district board for Maine House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-43': { seat: 'me-statehouse-43', composer: false, alias: 'me-hd-43', route: '/district/me-hd-43', pid: 'matlack_me', h1: 'Maine House District 43', where: 'District 43 as Maine’s current legislative plan draws it', kick: 'House District 43 board', kickTitle: 'The district board for Maine House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-44': { seat: 'me-statehouse-44', composer: false, alias: 'me-hd-44', route: '/district/me-hd-44', pid: 'pluecker_me', h1: 'Maine House District 44', where: 'District 44 as Maine’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Maine House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-45': { seat: 'me-statehouse-45', composer: false, alias: 'me-hd-45', route: '/district/me-hd-45', pid: 'simmons_me', h1: 'Maine House District 45', where: 'District 45 as Maine’s current legislative plan draws it', kick: 'House District 45 board', kickTitle: 'The district board for Maine House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-46': { seat: 'me-statehouse-46', composer: false, alias: 'me-hd-46', route: '/district/me-hd-46', pid: 'crafts_me', h1: 'Maine House District 46', where: 'District 46 as Maine’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Maine House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-47': { seat: 'me-statehouse-47', composer: false, alias: 'me-hd-47', route: '/district/me-hd-47', pid: 'farrin_me', h1: 'Maine House District 47', where: 'District 47 as Maine’s current legislative plan draws it', kick: 'House District 47 board', kickTitle: 'The district board for Maine House District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-48': { seat: 'me-statehouse-48', composer: false, alias: 'me-hd-48', route: '/district/me-hd-48', pid: 'stover_me', h1: 'Maine House District 48', where: 'District 48 as Maine’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Maine House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-49': { seat: 'me-statehouse-49', composer: false, alias: 'me-hd-49', route: '/district/me-hd-49', pid: 'hepler_me', h1: 'Maine House District 49', where: 'District 49 as Maine’s current legislative plan draws it', kick: 'House District 49 board', kickTitle: 'The district board for Maine House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-50': { seat: 'me-statehouse-50', composer: false, alias: 'me-hd-50', route: '/district/me-hd-50', pid: 'sinclair_me', h1: 'Maine House District 50', where: 'District 50 as Maine’s current legislative plan draws it', kick: 'House District 50 board', kickTitle: 'The district board for Maine House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-51': { seat: 'me-statehouse-51', composer: false, alias: 'me-hd-51', route: '/district/me-hd-51', pid: 'macias_me', h1: 'Maine House District 51', where: 'District 51 as Maine’s current legislative plan draws it', kick: 'House District 51 board', kickTitle: 'The district board for Maine House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-52': { seat: 'me-statehouse-52', composer: false, alias: 'me-hd-52', route: '/district/me-hd-52', pid: 'cluchey_me', h1: 'Maine House District 52', where: 'District 52 as Maine’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Maine House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-53': { seat: 'me-statehouse-53', composer: false, alias: 'me-hd-53', route: '/district/me-hd-53', pid: 'lemelin_me', h1: 'Maine House District 53', where: 'District 53 as Maine’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Maine House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-54': { seat: 'me-statehouse-54', composer: false, alias: 'me-hd-54', route: '/district/me-hd-54', pid: 'montell_me', h1: 'Maine House District 54', where: 'District 54 as Maine’s current legislative plan draws it', kick: 'House District 54 board', kickTitle: 'The district board for Maine House District 54: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-55': { seat: 'me-statehouse-55', composer: false, alias: 'me-hd-55', route: '/district/me-hd-55', pid: 'shagoury_me', h1: 'Maine House District 55', where: 'District 55 as Maine’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Maine House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-56': { seat: 'me-statehouse-56', composer: false, alias: 'me-hd-56', route: '/district/me-hd-56', pid: 'greenwood_me', h1: 'Maine House District 56', where: 'District 56 as Maine’s current legislative plan draws it', kick: 'House District 56 board', kickTitle: 'The district board for Maine House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-57': { seat: 'me-statehouse-57', composer: false, alias: 'me-hd-57', route: '/district/me-hd-57', pid: 'hasenfus_me', h1: 'Maine House District 57', where: 'District 57 as Maine’s current legislative plan draws it', kick: 'House District 57 board', kickTitle: 'The district board for Maine House District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-58': { seat: 'me-statehouse-58', composer: false, alias: 'me-hd-58', route: '/district/me-hd-58', pid: 'frost_me', h1: 'Maine House District 58', where: 'District 58 as Maine’s current legislative plan draws it', kick: 'House District 58 board', kickTitle: 'The district board for Maine House District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-59': { seat: 'me-statehouse-59', composer: false, alias: 'me-hd-59', route: '/district/me-hd-59', pid: 'rollins_me', h1: 'Maine House District 59', where: 'District 59 as Maine’s current legislative plan draws it', kick: 'House District 59 board', kickTitle: 'The district board for Maine House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-60': { seat: 'me-statehouse-60', composer: false, alias: 'me-hd-60', route: '/district/me-hd-60', pid: 'bridgeo_me', h1: 'Maine House District 60', where: 'District 60 as Maine’s current legislative plan draws it', kick: 'House District 60 board', kickTitle: 'The district board for Maine House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-61': { seat: 'me-statehouse-61', composer: false, alias: 'me-hd-61', route: '/district/me-hd-61', pid: 'collins_me', h1: 'Maine House District 61', where: 'District 61 as Maine’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Maine House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-62': { seat: 'me-statehouse-62', composer: false, alias: 'me-hd-62', route: '/district/me-hd-62', pid: 'smith_me', h1: 'Maine House District 62', where: 'District 62 as Maine’s current legislative plan draws it', kick: 'House District 62 board', kickTitle: 'The district board for Maine House District 62: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-63': { seat: 'me-statehouse-63', composer: false, alias: 'me-hd-63', route: '/district/me-hd-63', pid: 'flynn_me', h1: 'Maine House District 63', where: 'District 63 as Maine’s current legislative plan draws it', kick: 'House District 63 board', kickTitle: 'The district board for Maine House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-64': { seat: 'me-statehouse-64', composer: false, alias: 'me-hd-64', route: '/district/me-hd-64', pid: 'debrito_me', h1: 'Maine House District 64', where: 'District 64 as Maine’s current legislative plan draws it', kick: 'House District 64 board', kickTitle: 'The district board for Maine House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-65': { seat: 'me-statehouse-65', composer: false, alias: 'me-hd-65', route: '/district/me-hd-65', pid: 'julia_me', h1: 'Maine House District 65', where: 'District 65 as Maine’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Maine House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-66': { seat: 'me-statehouse-66', composer: false, alias: 'me-hd-66', route: '/district/me-hd-66', pid: 'nutting_me', h1: 'Maine House District 66', where: 'District 66 as Maine’s current legislative plan draws it', kick: 'House District 66 board', kickTitle: 'The district board for Maine House District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-67': { seat: 'me-statehouse-67', composer: false, alias: 'me-hd-67', route: '/district/me-hd-67', pid: 'rudnicki_me', h1: 'Maine House District 67', where: 'District 67 as Maine’s current legislative plan draws it', kick: 'House District 67 board', kickTitle: 'The district board for Maine House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-68': { seat: 'me-statehouse-68', composer: false, alias: 'me-hd-68', route: '/district/me-hd-68', pid: 'collamore_me', h1: 'Maine House District 68', where: 'District 68 as Maine’s current legislative plan draws it', kick: 'House District 68 board', kickTitle: 'The district board for Maine House District 68: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-69': { seat: 'me-statehouse-69', composer: false, alias: 'me-hd-69', route: '/district/me-hd-69', pid: 'cray_me', h1: 'Maine House District 69', where: 'District 69 as Maine’s current legislative plan draws it', kick: 'House District 69 board', kickTitle: 'The district board for Maine House District 69: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-70': { seat: 'me-statehouse-70', composer: false, alias: 'me-hd-70', route: '/district/me-hd-70', pid: 'poirier_me', h1: 'Maine House District 70', where: 'District 70 as Maine’s current legislative plan draws it', kick: 'House District 70 board', kickTitle: 'The district board for Maine House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-71': { seat: 'me-statehouse-71', composer: false, alias: 'me-hd-71', route: '/district/me-hd-71', pid: 'ducharme_me', h1: 'Maine House District 71', where: 'District 71 as Maine’s current legislative plan draws it', kick: 'House District 71 board', kickTitle: 'The district board for Maine House District 71: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-72': { seat: 'me-statehouse-72', composer: false, alias: 'me-hd-72', route: '/district/me-hd-72', pid: 'caruso_me', h1: 'Maine House District 72', where: 'District 72 as Maine’s current legislative plan draws it', kick: 'House District 72 board', kickTitle: 'The district board for Maine House District 72: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-73': { seat: 'me-statehouse-73', composer: false, alias: 'me-hd-73', route: '/district/me-hd-73', pid: 'soboleski_me', h1: 'Maine House District 73', where: 'District 73 as Maine’s current legislative plan draws it', kick: 'House District 73 board', kickTitle: 'The district board for Maine House District 73: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-74': { seat: 'me-statehouse-74', composer: false, alias: 'me-hd-74', route: '/district/me-hd-74', pid: 'hall_me', h1: 'Maine House District 74', where: 'District 74 as Maine’s current legislative plan draws it', kick: 'House District 74 board', kickTitle: 'The district board for Maine House District 74: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-75': { seat: 'me-statehouse-75', composer: false, alias: 'me-hd-75', route: '/district/me-hd-75', pid: 'bunker_me', h1: 'Maine House District 75', where: 'District 75 as Maine’s current legislative plan draws it', kick: 'House District 75 board', kickTitle: 'The district board for Maine House District 75: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-76': { seat: 'me-statehouse-76', composer: false, alias: 'me-hd-76', route: '/district/me-hd-76', pid: 'lyman_me', h1: 'Maine House District 76', where: 'District 76 as Maine’s current legislative plan draws it', kick: 'House District 76 board', kickTitle: 'The district board for Maine House District 76: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-77': { seat: 'me-statehouse-77', composer: false, alias: 'me-hd-77', route: '/district/me-hd-77', pid: 'schmersal_burgess_me', h1: 'Maine House District 77', where: 'District 77 as Maine’s current legislative plan draws it', kick: 'House District 77 board', kickTitle: 'The district board for Maine House District 77: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-78': { seat: 'me-statehouse-78', composer: false, alias: 'me-hd-78', route: '/district/me-hd-78', pid: 'henderson_me', h1: 'Maine House District 78', where: 'District 78 as Maine’s current legislative plan draws it', kick: 'House District 78 board', kickTitle: 'The district board for Maine House District 78: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-79': { seat: 'me-statehouse-79', composer: false, alias: 'me-hd-79', route: '/district/me-hd-79', pid: 'lance_me', h1: 'Maine House District 79', where: 'District 79 as Maine’s current legislative plan draws it', kick: 'House District 79 board', kickTitle: 'The district board for Maine House District 79: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-80': { seat: 'me-statehouse-80', composer: false, alias: 'me-hd-80', route: '/district/me-hd-80', pid: 'jackson_me', h1: 'Maine House District 80', where: 'District 80 as Maine’s current legislative plan draws it', kick: 'House District 80 board', kickTitle: 'The district board for Maine House District 80: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-81': { seat: 'me-statehouse-81', composer: false, alias: 'me-hd-81', route: '/district/me-hd-81', pid: 'wood_me', h1: 'Maine House District 81', where: 'District 81 as Maine’s current legislative plan draws it', kick: 'House District 81 board', kickTitle: 'The district board for Maine House District 81: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-82': { seat: 'me-statehouse-82', composer: false, alias: 'me-hd-82', route: '/district/me-hd-82', pid: 'wadsworth_me', h1: 'Maine House District 82', where: 'District 82 as Maine’s current legislative plan draws it', kick: 'House District 82 board', kickTitle: 'The district board for Maine House District 82: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-83': { seat: 'me-statehouse-83', composer: false, alias: 'me-hd-83', route: '/district/me-hd-83', pid: 'cimino_me', h1: 'Maine House District 83', where: 'District 83 as Maine’s current legislative plan draws it', kick: 'House District 83 board', kickTitle: 'The district board for Maine House District 83: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-84': { seat: 'me-statehouse-84', composer: false, alias: 'me-hd-84', route: '/district/me-hd-84', pid: 'walker_me', h1: 'Maine House District 84', where: 'District 84 as Maine’s current legislative plan draws it', kick: 'House District 84 board', kickTitle: 'The district board for Maine House District 84: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-85': { seat: 'me-statehouse-85', composer: false, alias: 'me-hd-85', route: '/district/me-hd-85', pid: 'pomerleau_me', h1: 'Maine House District 85', where: 'District 85 as Maine’s current legislative plan draws it', kick: 'House District 85 board', kickTitle: 'The district board for Maine House District 85: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-86': { seat: 'me-statehouse-86', composer: false, alias: 'me-hd-86', route: '/district/me-hd-86', pid: 'olsen_me', h1: 'Maine House District 86', where: 'District 86 as Maine’s current legislative plan draws it', kick: 'House District 86 board', kickTitle: 'The district board for Maine House District 86: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-87': { seat: 'me-statehouse-87', composer: false, alias: 'me-hd-87', route: '/district/me-hd-87', pid: 'boyer_me', h1: 'Maine House District 87', where: 'District 87 as Maine’s current legislative plan draws it', kick: 'House District 87 board', kickTitle: 'The district board for Maine House District 87: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-88': { seat: 'me-statehouse-88', composer: false, alias: 'me-hd-88', route: '/district/me-hd-88', pid: 'chapman_me', h1: 'Maine House District 88', where: 'District 88 as Maine’s current legislative plan draws it', kick: 'House District 88 board', kickTitle: 'The district board for Maine House District 88: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-89': { seat: 'me-statehouse-89', composer: false, alias: 'me-hd-89', route: '/district/me-hd-89', pid: 'lee_me', h1: 'Maine House District 89', where: 'District 89 as Maine’s current legislative plan draws it', kick: 'House District 89 board', kickTitle: 'The district board for Maine House District 89: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-90': { seat: 'me-statehouse-90', composer: false, alias: 'me-hd-90', route: '/district/me-hd-90', pid: 'libby_me', h1: 'Maine House District 90', where: 'District 90 as Maine’s current legislative plan draws it', kick: 'House District 90 board', kickTitle: 'The district board for Maine House District 90: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-91': { seat: 'me-statehouse-91', composer: false, alias: 'me-hd-91', route: '/district/me-hd-91', pid: 'morris_me', h1: 'Maine House District 91', where: 'District 91 as Maine’s current legislative plan draws it', kick: 'House District 91 board', kickTitle: 'The district board for Maine House District 91: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-92': { seat: 'me-statehouse-92', composer: false, alias: 'me-hd-92', route: '/district/me-hd-92', pid: 'steve_wood_me', h1: 'Maine House District 92', where: 'District 92 as Maine’s current legislative plan draws it', kick: 'House District 92 board', kickTitle: 'The district board for Maine House District 92: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-93': { seat: 'me-statehouse-93', composer: false, alias: 'me-hd-93', route: '/district/me-hd-93', pid: 'mccabe_me', h1: 'Maine House District 93', where: 'District 93 as Maine’s current legislative plan draws it', kick: 'House District 93 board', kickTitle: 'The district board for Maine House District 93: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-94': { seat: 'me-statehouse-94', composer: false, alias: 'me-hd-94', route: '/district/me-hd-94', pid: 'harriman_me', h1: 'Maine House District 94', where: 'District 94 as Maine’s current legislative plan draws it', kick: 'House District 94 board', kickTitle: 'The district board for Maine House District 94: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-95': { seat: 'me-statehouse-95', composer: false, alias: 'me-hd-95', route: '/district/me-hd-95', pid: 'abdi_me', h1: 'Maine House District 95', where: 'District 95 as Maine’s current legislative plan draws it', kick: 'House District 95 board', kickTitle: 'The district board for Maine House District 95: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-96': { seat: 'me-statehouse-96', composer: false, alias: 'me-hd-96', route: '/district/me-hd-96', pid: 'lajoie_me', h1: 'Maine House District 96', where: 'District 96 as Maine’s current legislative plan draws it', kick: 'House District 96 board', kickTitle: 'The district board for Maine House District 96: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-97': { seat: 'me-statehouse-97', composer: false, alias: 'me-hd-97', route: '/district/me-hd-97', pid: 'mason_me', h1: 'Maine House District 97', where: 'District 97 as Maine’s current legislative plan draws it', kick: 'House District 97 board', kickTitle: 'The district board for Maine House District 97: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-98': { seat: 'me-statehouse-98', composer: false, alias: 'me-hd-98', route: '/district/me-hd-98', pid: 'webb_me', h1: 'Maine House District 98', where: 'District 98 as Maine’s current legislative plan draws it', kick: 'House District 98 board', kickTitle: 'The district board for Maine House District 98: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-99': { seat: 'me-statehouse-99', composer: false, alias: 'me-hd-99', route: '/district/me-hd-99', pid: 'golek_me', h1: 'Maine House District 99', where: 'District 99 as Maine’s current legislative plan draws it', kick: 'House District 99 board', kickTitle: 'The district board for Maine House District 99: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-100': { seat: 'me-statehouse-100', composer: false, alias: 'me-hd-100', route: '/district/me-hd-100', pid: 'ankeles_me', h1: 'Maine House District 100', where: 'District 100 as Maine’s current legislative plan draws it', kick: 'House District 100 board', kickTitle: 'The district board for Maine House District 100: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-101': { seat: 'me-statehouse-101', composer: false, alias: 'me-hd-101', route: '/district/me-hd-101', pid: 'arford_me', h1: 'Maine House District 101', where: 'District 101 as Maine’s current legislative plan draws it', kick: 'House District 101 board', kickTitle: 'The district board for Maine House District 101: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-102': { seat: 'me-statehouse-102', composer: false, alias: 'me-hd-102', route: '/district/me-hd-102', pid: 'sachs_me', h1: 'Maine House District 102', where: 'District 102 as Maine’s current legislative plan draws it', kick: 'House District 102 board', kickTitle: 'The district board for Maine House District 102: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-103': { seat: 'me-statehouse-103', composer: false, alias: 'me-hd-103', route: '/district/me-hd-103', pid: 'bell_me', h1: 'Maine House District 103', where: 'District 103 as Maine’s current legislative plan draws it', kick: 'House District 103 board', kickTitle: 'The district board for Maine House District 103: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-104': { seat: 'me-statehouse-104', composer: false, alias: 'me-hd-104', route: '/district/me-hd-104', pid: 'arata_me', h1: 'Maine House District 104', where: 'District 104 as Maine’s current legislative plan draws it', kick: 'House District 104 board', kickTitle: 'The district board for Maine House District 104: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-105': { seat: 'me-statehouse-105', composer: false, alias: 'me-hd-105', route: '/district/me-hd-105', pid: 'graham_me', h1: 'Maine House District 105', where: 'District 105 as Maine’s current legislative plan draws it', kick: 'House District 105 board', kickTitle: 'The district board for Maine House District 105: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-106': { seat: 'me-statehouse-106', composer: false, alias: 'me-hd-106', route: '/district/me-hd-106', pid: 'bagshaw_me', h1: 'Maine House District 106', where: 'District 106 as Maine’s current legislative plan draws it', kick: 'House District 106 board', kickTitle: 'The district board for Maine House District 106: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-107': { seat: 'me-statehouse-107', composer: false, alias: 'me-hd-107', route: '/district/me-hd-107', pid: 'cooper_me', h1: 'Maine House District 107', where: 'District 107 as Maine’s current legislative plan draws it', kick: 'House District 107 board', kickTitle: 'The district board for Maine House District 107: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-108': { seat: 'me-statehouse-108', composer: false, alias: 'me-hd-108', route: '/district/me-hd-108', pid: 'terry_me', h1: 'Maine House District 108', where: 'District 108 as Maine’s current legislative plan draws it', kick: 'House District 108 board', kickTitle: 'The district board for Maine House District 108: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-109': { seat: 'me-statehouse-109', composer: false, alias: 'me-hd-109', route: '/district/me-hd-109', pid: 'sato_me', h1: 'Maine House District 109', where: 'District 109 as Maine’s current legislative plan draws it', kick: 'House District 109 board', kickTitle: 'The district board for Maine House District 109: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-110': { seat: 'me-statehouse-110', composer: false, alias: 'me-hd-110', route: '/district/me-hd-110', pid: 'mitchell_me', h1: 'Maine House District 110', where: 'District 110 as Maine’s current legislative plan draws it', kick: 'House District 110 board', kickTitle: 'The district board for Maine House District 110: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-111': { seat: 'me-statehouse-111', composer: false, alias: 'me-hd-111', route: '/district/me-hd-111', pid: 'kuhn_me', h1: 'Maine House District 111', where: 'District 111 as Maine’s current legislative plan draws it', kick: 'House District 111 board', kickTitle: 'The district board for Maine House District 111: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-112': { seat: 'me-statehouse-112', composer: false, alias: 'me-hd-112', route: '/district/me-hd-112', pid: 'crockett_me', h1: 'Maine House District 112', where: 'District 112 as Maine’s current legislative plan draws it', kick: 'House District 112 board', kickTitle: 'The district board for Maine House District 112: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-113': { seat: 'me-statehouse-113', composer: false, alias: 'me-hd-113', route: '/district/me-hd-113', pid: 'lookner_me', h1: 'Maine House District 113', where: 'District 113 as Maine’s current legislative plan draws it', kick: 'House District 113 board', kickTitle: 'The district board for Maine House District 113: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-114': { seat: 'me-statehouse-114', composer: false, alias: 'me-hd-114', route: '/district/me-hd-114', pid: 'pugh_me', h1: 'Maine House District 114', where: 'District 114 as Maine’s current legislative plan draws it', kick: 'House District 114 board', kickTitle: 'The district board for Maine House District 114: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-115': { seat: 'me-statehouse-115', composer: false, alias: 'me-hd-115', route: '/district/me-hd-115', pid: 'brennan_me', h1: 'Maine House District 115', where: 'District 115 as Maine’s current legislative plan draws it', kick: 'House District 115 board', kickTitle: 'The district board for Maine House District 115: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-116': { seat: 'me-statehouse-116', composer: false, alias: 'me-hd-116', route: '/district/me-hd-116', pid: 'zager_me', h1: 'Maine House District 116', where: 'District 116 as Maine’s current legislative plan draws it', kick: 'House District 116 board', kickTitle: 'The district board for Maine House District 116: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-117': { seat: 'me-statehouse-117', composer: false, alias: 'me-hd-117', route: '/district/me-hd-117', pid: 'moonen_me', h1: 'Maine House District 117', where: 'District 117 as Maine’s current legislative plan draws it', kick: 'House District 117 board', kickTitle: 'The district board for Maine House District 117: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-118': { seat: 'me-statehouse-118', composer: false, alias: 'me-hd-118', route: '/district/me-hd-118', pid: 'yusuf_me', h1: 'Maine House District 118', where: 'District 118 as Maine’s current legislative plan draws it', kick: 'House District 118 board', kickTitle: 'The district board for Maine House District 118: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-119': { seat: 'me-statehouse-119', composer: false, alias: 'me-hd-119', route: '/district/me-hd-119', pid: 'skold_me', h1: 'Maine House District 119', where: 'District 119 as Maine’s current legislative plan draws it', kick: 'House District 119 board', kickTitle: 'The district board for Maine House District 119: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-120': { seat: 'me-statehouse-120', composer: false, alias: 'me-hd-120', route: '/district/me-hd-120', pid: 'dhalac_me', h1: 'Maine House District 120', where: 'District 120 as Maine’s current legislative plan draws it', kick: 'House District 120 board', kickTitle: 'The district board for Maine House District 120: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-121': { seat: 'me-statehouse-121', composer: false, alias: 'me-hd-121', route: '/district/me-hd-121', pid: 'kessler_me', h1: 'Maine House District 121', where: 'District 121 as Maine’s current legislative plan draws it', kick: 'House District 121 board', kickTitle: 'The district board for Maine House District 121: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-122': { seat: 'me-statehouse-122', composer: false, alias: 'me-hd-122', route: '/district/me-hd-122', pid: 'beck_me', h1: 'Maine House District 122', where: 'District 122 as Maine’s current legislative plan draws it', kick: 'House District 122 board', kickTitle: 'The district board for Maine House District 122: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-123': { seat: 'me-statehouse-123', composer: false, alias: 'me-hd-123', route: '/district/me-hd-123', pid: 'michelle_boyer_me', h1: 'Maine House District 123', where: 'District 123 as Maine’s current legislative plan draws it', kick: 'House District 123 board', kickTitle: 'The district board for Maine House District 123: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-124': { seat: 'me-statehouse-124', composer: false, alias: 'me-hd-124', route: '/district/me-hd-124', pid: 'warren_me', h1: 'Maine House District 124', where: 'District 124 as Maine’s current legislative plan draws it', kick: 'House District 124 board', kickTitle: 'The district board for Maine House District 124: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-125': { seat: 'me-statehouse-125', composer: false, alias: 'me-hd-125', route: '/district/me-hd-125', pid: 'murphy_me', h1: 'Maine House District 125', where: 'District 125 as Maine’s current legislative plan draws it', kick: 'House District 125 board', kickTitle: 'The district board for Maine House District 125: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-126': { seat: 'me-statehouse-126', composer: false, alias: 'me-hd-126', route: '/district/me-hd-126', pid: 'gattine_me', h1: 'Maine House District 126', where: 'District 126 as Maine’s current legislative plan draws it', kick: 'House District 126 board', kickTitle: 'The district board for Maine House District 126: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-127': { seat: 'me-statehouse-127', composer: false, alias: 'me-hd-127', route: '/district/me-hd-127', pid: 'rielly_me', h1: 'Maine House District 127', where: 'District 127 as Maine’s current legislative plan draws it', kick: 'House District 127 board', kickTitle: 'The district board for Maine House District 127: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-128': { seat: 'me-statehouse-128', composer: false, alias: 'me-hd-128', route: '/district/me-hd-128', pid: 'salisbury_me', h1: 'Maine House District 128', where: 'District 128 as Maine’s current legislative plan draws it', kick: 'House District 128 board', kickTitle: 'The district board for Maine House District 128: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-129': { seat: 'me-statehouse-129', composer: false, alias: 'me-hd-129', route: '/district/me-hd-129', pid: 'archer_me', h1: 'Maine House District 129', where: 'District 129 as Maine’s current legislative plan draws it', kick: 'House District 129 board', kickTitle: 'The district board for Maine House District 129: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-130': { seat: 'me-statehouse-130', composer: false, alias: 'me-hd-130', route: '/district/me-hd-130', pid: 'copeland_me', h1: 'Maine House District 130', where: 'District 130 as Maine’s current legislative plan draws it', kick: 'House District 130 board', kickTitle: 'The district board for Maine House District 130: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-131': { seat: 'me-statehouse-131', composer: false, alias: 'me-hd-131', route: '/district/me-hd-131', pid: 'gramlich_me', h1: 'Maine House District 131', where: 'District 131 as Maine’s current legislative plan draws it', kick: 'House District 131 board', kickTitle: 'The district board for Maine House District 131: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-133': { seat: 'me-statehouse-133', composer: false, alias: 'me-hd-133', route: '/district/me-hd-133', pid: 'malon_me', h1: 'Maine House District 133', where: 'District 133 as Maine’s current legislative plan draws it', kick: 'House District 133 board', kickTitle: 'The district board for Maine House District 133: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-134': { seat: 'me-statehouse-134', composer: false, alias: 'me-hd-134', route: '/district/me-hd-134', pid: 'gere_me', h1: 'Maine House District 134', where: 'District 134 as Maine’s current legislative plan draws it', kick: 'House District 134 board', kickTitle: 'The district board for Maine House District 134: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-135': { seat: 'me-statehouse-135', composer: false, alias: 'me-hd-135', route: '/district/me-hd-135', pid: 'sayre_me', h1: 'Maine House District 135', where: 'District 135 as Maine’s current legislative plan draws it', kick: 'House District 135 board', kickTitle: 'The district board for Maine House District 135: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-136': { seat: 'me-statehouse-136', composer: false, alias: 'me-hd-136', route: '/district/me-hd-136', pid: 'eder_me', h1: 'Maine House District 136', where: 'District 136 as Maine’s current legislative plan draws it', kick: 'House District 136 board', kickTitle: 'The district board for Maine House District 136: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-137': { seat: 'me-statehouse-137', composer: false, alias: 'me-hd-137', route: '/district/me-hd-137', pid: 'carlow_me', h1: 'Maine House District 137', where: 'District 137 as Maine’s current legislative plan draws it', kick: 'House District 137 board', kickTitle: 'The district board for Maine House District 137: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-138': { seat: 'me-statehouse-138', composer: false, alias: 'me-hd-138', route: '/district/me-hd-138', pid: 'blier_me', h1: 'Maine House District 138', where: 'District 138 as Maine’s current legislative plan draws it', kick: 'House District 138 board', kickTitle: 'The district board for Maine House District 138: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-139': { seat: 'me-statehouse-139', composer: false, alias: 'me-hd-139', route: '/district/me-hd-139', pid: 'woodsome_me', h1: 'Maine House District 139', where: 'District 139 as Maine’s current legislative plan draws it', kick: 'House District 139 board', kickTitle: 'The district board for Maine House District 139: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-140': { seat: 'me-statehouse-140', composer: false, alias: 'me-hd-140', route: '/district/me-hd-140', pid: 'parry_me', h1: 'Maine House District 140', where: 'District 140 as Maine’s current legislative plan draws it', kick: 'House District 140 board', kickTitle: 'The district board for Maine House District 140: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-141': { seat: 'me-statehouse-141', composer: false, alias: 'me-hd-141', route: '/district/me-hd-141', pid: 'lanigan_me', h1: 'Maine House District 141', where: 'District 141 as Maine’s current legislative plan draws it', kick: 'House District 141 board', kickTitle: 'The district board for Maine House District 141: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-142': { seat: 'me-statehouse-142', composer: false, alias: 'me-hd-142', route: '/district/me-hd-142', pid: 'mastraccio_me', h1: 'Maine House District 142', where: 'District 142 as Maine’s current legislative plan draws it', kick: 'House District 142 board', kickTitle: 'The district board for Maine House District 142: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-143': { seat: 'me-statehouse-143', composer: false, alias: 'me-hd-143', route: '/district/me-hd-143', pid: 'fredericks_me', h1: 'Maine House District 143', where: 'District 143 as Maine’s current legislative plan draws it', kick: 'House District 143 board', kickTitle: 'The district board for Maine House District 143: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-144': { seat: 'me-statehouse-144', composer: false, alias: 'me-hd-144', route: '/district/me-hd-144', pid: 'adams_me', h1: 'Maine House District 144', where: 'District 144 as Maine’s current legislative plan draws it', kick: 'House District 144 board', kickTitle: 'The district board for Maine House District 144: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-145': { seat: 'me-statehouse-145', composer: false, alias: 'me-hd-145', route: '/district/me-hd-145', pid: 'foley_me', h1: 'Maine House District 145', where: 'District 145 as Maine’s current legislative plan draws it', kick: 'House District 145 board', kickTitle: 'The district board for Maine House District 145: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-146': { seat: 'me-statehouse-146', composer: false, alias: 'me-hd-146', route: '/district/me-hd-146', pid: 'runte_me', h1: 'Maine House District 146', where: 'District 146 as Maine’s current legislative plan draws it', kick: 'House District 146 board', kickTitle: 'The district board for Maine House District 146: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-147': { seat: 'me-statehouse-147', composer: false, alias: 'me-hd-147', route: '/district/me-hd-147', pid: 'sargent_me', h1: 'Maine House District 147', where: 'District 147 as Maine’s current legislative plan draws it', kick: 'House District 147 board', kickTitle: 'The district board for Maine House District 147: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-148': { seat: 'me-statehouse-148', composer: false, alias: 'me-hd-148', route: '/district/me-hd-148', pid: 'lavigne_me', h1: 'Maine House District 148', where: 'District 148 as Maine’s current legislative plan draws it', kick: 'House District 148 board', kickTitle: 'The district board for Maine House District 148: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-149': { seat: 'me-statehouse-149', composer: false, alias: 'me-hd-149', route: '/district/me-hd-149', pid: 'roberts_me', h1: 'Maine House District 149', where: 'District 149 as Maine’s current legislative plan draws it', kick: 'House District 149 board', kickTitle: 'The district board for Maine House District 149: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-150': { seat: 'me-statehouse-150', composer: false, alias: 'me-hd-150', route: '/district/me-hd-150', pid: 'meyer_me', h1: 'Maine House District 150', where: 'District 150 as Maine’s current legislative plan draws it', kick: 'House District 150 board', kickTitle: 'The district board for Maine House District 150: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statehouse-151': { seat: 'me-statehouse-151', composer: false, alias: 'me-hd-151', route: '/district/me-hd-151', pid: 'mathieson_me', h1: 'Maine House District 151', where: 'District 151 as Maine’s current legislative plan draws it', kick: 'House District 151 board', kickTitle: 'The district board for Maine House District 151: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-1': { seat: 'me-statesenate-1', composer: false, alias: 'me-sd-1', route: '/district/me-sd-1', pid: 'bernard_me', h1: 'Maine Senate District 1', where: 'District 1 as Maine’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Maine Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-2': { seat: 'me-statesenate-2', composer: false, alias: 'me-sd-2', route: '/district/me-sd-2', pid: 'trey_stewart', h1: 'Maine Senate District 2', where: 'District 2 as Maine’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Maine Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-3': { seat: 'me-statesenate-3', composer: false, alias: 'me-sd-3', route: '/district/me-sd-3', pid: 'brad_farrin_me', h1: 'Maine Senate District 3', where: 'District 3 as Maine’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Maine Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-4': { seat: 'me-statesenate-4', composer: false, alias: 'me-sd-4', route: '/district/me-sd-4', pid: 'guerin_me', h1: 'Maine Senate District 4', where: 'District 4 as Maine’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Maine Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-5': { seat: 'me-statesenate-5', composer: false, alias: 'me-sd-5', route: '/district/me-sd-5', pid: 'black_me', h1: 'Maine Senate District 5', where: 'District 5 as Maine’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Maine Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-6': { seat: 'me-statesenate-6', composer: false, alias: 'me-sd-6', route: '/district/me-sd-6', pid: 'moore_me', h1: 'Maine Senate District 6', where: 'District 6 as Maine’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Maine Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-7': { seat: 'me-statesenate-7', composer: false, alias: 'me-sd-7', route: '/district/me-sd-7', pid: 'grohoski_me', h1: 'Maine Senate District 7', where: 'District 7 as Maine’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Maine Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-8': { seat: 'me-statesenate-8', composer: false, alias: 'me-sd-8', route: '/district/me-sd-8', pid: 'tipping_me', h1: 'Maine Senate District 8', where: 'District 8 as Maine’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Maine Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-9': { seat: 'me-statesenate-9', composer: false, alias: 'me-sd-9', route: '/district/me-sd-9', pid: 'baldacci_me', h1: 'Maine Senate District 9', where: 'District 9 as Maine’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Maine Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-10': { seat: 'me-statesenate-10', composer: false, alias: 'me-sd-10', route: '/district/me-sd-10', pid: 'david_haggan_me', h1: 'Maine Senate District 10', where: 'District 10 as Maine’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Maine Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-11': { seat: 'me-statesenate-11', composer: false, alias: 'me-sd-11', route: '/district/me-sd-11', pid: 'curry_me', h1: 'Maine Senate District 11', where: 'District 11 as Maine’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Maine Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-12': { seat: 'me-statesenate-12', composer: false, alias: 'me-sd-12', route: '/district/me-sd-12', pid: 'beebe_center_me', h1: 'Maine Senate District 12', where: 'District 12 as Maine’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Maine Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-13': { seat: 'me-statesenate-13', composer: false, alias: 'me-sd-13', route: '/district/me-sd-13', pid: 'reny_me', h1: 'Maine Senate District 13', where: 'District 13 as Maine’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Maine Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-14': { seat: 'me-statesenate-14', composer: false, alias: 'me-sd-14', route: '/district/me-sd-14', pid: 'hickman_me', h1: 'Maine Senate District 14', where: 'District 14 as Maine’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Maine Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-15': { seat: 'me-statesenate-15', composer: false, alias: 'me-sd-15', route: '/district/me-sd-15', pid: 'bradstreet_me', h1: 'Maine Senate District 15', where: 'District 15 as Maine’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Maine Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-16': { seat: 'me-statesenate-16', composer: false, alias: 'me-sd-16', route: '/district/me-sd-16', pid: 'cyrway_me', h1: 'Maine Senate District 16', where: 'District 16 as Maine’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Maine Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-17': { seat: 'me-statesenate-17', composer: false, alias: 'me-sd-17', route: '/district/me-sd-17', pid: 'timberlake_me', h1: 'Maine Senate District 17', where: 'District 17 as Maine’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Maine Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-19': { seat: 'me-statesenate-19', composer: false, alias: 'me-sd-19', route: '/district/me-sd-19', pid: 'martin_me', h1: 'Maine Senate District 19', where: 'District 19 as Maine’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Maine Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-20': { seat: 'me-statesenate-20', composer: false, alias: 'me-sd-20', route: '/district/me-sd-20', pid: 'bickford_me', h1: 'Maine Senate District 20', where: 'District 20 as Maine’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Maine Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-21': { seat: 'me-statesenate-21', composer: false, alias: 'me-sd-21', route: '/district/me-sd-21', pid: 'rotundo_me', h1: 'Maine Senate District 21', where: 'District 21 as Maine’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Maine Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-22': { seat: 'me-statesenate-22', composer: false, alias: 'me-sd-22', route: '/district/me-sd-22', pid: 'jim_libby_me', h1: 'Maine Senate District 22', where: 'District 22 as Maine’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Maine Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-23': { seat: 'me-statesenate-23', composer: false, alias: 'me-sd-23', route: '/district/me-sd-23', pid: 'mattie_daughtry', h1: 'Maine Senate District 23', where: 'District 23 as Maine’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Maine Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-24': { seat: 'me-statesenate-24', composer: false, alias: 'me-sd-24', route: '/district/me-sd-24', pid: 'tepler_me', h1: 'Maine Senate District 24', where: 'District 24 as Maine’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Maine Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-25': { seat: 'me-statesenate-25', composer: false, alias: 'me-sd-25', route: '/district/me-sd-25', pid: 'teresa_pierce', h1: 'Maine Senate District 25', where: 'District 25 as Maine’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Maine Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-26': { seat: 'me-statesenate-26', composer: false, alias: 'me-sd-26', route: '/district/me-sd-26', pid: 'nangle_me', h1: 'Maine Senate District 26', where: 'District 26 as Maine’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Maine Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-27': { seat: 'me-statesenate-27', composer: false, alias: 'me-sd-27', route: '/district/me-sd-27', pid: 'duson_me', h1: 'Maine Senate District 27', where: 'District 27 as Maine’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Maine Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-28': { seat: 'me-statesenate-28', composer: false, alias: 'me-sd-28', route: '/district/me-sd-28', pid: 'talbot_ross_me', h1: 'Maine Senate District 28', where: 'District 28 as Maine’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Maine Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-29': { seat: 'me-statesenate-29', composer: false, alias: 'me-sd-29', route: '/district/me-sd-29', pid: 'carney_me', h1: 'Maine Senate District 29', where: 'District 29 as Maine’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Maine Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-30': { seat: 'me-statesenate-30', composer: false, alias: 'me-sd-30', route: '/district/me-sd-30', pid: 'brenner_me', h1: 'Maine Senate District 30', where: 'District 30 as Maine’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Maine Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-31': { seat: 'me-statesenate-31', composer: false, alias: 'me-sd-31', route: '/district/me-sd-31', pid: 'bailey_me', h1: 'Maine Senate District 31', where: 'District 31 as Maine’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Maine Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-32': { seat: 'me-statesenate-32', composer: false, alias: 'me-sd-32', route: '/district/me-sd-32', pid: 'ingwersen_me', h1: 'Maine Senate District 32', where: 'District 32 as Maine’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Maine Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-33': { seat: 'me-statesenate-33', composer: false, alias: 'me-sd-33', route: '/district/me-sd-33', pid: 'harrington_me', h1: 'Maine Senate District 33', where: 'District 33 as Maine’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Maine Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-34': { seat: 'me-statesenate-34', composer: false, alias: 'me-sd-34', route: '/district/me-sd-34', pid: 'rafferty_me', h1: 'Maine Senate District 34', where: 'District 34 as Maine’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Maine Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-35': { seat: 'me-statesenate-35', composer: false, alias: 'me-sd-35', route: '/district/me-sd-35', pid: 'lawrence_me', h1: 'Maine Senate District 35', where: 'District 35 as Maine’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Maine Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'me-statesenate-18': { seat: 'me-statesenate-18', composer: false, alias: 'me-sd-18', route: '/district/me-sd-18', pid: 'rick_bennett', h1: 'Maine Senate District 18', where: 'District 18 as Maine’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Maine Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statesenate-35': { seat: 'mi-statesenate-35', composer: true, alias: 'mi-sd-35', route: '/district/mi-sd-35', pid: 'chedrick_greene_mi', h1: 'Michigan Senate District 35', where: 'District 35 as Michigan’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Michigan Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statesenate-9': { seat: 'mi-statesenate-9', composer: true, alias: 'mi-sd-9', route: '/district/mi-sd-9', pid: 'webber_mi', h1: 'Michigan Senate District 9', where: 'District 9 as Michigan’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Michigan Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-109': { seat: 'mi-statehouse-109', composer: true, alias: 'mi-hd-109', route: '/district/mi-hd-109', pid: 'bohnak_mi', h1: 'Michigan House District 109', where: 'District 109 as Michigan’s current legislative plan draws it', kick: 'House District 109 board', kickTitle: 'The district board for Michigan House District 109: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-86': { seat: 'mi-statehouse-86', composer: true, alias: 'mi-hd-86', route: '/district/mi-hd-86', pid: 'deboer_mi', h1: 'Michigan House District 86', where: 'District 86 as Michigan’s current legislative plan draws it', kick: 'House District 86 board', kickTitle: 'The district board for Michigan House District 86: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-44': { seat: 'mi-statehouse-44', composer: true, alias: 'mi-hd-44', route: '/district/mi-hd-44', pid: 'frisbie_mi', h1: 'Michigan House District 44', where: 'District 44 as Michigan’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Michigan House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-27': { seat: 'mi-statehouse-27', composer: true, alias: 'mi-hd-27', route: '/district/mi-hd-27', pid: 'linting_mi', h1: 'Michigan House District 27', where: 'District 27 as Michigan’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Michigan House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-46': { seat: 'mi-statehouse-46', composer: true, alias: 'mi-hd-46', route: '/district/mi-hd-46', pid: 'schmaltz_mi', h1: 'Michigan House District 46', where: 'District 46 as Michigan’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Michigan House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-28': { seat: 'mi-statehouse-28', composer: true, alias: 'mi-hd-28', route: '/district/mi-hd-28', pid: 'thompson_mi', h1: 'Michigan House District 28', where: 'District 28 as Michigan’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Michigan House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-55': { seat: 'mi-statehouse-55', composer: true, alias: 'mi-hd-55', route: '/district/mi-hd-55', pid: 'tisdel_mi', h1: 'Michigan House District 55', where: 'District 55 as Michigan’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Michigan House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'mi-statehouse-61': { seat: 'mi-statehouse-61', composer: true, alias: 'mi-hd-61', route: '/district/mi-hd-61', pid: 'mentzer_mi', h1: 'Michigan House District 61', where: 'District 61 as Michigan’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Michigan House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-64': { seat: 'mn-statesenate-64', composer: false, alias: 'mn-sd-64', route: '/district/mn-sd-64', pid: 'erin_murphy', h1: 'Minnesota Senate District 64', where: 'District 64 as Minnesota’s current legislative plan draws it', kick: 'Senate District 64 board', kickTitle: 'The district board for Minnesota Senate District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-25': { seat: 'mn-statehouse-25', composer: false, alias: 'mn-hd-25', route: '/district/mn-hd-25', pid: 'lisa_demuth', h1: 'Minnesota House District 13A', where: 'District 13A as Minnesota’s current legislative plan draws it', kick: 'House District 13A board', kickTitle: 'The district board for Minnesota House District 13A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-59': { seat: 'mn-statesenate-59', composer: false, alias: 'mn-sd-59', route: '/district/mn-sd-59', pid: 'bobby_joe_champion', h1: 'Minnesota Senate District 59', where: 'District 59 as Minnesota’s current legislative plan draws it', kick: 'Senate District 59 board', kickTitle: 'The district board for Minnesota Senate District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-1': { seat: 'mn-statesenate-1', composer: false, alias: 'mn-sd-1', route: '/district/mn-sd-1', pid: 'mark_johnson_mn', h1: 'Minnesota Senate District 1', where: 'District 1 as Minnesota’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Minnesota Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-3': { seat: 'mn-statesenate-3', composer: true, alias: 'mn-sd-3', route: '/district/mn-sd-3', pid: 'hauschild_mn', h1: 'Minnesota Senate District 3', where: 'District 3 as Minnesota’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Minnesota Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-4': { seat: 'mn-statesenate-4', composer: true, alias: 'mn-sd-4', route: '/district/mn-sd-4', pid: 'kupec_mn', h1: 'Minnesota Senate District 4', where: 'District 4 as Minnesota’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Minnesota Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-14': { seat: 'mn-statesenate-14', composer: true, alias: 'mn-sd-14', route: '/district/mn-sd-14', pid: 'putnam_mn', h1: 'Minnesota Senate District 14', where: 'District 14 as Minnesota’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Minnesota Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-32': { seat: 'mn-statesenate-32', composer: true, alias: 'mn-sd-32', route: '/district/mn-sd-32', pid: 'kreun_mn', h1: 'Minnesota Senate District 32', where: 'District 32 as Minnesota’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Minnesota Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-33': { seat: 'mn-statesenate-33', composer: true, alias: 'mn-sd-33', route: '/district/mn-sd-33', pid: 'housley_mn', h1: 'Minnesota Senate District 33', where: 'District 33 as Minnesota’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Minnesota Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-35': { seat: 'mn-statesenate-35', composer: true, alias: 'mn-sd-35', route: '/district/mn-sd-35', pid: 'abeler_mn', h1: 'Minnesota Senate District 35', where: 'District 35 as Minnesota’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Minnesota Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-41': { seat: 'mn-statesenate-41', composer: true, alias: 'mn-sd-41', route: '/district/mn-sd-41', pid: 'seeberger_mn', h1: 'Minnesota Senate District 41', where: 'District 41 as Minnesota’s current legislative plan draws it', kick: 'Senate District 41 board', kickTitle: 'The district board for Minnesota Senate District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-48': { seat: 'mn-statesenate-48', composer: true, alias: 'mn-sd-48', route: '/district/mn-sd-48', pid: 'julia_coleman_mn', h1: 'Minnesota Senate District 48', where: 'District 48 as Minnesota’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Minnesota Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-6': { seat: 'mn-statehouse-6', composer: true, alias: 'mn-hd-6', route: '/district/mn-hd-6', pid: 'zeleznikar_mn', h1: 'Minnesota House District 3B', where: 'District 3B as Minnesota’s current legislative plan draws it', kick: 'House District 3B board', kickTitle: 'The district board for Minnesota House District 3B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-27': { seat: 'mn-statehouse-27', composer: false, alias: 'mn-hd-27', route: '/district/mn-hd-27', pid: 'perryman_mn', h1: 'Minnesota House District 14A', where: 'District 14A as Minnesota’s current legislative plan draws it', kick: 'House District 14A board', kickTitle: 'The district board for Minnesota House District 14A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-35': { seat: 'mn-statehouse-35', composer: true, alias: 'mn-hd-35', route: '/district/mn-hd-35', pid: 'erica_schwartz_mn', h1: 'Minnesota House District 18A', where: 'District 18A as Minnesota’s current legislative plan draws it', kick: 'House District 18A board', kickTitle: 'The district board for Minnesota House District 18A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-63': { seat: 'mn-statehouse-63', composer: true, alias: 'mn-hd-63', route: '/district/mn-hd-63', pid: 'nolan_west_mn', h1: 'Minnesota House District 32A', where: 'District 32A as Minnesota’s current legislative plan draws it', kick: 'House District 32A board', kickTitle: 'The district board for Minnesota House District 32A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-64': { seat: 'mn-statehouse-64', composer: true, alias: 'mn-hd-64', route: '/district/mn-hd-64', pid: 'norris_mn', h1: 'Minnesota House District 32B', where: 'District 32B as Minnesota’s current legislative plan draws it', kick: 'House District 32B board', kickTitle: 'The district board for Minnesota House District 32B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-67': { seat: 'mn-statehouse-67', composer: true, alias: 'mn-hd-67', route: '/district/mn-hd-67', pid: 'nadeau_mn', h1: 'Minnesota House District 34A', where: 'District 34A as Minnesota’s current legislative plan draws it', kick: 'House District 34A board', kickTitle: 'The district board for Minnesota House District 34A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-69': { seat: 'mn-statehouse-69', composer: true, alias: 'mn-hd-69', route: '/district/mn-hd-69', pid: 'stephenson_mn', h1: 'Minnesota House District 35A', where: 'District 35A as Minnesota’s current legislative plan draws it', kick: 'House District 35A board', kickTitle: 'The district board for Minnesota House District 35A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-70': { seat: 'mn-statehouse-70', composer: true, alias: 'mn-hd-70', route: '/district/mn-hd-70', pid: 'rehrauer_mn', h1: 'Minnesota House District 35B', where: 'District 35B as Minnesota’s current legislative plan draws it', kick: 'House District 35B board', kickTitle: 'The district board for Minnesota House District 35B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-81': { seat: 'mn-statehouse-81', composer: true, alias: 'mn-hd-81', route: '/district/mn-hd-81', pid: 'wayne_johnson_mn', h1: 'Minnesota House District 41A', where: 'District 41A as Minnesota’s current legislative plan draws it', kick: 'House District 41A board', kickTitle: 'The district board for Minnesota House District 41A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-82': { seat: 'mn-statehouse-82', composer: false, alias: 'mn-hd-82', route: '/district/mn-hd-82', pid: 'dippel_mn', h1: 'Minnesota House District 41B', where: 'District 41B as Minnesota’s current legislative plan draws it', kick: 'House District 41B board', kickTitle: 'The district board for Minnesota House District 41B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-89': { seat: 'mn-statehouse-89', composer: true, alias: 'mn-hd-89', route: '/district/mn-hd-89', pid: 'andrew_myers_mn', h1: 'Minnesota House District 45A', where: 'District 45A as Minnesota’s current legislative plan draws it', kick: 'House District 45A board', kickTitle: 'The district board for Minnesota House District 45A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-96': { seat: 'mn-statehouse-96', composer: true, alias: 'mn-hd-96', route: '/district/mn-hd-96', pid: 'rehm_mn', h1: 'Minnesota House District 48B', where: 'District 48B as Minnesota’s current legislative plan draws it', kick: 'House District 48B board', kickTitle: 'The district board for Minnesota House District 48B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-107': { seat: 'mn-statehouse-107', composer: true, alias: 'mn-hd-107', route: '/district/mn-hd-107', pid: 'tabke_mn', h1: 'Minnesota House District 54A', where: 'District 54A as Minnesota’s current legislative plan draws it', kick: 'House District 54A board', kickTitle: 'The district board for Minnesota House District 54A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-1': { seat: 'mn-statehouse-1', composer: false, alias: 'mn-hd-1', route: '/district/mn-hd-1', pid: 'burkel_mn', h1: 'Minnesota House District 1A', where: 'District 1A as Minnesota’s current legislative plan draws it', kick: 'House District 1A board', kickTitle: 'The district board for Minnesota House District 1A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-2': { seat: 'mn-statehouse-2', composer: false, alias: 'mn-hd-2', route: '/district/mn-hd-2', pid: 'gander_mn', h1: 'Minnesota House District 1B', where: 'District 1B as Minnesota’s current legislative plan draws it', kick: 'House District 1B board', kickTitle: 'The district board for Minnesota House District 1B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-3': { seat: 'mn-statehouse-3', composer: false, alias: 'mn-hd-3', route: '/district/mn-hd-3', pid: 'duran_mn', h1: 'Minnesota House District 2A', where: 'District 2A as Minnesota’s current legislative plan draws it', kick: 'House District 2A board', kickTitle: 'The district board for Minnesota House District 2A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-4': { seat: 'mn-statehouse-4', composer: false, alias: 'mn-hd-4', route: '/district/mn-hd-4', pid: 'bliss_mn', h1: 'Minnesota House District 2B', where: 'District 2B as Minnesota’s current legislative plan draws it', kick: 'House District 2B board', kickTitle: 'The district board for Minnesota House District 2B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-5': { seat: 'mn-statehouse-5', composer: false, alias: 'mn-hd-5', route: '/district/mn-hd-5', pid: 'skraba_mn', h1: 'Minnesota House District 3A', where: 'District 3A as Minnesota’s current legislative plan draws it', kick: 'House District 3A board', kickTitle: 'The district board for Minnesota House District 3A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-7': { seat: 'mn-statehouse-7', composer: false, alias: 'mn-hd-7', route: '/district/mn-hd-7', pid: 'keeler_mn', h1: 'Minnesota House District 4A', where: 'District 4A as Minnesota’s current legislative plan draws it', kick: 'House District 4A board', kickTitle: 'The district board for Minnesota House District 4A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-8': { seat: 'mn-statehouse-8', composer: false, alias: 'mn-hd-8', route: '/district/mn-hd-8', pid: 'joy_mn', h1: 'Minnesota House District 4B', where: 'District 4B as Minnesota’s current legislative plan draws it', kick: 'House District 4B board', kickTitle: 'The district board for Minnesota House District 4B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-9': { seat: 'mn-statehouse-9', composer: false, alias: 'mn-hd-9', route: '/district/mn-hd-9', pid: 'knudsen_mn', h1: 'Minnesota House District 5A', where: 'District 5A as Minnesota’s current legislative plan draws it', kick: 'House District 5A board', kickTitle: 'The district board for Minnesota House District 5A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-10': { seat: 'mn-statehouse-10', composer: false, alias: 'mn-hd-10', route: '/district/mn-hd-10', pid: 'wiener_mn', h1: 'Minnesota House District 5B', where: 'District 5B as Minnesota’s current legislative plan draws it', kick: 'House District 5B board', kickTitle: 'The district board for Minnesota House District 5B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-11': { seat: 'mn-statehouse-11', composer: false, alias: 'mn-hd-11', route: '/district/mn-hd-11', pid: 'davis_mn', h1: 'Minnesota House District 6A', where: 'District 6A as Minnesota’s current legislative plan draws it', kick: 'House District 6A board', kickTitle: 'The district board for Minnesota House District 6A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-12': { seat: 'mn-statehouse-12', composer: false, alias: 'mn-hd-12', route: '/district/mn-hd-12', pid: 'heintzeman_mn', h1: 'Minnesota House District 6B', where: 'District 6B as Minnesota’s current legislative plan draws it', kick: 'House District 6B board', kickTitle: 'The district board for Minnesota House District 6B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-13': { seat: 'mn-statehouse-13', composer: false, alias: 'mn-hd-13', route: '/district/mn-hd-13', pid: 'igo_mn', h1: 'Minnesota House District 7A', where: 'District 7A as Minnesota’s current legislative plan draws it', kick: 'House District 7A board', kickTitle: 'The district board for Minnesota House District 7A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-14': { seat: 'mn-statehouse-14', composer: false, alias: 'mn-hd-14', route: '/district/mn-hd-14', pid: 'warwas_mn', h1: 'Minnesota House District 7B', where: 'District 7B as Minnesota’s current legislative plan draws it', kick: 'House District 7B board', kickTitle: 'The district board for Minnesota House District 7B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-15': { seat: 'mn-statehouse-15', composer: false, alias: 'mn-hd-15', route: '/district/mn-hd-15', pid: 'johnson_mn', h1: 'Minnesota House District 8A', where: 'District 8A as Minnesota’s current legislative plan draws it', kick: 'House District 8A board', kickTitle: 'The district board for Minnesota House District 8A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-16': { seat: 'mn-statehouse-16', composer: false, alias: 'mn-hd-16', route: '/district/mn-hd-16', pid: 'kozlowski_mn', h1: 'Minnesota House District 8B', where: 'District 8B as Minnesota’s current legislative plan draws it', kick: 'House District 8B board', kickTitle: 'The district board for Minnesota House District 8B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-17': { seat: 'mn-statehouse-17', composer: false, alias: 'mn-hd-17', route: '/district/mn-hd-17', pid: 'backer_mn', h1: 'Minnesota House District 9A', where: 'District 9A as Minnesota’s current legislative plan draws it', kick: 'House District 9A board', kickTitle: 'The district board for Minnesota House District 9A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-18': { seat: 'mn-statehouse-18', composer: false, alias: 'mn-hd-18', route: '/district/mn-hd-18', pid: 'murphy_mn', h1: 'Minnesota House District 9B', where: 'District 9B as Minnesota’s current legislative plan draws it', kick: 'House District 9B board', kickTitle: 'The district board for Minnesota House District 9B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-19': { seat: 'mn-statehouse-19', composer: false, alias: 'mn-hd-19', route: '/district/mn-hd-19', pid: 'kresha_mn', h1: 'Minnesota House District 10A', where: 'District 10A as Minnesota’s current legislative plan draws it', kick: 'House District 10A board', kickTitle: 'The district board for Minnesota House District 10A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-20': { seat: 'mn-statehouse-20', composer: false, alias: 'mn-hd-20', route: '/district/mn-hd-20', pid: 'schultz_mn', h1: 'Minnesota House District 10B', where: 'District 10B as Minnesota’s current legislative plan draws it', kick: 'House District 10B board', kickTitle: 'The district board for Minnesota House District 10B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-21': { seat: 'mn-statehouse-21', composer: false, alias: 'mn-hd-21', route: '/district/mn-hd-21', pid: 'dotseth_mn', h1: 'Minnesota House District 11A', where: 'District 11A as Minnesota’s current legislative plan draws it', kick: 'House District 11A board', kickTitle: 'The district board for Minnesota House District 11A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-22': { seat: 'mn-statehouse-22', composer: false, alias: 'mn-hd-22', route: '/district/mn-hd-22', pid: 'nelson_mn', h1: 'Minnesota House District 11B', where: 'District 11B as Minnesota’s current legislative plan draws it', kick: 'House District 11B board', kickTitle: 'The district board for Minnesota House District 11B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-23': { seat: 'mn-statehouse-23', composer: false, alias: 'mn-hd-23', route: '/district/mn-hd-23', pid: 'anderson_mn', h1: 'Minnesota House District 12A', where: 'District 12A as Minnesota’s current legislative plan draws it', kick: 'House District 12A board', kickTitle: 'The district board for Minnesota House District 12A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-24': { seat: 'mn-statehouse-24', composer: false, alias: 'mn-hd-24', route: '/district/mn-hd-24', pid: 'franson_mn', h1: 'Minnesota House District 12B', where: 'District 12B as Minnesota’s current legislative plan draws it', kick: 'House District 12B board', kickTitle: 'The district board for Minnesota House District 12B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-26': { seat: 'mn-statehouse-26', composer: false, alias: 'mn-hd-26', route: '/district/mn-hd-26', pid: 'o_driscoll_mn', h1: 'Minnesota House District 13B', where: 'District 13B as Minnesota’s current legislative plan draws it', kick: 'House District 13B board', kickTitle: 'The district board for Minnesota House District 13B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-28': { seat: 'mn-statehouse-28', composer: false, alias: 'mn-hd-28', route: '/district/mn-hd-28', pid: 'wolgamott_mn', h1: 'Minnesota House District 14B', where: 'District 14B as Minnesota’s current legislative plan draws it', kick: 'House District 14B board', kickTitle: 'The district board for Minnesota House District 14B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-29': { seat: 'mn-statehouse-29', composer: false, alias: 'mn-hd-29', route: '/district/mn-hd-29', pid: 'swedzinski_mn', h1: 'Minnesota House District 15A', where: 'District 15A as Minnesota’s current legislative plan draws it', kick: 'House District 15A board', kickTitle: 'The district board for Minnesota House District 15A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-30': { seat: 'mn-statehouse-30', composer: false, alias: 'mn-hd-30', route: '/district/mn-hd-30', pid: 'torkelson_mn', h1: 'Minnesota House District 15B', where: 'District 15B as Minnesota’s current legislative plan draws it', kick: 'House District 15B board', kickTitle: 'The district board for Minnesota House District 15B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-31': { seat: 'mn-statehouse-31', composer: false, alias: 'mn-hd-31', route: '/district/mn-hd-31', pid: 'van_binsbergen_mn', h1: 'Minnesota House District 16A', where: 'District 16A as Minnesota’s current legislative plan draws it', kick: 'House District 16A board', kickTitle: 'The district board for Minnesota House District 16A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-32': { seat: 'mn-statehouse-32', composer: false, alias: 'mn-hd-32', route: '/district/mn-hd-32', pid: 'baker_mn', h1: 'Minnesota House District 16B', where: 'District 16B as Minnesota’s current legislative plan draws it', kick: 'House District 16B board', kickTitle: 'The district board for Minnesota House District 16B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-33': { seat: 'mn-statehouse-33', composer: false, alias: 'mn-hd-33', route: '/district/mn-hd-33', pid: 'gillman_mn', h1: 'Minnesota House District 17A', where: 'District 17A as Minnesota’s current legislative plan draws it', kick: 'House District 17A board', kickTitle: 'The district board for Minnesota House District 17A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-34': { seat: 'mn-statehouse-34', composer: false, alias: 'mn-hd-34', route: '/district/mn-hd-34', pid: 'harder_mn', h1: 'Minnesota House District 17B', where: 'District 17B as Minnesota’s current legislative plan draws it', kick: 'House District 17B board', kickTitle: 'The district board for Minnesota House District 17B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-36': { seat: 'mn-statehouse-36', composer: false, alias: 'mn-hd-36', route: '/district/mn-hd-36', pid: 'frederick_mn', h1: 'Minnesota House District 18B', where: 'District 18B as Minnesota’s current legislative plan draws it', kick: 'House District 18B board', kickTitle: 'The district board for Minnesota House District 18B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-37': { seat: 'mn-statehouse-37', composer: false, alias: 'mn-hd-37', route: '/district/mn-hd-37', pid: 'allen_mn', h1: 'Minnesota House District 19A', where: 'District 19A as Minnesota’s current legislative plan draws it', kick: 'House District 19A board', kickTitle: 'The district board for Minnesota House District 19A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-38': { seat: 'mn-statehouse-38', composer: false, alias: 'mn-hd-38', route: '/district/mn-hd-38', pid: 'sexton_mn', h1: 'Minnesota House District 19B', where: 'District 19B as Minnesota’s current legislative plan draws it', kick: 'House District 19B board', kickTitle: 'The district board for Minnesota House District 19B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-39': { seat: 'mn-statehouse-39', composer: false, alias: 'mn-hd-39', route: '/district/mn-hd-39', pid: 'altendorf_mn', h1: 'Minnesota House District 20A', where: 'District 20A as Minnesota’s current legislative plan draws it', kick: 'House District 20A board', kickTitle: 'The district board for Minnesota House District 20A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-40': { seat: 'mn-statehouse-40', composer: false, alias: 'mn-hd-40', route: '/district/mn-hd-40', pid: 'jacob_mn', h1: 'Minnesota House District 20B', where: 'District 20B as Minnesota’s current legislative plan draws it', kick: 'House District 20B board', kickTitle: 'The district board for Minnesota House District 20B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-41': { seat: 'mn-statehouse-41', composer: false, alias: 'mn-hd-41', route: '/district/mn-hd-41', pid: 'schomacker_mn', h1: 'Minnesota House District 21A', where: 'District 21A as Minnesota’s current legislative plan draws it', kick: 'House District 21A board', kickTitle: 'The district board for Minnesota House District 21A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-42': { seat: 'mn-statehouse-42', composer: false, alias: 'mn-hd-42', route: '/district/mn-hd-42', pid: 'fogelman_mn', h1: 'Minnesota House District 21B', where: 'District 21B as Minnesota’s current legislative plan draws it', kick: 'House District 21B board', kickTitle: 'The district board for Minnesota House District 21B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-43': { seat: 'mn-statehouse-43', composer: false, alias: 'mn-hd-43', route: '/district/mn-hd-43', pid: 'olson_mn', h1: 'Minnesota House District 22A', where: 'District 22A as Minnesota’s current legislative plan draws it', kick: 'House District 22A board', kickTitle: 'The district board for Minnesota House District 22A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-44': { seat: 'mn-statehouse-44', composer: false, alias: 'mn-hd-44', route: '/district/mn-hd-44', pid: 'stier_mn', h1: 'Minnesota House District 22B', where: 'District 22B as Minnesota’s current legislative plan draws it', kick: 'House District 22B board', kickTitle: 'The district board for Minnesota House District 22B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-45': { seat: 'mn-statehouse-45', composer: false, alias: 'mn-hd-45', route: '/district/mn-hd-45', pid: 'bennett_mn', h1: 'Minnesota House District 23A', where: 'District 23A as Minnesota’s current legislative plan draws it', kick: 'House District 23A board', kickTitle: 'The district board for Minnesota House District 23A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-46': { seat: 'mn-statehouse-46', composer: false, alias: 'mn-hd-46', route: '/district/mn-hd-46', pid: 'mueller_mn', h1: 'Minnesota House District 23B', where: 'District 23B as Minnesota’s current legislative plan draws it', kick: 'House District 23B board', kickTitle: 'The district board for Minnesota House District 23B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-47': { seat: 'mn-statehouse-47', composer: false, alias: 'mn-hd-47', route: '/district/mn-hd-47', pid: 'quam_mn', h1: 'Minnesota House District 24A', where: 'District 24A as Minnesota’s current legislative plan draws it', kick: 'House District 24A board', kickTitle: 'The district board for Minnesota House District 24A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-48': { seat: 'mn-statehouse-48', composer: false, alias: 'mn-hd-48', route: '/district/mn-hd-48', pid: 'liebling_mn', h1: 'Minnesota House District 24B', where: 'District 24B as Minnesota’s current legislative plan draws it', kick: 'House District 24B board', kickTitle: 'The district board for Minnesota House District 24B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-49': { seat: 'mn-statehouse-49', composer: false, alias: 'mn-hd-49', route: '/district/mn-hd-49', pid: 'hicks_mn', h1: 'Minnesota House District 25A', where: 'District 25A as Minnesota’s current legislative plan draws it', kick: 'House District 25A board', kickTitle: 'The district board for Minnesota House District 25A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-50': { seat: 'mn-statehouse-50', composer: false, alias: 'mn-hd-50', route: '/district/mn-hd-50', pid: 'smith_mn', h1: 'Minnesota House District 25B', where: 'District 25B as Minnesota’s current legislative plan draws it', kick: 'House District 25B board', kickTitle: 'The district board for Minnesota House District 25B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-51': { seat: 'mn-statehouse-51', composer: false, alias: 'mn-hd-51', route: '/district/mn-hd-51', pid: 'repinski_mn', h1: 'Minnesota House District 26A', where: 'District 26A as Minnesota’s current legislative plan draws it', kick: 'House District 26A board', kickTitle: 'The district board for Minnesota House District 26A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-52': { seat: 'mn-statehouse-52', composer: false, alias: 'mn-hd-52', route: '/district/mn-hd-52', pid: 'davids_mn', h1: 'Minnesota House District 26B', where: 'District 26B as Minnesota’s current legislative plan draws it', kick: 'House District 26B board', kickTitle: 'The district board for Minnesota House District 26B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-53': { seat: 'mn-statehouse-53', composer: false, alias: 'mn-hd-53', route: '/district/mn-hd-53', pid: 'mekeland_mn', h1: 'Minnesota House District 27A', where: 'District 27A as Minnesota’s current legislative plan draws it', kick: 'House District 27A board', kickTitle: 'The district board for Minnesota House District 27A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-54': { seat: 'mn-statehouse-54', composer: false, alias: 'mn-hd-54', route: '/district/mn-hd-54', pid: 'lawrence_mn', h1: 'Minnesota House District 27B', where: 'District 27B as Minnesota’s current legislative plan draws it', kick: 'House District 27B board', kickTitle: 'The district board for Minnesota House District 27B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-55': { seat: 'mn-statehouse-55', composer: false, alias: 'mn-hd-55', route: '/district/mn-hd-55', pid: 'gordon_mn', h1: 'Minnesota House District 28A', where: 'District 28A as Minnesota’s current legislative plan draws it', kick: 'House District 28A board', kickTitle: 'The district board for Minnesota House District 28A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-56': { seat: 'mn-statehouse-56', composer: false, alias: 'mn-hd-56', route: '/district/mn-hd-56', pid: 'rymer_mn', h1: 'Minnesota House District 28B', where: 'District 28B as Minnesota’s current legislative plan draws it', kick: 'House District 28B board', kickTitle: 'The district board for Minnesota House District 28B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-57': { seat: 'mn-statehouse-57', composer: false, alias: 'mn-hd-57', route: '/district/mn-hd-57', pid: 'mcdonald_mn', h1: 'Minnesota House District 29A', where: 'District 29A as Minnesota’s current legislative plan draws it', kick: 'House District 29A board', kickTitle: 'The district board for Minnesota House District 29A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-58': { seat: 'mn-statehouse-58', composer: false, alias: 'mn-hd-58', route: '/district/mn-hd-58', pid: 'rarick_mn', h1: 'Minnesota House District 29B', where: 'District 29B as Minnesota’s current legislative plan draws it', kick: 'House District 29B board', kickTitle: 'The district board for Minnesota House District 29B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-59': { seat: 'mn-statehouse-59', composer: false, alias: 'mn-hd-59', route: '/district/mn-hd-59', pid: 'hudson_mn', h1: 'Minnesota House District 30A', where: 'District 30A as Minnesota’s current legislative plan draws it', kick: 'House District 30A board', kickTitle: 'The district board for Minnesota House District 30A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-60': { seat: 'mn-statehouse-60', composer: false, alias: 'mn-hd-60', route: '/district/mn-hd-60', pid: 'novotny_mn', h1: 'Minnesota House District 30B', where: 'District 30B as Minnesota’s current legislative plan draws it', kick: 'House District 30B board', kickTitle: 'The district board for Minnesota House District 30B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-61': { seat: 'mn-statehouse-61', composer: false, alias: 'mn-hd-61', route: '/district/mn-hd-61', pid: 'niska_mn', h1: 'Minnesota House District 31A', where: 'District 31A as Minnesota’s current legislative plan draws it', kick: 'House District 31A board', kickTitle: 'The district board for Minnesota House District 31A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-62': { seat: 'mn-statehouse-62', composer: false, alias: 'mn-hd-62', route: '/district/mn-hd-62', pid: 'scott_mn', h1: 'Minnesota House District 31B', where: 'District 31B as Minnesota’s current legislative plan draws it', kick: 'House District 31B board', kickTitle: 'The district board for Minnesota House District 31B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-65': { seat: 'mn-statehouse-65', composer: false, alias: 'mn-hd-65', route: '/district/mn-hd-65', pid: 'patti_anderson_mn', h1: 'Minnesota House District 33A', where: 'District 33A as Minnesota’s current legislative plan draws it', kick: 'House District 33A board', kickTitle: 'The district board for Minnesota House District 33A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-66': { seat: 'mn-statehouse-66', composer: false, alias: 'mn-hd-66', route: '/district/mn-hd-66', pid: 'hill_mn', h1: 'Minnesota House District 33B', where: 'District 33B as Minnesota’s current legislative plan draws it', kick: 'House District 33B board', kickTitle: 'The district board for Minnesota House District 33B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-68': { seat: 'mn-statehouse-68', composer: false, alias: 'mn-hd-68', route: '/district/mn-hd-68', pid: 'lee_mn', h1: 'Minnesota House District 34B', where: 'District 34B as Minnesota’s current legislative plan draws it', kick: 'House District 34B board', kickTitle: 'The district board for Minnesota House District 34B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-71': { seat: 'mn-statehouse-71', composer: false, alias: 'mn-hd-71', route: '/district/mn-hd-71', pid: 'engen_mn', h1: 'Minnesota House District 36A', where: 'District 36A as Minnesota’s current legislative plan draws it', kick: 'House District 36A board', kickTitle: 'The district board for Minnesota House District 36A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-72': { seat: 'mn-statehouse-72', composer: false, alias: 'mn-hd-72', route: '/district/mn-hd-72', pid: 'curran_mn', h1: 'Minnesota House District 36B', where: 'District 36B as Minnesota’s current legislative plan draws it', kick: 'House District 36B board', kickTitle: 'The district board for Minnesota House District 36B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-73': { seat: 'mn-statehouse-73', composer: false, alias: 'mn-hd-73', route: '/district/mn-hd-73', pid: 'robbins_mn', h1: 'Minnesota House District 37A', where: 'District 37A as Minnesota’s current legislative plan draws it', kick: 'House District 37A board', kickTitle: 'The district board for Minnesota House District 37A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-74': { seat: 'mn-statehouse-74', composer: false, alias: 'mn-hd-74', route: '/district/mn-hd-74', pid: 'bahner_mn', h1: 'Minnesota House District 37B', where: 'District 37B as Minnesota’s current legislative plan draws it', kick: 'House District 37B board', kickTitle: 'The district board for Minnesota House District 37B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-75': { seat: 'mn-statehouse-75', composer: false, alias: 'mn-hd-75', route: '/district/mn-hd-75', pid: 'hiltsley_mn', h1: 'Minnesota House District 38A', where: 'District 38A as Minnesota’s current legislative plan draws it', kick: 'House District 38A board', kickTitle: 'The district board for Minnesota House District 38A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-76': { seat: 'mn-statehouse-76', composer: false, alias: 'mn-hd-76', route: '/district/mn-hd-76', pid: 'vang_mn', h1: 'Minnesota House District 38B', where: 'District 38B as Minnesota’s current legislative plan draws it', kick: 'House District 38B board', kickTitle: 'The district board for Minnesota House District 38B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-77': { seat: 'mn-statehouse-77', composer: false, alias: 'mn-hd-77', route: '/district/mn-hd-77', pid: 'koegel_mn', h1: 'Minnesota House District 39A', where: 'District 39A as Minnesota’s current legislative plan draws it', kick: 'House District 39A board', kickTitle: 'The district board for Minnesota House District 39A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-78': { seat: 'mn-statehouse-78', composer: false, alias: 'mn-hd-78', route: '/district/mn-hd-78', pid: 'feist_mn', h1: 'Minnesota House District 39B', where: 'District 39B as Minnesota’s current legislative plan draws it', kick: 'House District 39B board', kickTitle: 'The district board for Minnesota House District 39B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-79': { seat: 'mn-statehouse-79', composer: false, alias: 'mn-hd-79', route: '/district/mn-hd-79', pid: 'moller_mn', h1: 'Minnesota House District 40A', where: 'District 40A as Minnesota’s current legislative plan draws it', kick: 'House District 40A board', kickTitle: 'The district board for Minnesota House District 40A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-80': { seat: 'mn-statehouse-80', composer: false, alias: 'mn-hd-80', route: '/district/mn-hd-80', pid: 'gottfried_mn', h1: 'Minnesota House District 40B', where: 'District 40B as Minnesota’s current legislative plan draws it', kick: 'House District 40B board', kickTitle: 'The district board for Minnesota House District 40B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-83': { seat: 'mn-statehouse-83', composer: false, alias: 'mn-hd-83', route: '/district/mn-hd-83', pid: 'carroll_mn', h1: 'Minnesota House District 42A', where: 'District 42A as Minnesota’s current legislative plan draws it', kick: 'House District 42A board', kickTitle: 'The district board for Minnesota House District 42A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-84': { seat: 'mn-statehouse-84', composer: false, alias: 'mn-hd-84', route: '/district/mn-hd-84', pid: 'klevorn_mn', h1: 'Minnesota House District 42B', where: 'District 42B as Minnesota’s current legislative plan draws it', kick: 'House District 42B board', kickTitle: 'The district board for Minnesota House District 42B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-85': { seat: 'mn-statehouse-85', composer: false, alias: 'mn-hd-85', route: '/district/mn-hd-85', pid: 'frazier_mn', h1: 'Minnesota House District 43A', where: 'District 43A as Minnesota’s current legislative plan draws it', kick: 'House District 43A board', kickTitle: 'The district board for Minnesota House District 43A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-86': { seat: 'mn-statehouse-86', composer: false, alias: 'mn-hd-86', route: '/district/mn-hd-86', pid: 'freiberg_mn', h1: 'Minnesota House District 43B', where: 'District 43B as Minnesota’s current legislative plan draws it', kick: 'House District 43B board', kickTitle: 'The district board for Minnesota House District 43B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-87': { seat: 'mn-statehouse-87', composer: false, alias: 'mn-hd-87', route: '/district/mn-hd-87', pid: 'fischer_mn', h1: 'Minnesota House District 44A', where: 'District 44A as Minnesota’s current legislative plan draws it', kick: 'House District 44A board', kickTitle: 'The district board for Minnesota House District 44A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-88': { seat: 'mn-statehouse-88', composer: false, alias: 'mn-hd-88', route: '/district/mn-hd-88', pid: 'lillie_mn', h1: 'Minnesota House District 44B', where: 'District 44B as Minnesota’s current legislative plan draws it', kick: 'House District 44B board', kickTitle: 'The district board for Minnesota House District 44B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-90': { seat: 'mn-statehouse-90', composer: false, alias: 'mn-hd-90', route: '/district/mn-hd-90', pid: 'acomb_mn', h1: 'Minnesota House District 45B', where: 'District 45B as Minnesota’s current legislative plan draws it', kick: 'House District 45B board', kickTitle: 'The district board for Minnesota House District 45B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-91': { seat: 'mn-statehouse-91', composer: false, alias: 'mn-hd-91', route: '/district/mn-hd-91', pid: 'kraft_mn', h1: 'Minnesota House District 46A', where: 'District 46A as Minnesota’s current legislative plan draws it', kick: 'House District 46A board', kickTitle: 'The district board for Minnesota House District 46A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-92': { seat: 'mn-statehouse-92', composer: false, alias: 'mn-hd-92', route: '/district/mn-hd-92', pid: 'youakim_mn', h1: 'Minnesota House District 46B', where: 'District 46B as Minnesota’s current legislative plan draws it', kick: 'House District 46B board', kickTitle: 'The district board for Minnesota House District 46B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-93': { seat: 'mn-statehouse-93', composer: false, alias: 'mn-hd-93', route: '/district/mn-hd-93', pid: 'buck_mn', h1: 'Minnesota House District 47A', where: 'District 47A as Minnesota’s current legislative plan draws it', kick: 'House District 47A board', kickTitle: 'The district board for Minnesota House District 47A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-94': { seat: 'mn-statehouse-94', composer: false, alias: 'mn-hd-94', route: '/district/mn-hd-94', pid: 'cha_mn', h1: 'Minnesota House District 47B', where: 'District 47B as Minnesota’s current legislative plan draws it', kick: 'House District 47B board', kickTitle: 'The district board for Minnesota House District 47B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-95': { seat: 'mn-statehouse-95', composer: false, alias: 'mn-hd-95', route: '/district/mn-hd-95', pid: 'nash_mn', h1: 'Minnesota House District 48A', where: 'District 48A as Minnesota’s current legislative plan draws it', kick: 'House District 48A board', kickTitle: 'The district board for Minnesota House District 48A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-97': { seat: 'mn-statehouse-97', composer: false, alias: 'mn-hd-97', route: '/district/mn-hd-97', pid: 'falconer_mn', h1: 'Minnesota House District 49A', where: 'District 49A as Minnesota’s current legislative plan draws it', kick: 'House District 49A board', kickTitle: 'The district board for Minnesota House District 49A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-98': { seat: 'mn-statehouse-98', composer: false, alias: 'mn-hd-98', route: '/district/mn-hd-98', pid: 'kotyza_witthuhn_mn', h1: 'Minnesota House District 49B', where: 'District 49B as Minnesota’s current legislative plan draws it', kick: 'House District 49B board', kickTitle: 'The district board for Minnesota House District 49B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-99': { seat: 'mn-statehouse-99', composer: false, alias: 'mn-hd-99', route: '/district/mn-hd-99', pid: 'greene_mn', h1: 'Minnesota House District 50A', where: 'District 50A as Minnesota’s current legislative plan draws it', kick: 'House District 50A board', kickTitle: 'The district board for Minnesota House District 50A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-100': { seat: 'mn-statehouse-100', composer: false, alias: 'mn-hd-100', route: '/district/mn-hd-100', pid: 'elkins_mn', h1: 'Minnesota House District 50B', where: 'District 50B as Minnesota’s current legislative plan draws it', kick: 'House District 50B board', kickTitle: 'The district board for Minnesota House District 50B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-101': { seat: 'mn-statehouse-101', composer: false, alias: 'mn-hd-101', route: '/district/mn-hd-101', pid: 'howard_mn', h1: 'Minnesota House District 51A', where: 'District 51A as Minnesota’s current legislative plan draws it', kick: 'House District 51A board', kickTitle: 'The district board for Minnesota House District 51A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-102': { seat: 'mn-statehouse-102', composer: false, alias: 'mn-hd-102', route: '/district/mn-hd-102', pid: 'coulter_mn', h1: 'Minnesota House District 51B', where: 'District 51B as Minnesota’s current legislative plan draws it', kick: 'House District 51B board', kickTitle: 'The district board for Minnesota House District 51B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-103': { seat: 'mn-statehouse-103', composer: false, alias: 'mn-hd-103', route: '/district/mn-hd-103', pid: 'reyer_mn', h1: 'Minnesota House District 52A', where: 'District 52A as Minnesota’s current legislative plan draws it', kick: 'House District 52A board', kickTitle: 'The district board for Minnesota House District 52A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-104': { seat: 'mn-statehouse-104', composer: false, alias: 'mn-hd-104', route: '/district/mn-hd-104', pid: 'virnig_mn', h1: 'Minnesota House District 52B', where: 'District 52B as Minnesota’s current legislative plan draws it', kick: 'House District 52B board', kickTitle: 'The district board for Minnesota House District 52B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-105': { seat: 'mn-statehouse-105', composer: false, alias: 'mn-hd-105', route: '/district/mn-hd-105', pid: 'clardy_mn', h1: 'Minnesota House District 53A', where: 'District 53A as Minnesota’s current legislative plan draws it', kick: 'House District 53A board', kickTitle: 'The district board for Minnesota House District 53A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-106': { seat: 'mn-statehouse-106', composer: false, alias: 'mn-hd-106', route: '/district/mn-hd-106', pid: 'hansen_mn', h1: 'Minnesota House District 53B', where: 'District 53B as Minnesota’s current legislative plan draws it', kick: 'House District 53B board', kickTitle: 'The district board for Minnesota House District 53B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-108': { seat: 'mn-statehouse-108', composer: false, alias: 'mn-hd-108', route: '/district/mn-hd-108', pid: 'bakeberg_mn', h1: 'Minnesota House District 54B', where: 'District 54B as Minnesota’s current legislative plan draws it', kick: 'House District 54B board', kickTitle: 'The district board for Minnesota House District 54B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-109': { seat: 'mn-statehouse-109', composer: false, alias: 'mn-hd-109', route: '/district/mn-hd-109', pid: 'hanson_mn', h1: 'Minnesota House District 55A', where: 'District 55A as Minnesota’s current legislative plan draws it', kick: 'House District 55A board', kickTitle: 'The district board for Minnesota House District 55A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-110': { seat: 'mn-statehouse-110', composer: false, alias: 'mn-hd-110', route: '/district/mn-hd-110', pid: 'berg_mn', h1: 'Minnesota House District 55B', where: 'District 55B as Minnesota’s current legislative plan draws it', kick: 'House District 55B board', kickTitle: 'The district board for Minnesota House District 55B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-111': { seat: 'mn-statehouse-111', composer: false, alias: 'mn-hd-111', route: '/district/mn-hd-111', pid: 'bierman_mn', h1: 'Minnesota House District 56A', where: 'District 56A as Minnesota’s current legislative plan draws it', kick: 'House District 56A board', kickTitle: 'The district board for Minnesota House District 56A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-112': { seat: 'mn-statehouse-112', composer: false, alias: 'mn-hd-112', route: '/district/mn-hd-112', pid: 'huot_mn', h1: 'Minnesota House District 56B', where: 'District 56B as Minnesota’s current legislative plan draws it', kick: 'House District 56B board', kickTitle: 'The district board for Minnesota House District 56B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-113': { seat: 'mn-statehouse-113', composer: false, alias: 'mn-hd-113', route: '/district/mn-hd-113', pid: 'koznick_mn', h1: 'Minnesota House District 57A', where: 'District 57A as Minnesota’s current legislative plan draws it', kick: 'House District 57A board', kickTitle: 'The district board for Minnesota House District 57A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-114': { seat: 'mn-statehouse-114', composer: false, alias: 'mn-hd-114', route: '/district/mn-hd-114', pid: 'witte_mn', h1: 'Minnesota House District 57B', where: 'District 57B as Minnesota’s current legislative plan draws it', kick: 'House District 57B board', kickTitle: 'The district board for Minnesota House District 57B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-115': { seat: 'mn-statehouse-115', composer: false, alias: 'mn-hd-115', route: '/district/mn-hd-115', pid: 'pursell_mn', h1: 'Minnesota House District 58A', where: 'District 58A as Minnesota’s current legislative plan draws it', kick: 'House District 58A board', kickTitle: 'The district board for Minnesota House District 58A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-116': { seat: 'mn-statehouse-116', composer: false, alias: 'mn-hd-116', route: '/district/mn-hd-116', pid: 'roach_mn', h1: 'Minnesota House District 58B', where: 'District 58B as Minnesota’s current legislative plan draws it', kick: 'House District 58B board', kickTitle: 'The district board for Minnesota House District 58B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-117': { seat: 'mn-statehouse-117', composer: false, alias: 'mn-hd-117', route: '/district/mn-hd-117', pid: 'fue_lee_mn', h1: 'Minnesota House District 59A', where: 'District 59A as Minnesota’s current legislative plan draws it', kick: 'House District 59A board', kickTitle: 'The district board for Minnesota House District 59A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-118': { seat: 'mn-statehouse-118', composer: false, alias: 'mn-hd-118', route: '/district/mn-hd-118', pid: 'agbaje_mn', h1: 'Minnesota House District 59B', where: 'District 59B as Minnesota’s current legislative plan draws it', kick: 'House District 59B board', kickTitle: 'The district board for Minnesota House District 59B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-119': { seat: 'mn-statehouse-119', composer: false, alias: 'mn-hd-119', route: '/district/mn-hd-119', pid: 'jordan_mn', h1: 'Minnesota House District 60A', where: 'District 60A as Minnesota’s current legislative plan draws it', kick: 'House District 60A board', kickTitle: 'The district board for Minnesota House District 60A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-120': { seat: 'mn-statehouse-120', composer: false, alias: 'mn-hd-120', route: '/district/mn-hd-120', pid: 'noor_mn', h1: 'Minnesota House District 60B', where: 'District 60B as Minnesota’s current legislative plan draws it', kick: 'House District 60B board', kickTitle: 'The district board for Minnesota House District 60B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-121': { seat: 'mn-statehouse-121', composer: false, alias: 'mn-hd-121', route: '/district/mn-hd-121', pid: 'jones_mn', h1: 'Minnesota House District 61A', where: 'District 61A as Minnesota’s current legislative plan draws it', kick: 'House District 61A board', kickTitle: 'The district board for Minnesota House District 61A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-122': { seat: 'mn-statehouse-122', composer: false, alias: 'mn-hd-122', route: '/district/mn-hd-122', pid: 'long_mn', h1: 'Minnesota House District 61B', where: 'District 61B as Minnesota’s current legislative plan draws it', kick: 'House District 61B board', kickTitle: 'The district board for Minnesota House District 61B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-123': { seat: 'mn-statehouse-123', composer: false, alias: 'mn-hd-123', route: '/district/mn-hd-123', pid: 'gomez_mn', h1: 'Minnesota House District 62A', where: 'District 62A as Minnesota’s current legislative plan draws it', kick: 'House District 62A board', kickTitle: 'The district board for Minnesota House District 62A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-124': { seat: 'mn-statehouse-124', composer: false, alias: 'mn-hd-124', route: '/district/mn-hd-124', pid: 'mahamoud_mn', h1: 'Minnesota House District 62B', where: 'District 62B as Minnesota’s current legislative plan draws it', kick: 'House District 62B board', kickTitle: 'The district board for Minnesota House District 62B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-125': { seat: 'mn-statehouse-125', composer: false, alias: 'mn-hd-125', route: '/district/mn-hd-125', pid: 'sencer_mura_mn', h1: 'Minnesota House District 63A', where: 'District 63A as Minnesota’s current legislative plan draws it', kick: 'House District 63A board', kickTitle: 'The district board for Minnesota House District 63A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-126': { seat: 'mn-statehouse-126', composer: false, alias: 'mn-hd-126', route: '/district/mn-hd-126', pid: 'greenman_mn', h1: 'Minnesota House District 63B', where: 'District 63B as Minnesota’s current legislative plan draws it', kick: 'House District 63B board', kickTitle: 'The district board for Minnesota House District 63B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-127': { seat: 'mn-statehouse-127', composer: false, alias: 'mn-hd-127', route: '/district/mn-hd-127', pid: 'luger_nikolai_mn', h1: 'Minnesota House District 64A', where: 'District 64A as Minnesota’s current legislative plan draws it', kick: 'House District 64A board', kickTitle: 'The district board for Minnesota House District 64A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-128': { seat: 'mn-statehouse-128', composer: false, alias: 'mn-hd-128', route: '/district/mn-hd-128', pid: 'pinto_mn', h1: 'Minnesota House District 64B', where: 'District 64B as Minnesota’s current legislative plan draws it', kick: 'House District 64B board', kickTitle: 'The district board for Minnesota House District 64B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-129': { seat: 'mn-statehouse-129', composer: false, alias: 'mn-hd-129', route: '/district/mn-hd-129', pid: 'hussein_mn', h1: 'Minnesota House District 65A', where: 'District 65A as Minnesota’s current legislative plan draws it', kick: 'House District 65A board', kickTitle: 'The district board for Minnesota House District 65A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-130': { seat: 'mn-statehouse-130', composer: false, alias: 'mn-hd-130', route: '/district/mn-hd-130', pid: 'perez_vega_mn', h1: 'Minnesota House District 65B', where: 'District 65B as Minnesota’s current legislative plan draws it', kick: 'House District 65B board', kickTitle: 'The district board for Minnesota House District 65B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-131': { seat: 'mn-statehouse-131', composer: false, alias: 'mn-hd-131', route: '/district/mn-hd-131', pid: 'finke_mn', h1: 'Minnesota House District 66A', where: 'District 66A as Minnesota’s current legislative plan draws it', kick: 'House District 66A board', kickTitle: 'The district board for Minnesota House District 66A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-132': { seat: 'mn-statehouse-132', composer: false, alias: 'mn-hd-132', route: '/district/mn-hd-132', pid: 'hollins_mn', h1: 'Minnesota House District 66B', where: 'District 66B as Minnesota’s current legislative plan draws it', kick: 'House District 66B board', kickTitle: 'The district board for Minnesota House District 66B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-133': { seat: 'mn-statehouse-133', composer: false, alias: 'mn-hd-133', route: '/district/mn-hd-133', pid: 'liz_lee_mn', h1: 'Minnesota House District 67A', where: 'District 67A as Minnesota’s current legislative plan draws it', kick: 'House District 67A board', kickTitle: 'The district board for Minnesota House District 67A: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statehouse-134': { seat: 'mn-statehouse-134', composer: false, alias: 'mn-hd-134', route: '/district/mn-hd-134', pid: 'xiong_mn', h1: 'Minnesota House District 67B', where: 'District 67B as Minnesota’s current legislative plan draws it', kick: 'House District 67B board', kickTitle: 'The district board for Minnesota House District 67B: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-2': { seat: 'mn-statesenate-2', composer: false, alias: 'mn-sd-2', route: '/district/mn-sd-2', pid: 'green_mn', h1: 'Minnesota Senate District 2', where: 'District 2 as Minnesota’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Minnesota Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-5': { seat: 'mn-statesenate-5', composer: false, alias: 'mn-sd-5', route: '/district/mn-sd-5', pid: 'utke_mn', h1: 'Minnesota Senate District 5', where: 'District 5 as Minnesota’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Minnesota Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-6': { seat: 'mn-statesenate-6', composer: false, alias: 'mn-sd-6', route: '/district/mn-sd-6', pid: 'keri_heintzeman_mn', h1: 'Minnesota Senate District 6', where: 'District 6 as Minnesota’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Minnesota Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-7': { seat: 'mn-statesenate-7', composer: false, alias: 'mn-sd-7', route: '/district/mn-sd-7', pid: 'farnsworth_mn', h1: 'Minnesota Senate District 7', where: 'District 7 as Minnesota’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Minnesota Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-8': { seat: 'mn-statesenate-8', composer: false, alias: 'mn-sd-8', route: '/district/mn-sd-8', pid: 'mcewen_mn', h1: 'Minnesota Senate District 8', where: 'District 8 as Minnesota’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Minnesota Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-9': { seat: 'mn-statesenate-9', composer: false, alias: 'mn-sd-9', route: '/district/mn-sd-9', pid: 'rasmusson_mn', h1: 'Minnesota Senate District 9', where: 'District 9 as Minnesota’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Minnesota Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-10': { seat: 'mn-statesenate-10', composer: false, alias: 'mn-sd-10', route: '/district/mn-sd-10', pid: 'wesenberg_mn', h1: 'Minnesota Senate District 10', where: 'District 10 as Minnesota’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Minnesota Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-11': { seat: 'mn-statesenate-11', composer: false, alias: 'mn-sd-11', route: '/district/mn-sd-11', pid: 'jason_rarick_mn', h1: 'Minnesota Senate District 11', where: 'District 11 as Minnesota’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Minnesota Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-12': { seat: 'mn-statesenate-12', composer: false, alias: 'mn-sd-12', route: '/district/mn-sd-12', pid: 'westrom_mn', h1: 'Minnesota Senate District 12', where: 'District 12 as Minnesota’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Minnesota Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-13': { seat: 'mn-statesenate-13', composer: false, alias: 'mn-sd-13', route: '/district/mn-sd-13', pid: 'howe_mn', h1: 'Minnesota Senate District 13', where: 'District 13 as Minnesota’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Minnesota Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-15': { seat: 'mn-statesenate-15', composer: false, alias: 'mn-sd-15', route: '/district/mn-sd-15', pid: 'dahms_mn', h1: 'Minnesota Senate District 15', where: 'District 15 as Minnesota’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Minnesota Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-16': { seat: 'mn-statesenate-16', composer: false, alias: 'mn-sd-16', route: '/district/mn-sd-16', pid: 'lang_mn', h1: 'Minnesota Senate District 16', where: 'District 16 as Minnesota’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Minnesota Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-17': { seat: 'mn-statesenate-17', composer: false, alias: 'mn-sd-17', route: '/district/mn-sd-17', pid: 'gruenhagen_mn', h1: 'Minnesota Senate District 17', where: 'District 17 as Minnesota’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Minnesota Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-18': { seat: 'mn-statesenate-18', composer: false, alias: 'mn-sd-18', route: '/district/mn-sd-18', pid: 'frentz_mn', h1: 'Minnesota Senate District 18', where: 'District 18 as Minnesota’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Minnesota Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-19': { seat: 'mn-statesenate-19', composer: false, alias: 'mn-sd-19', route: '/district/mn-sd-19', pid: 'jasinski_mn', h1: 'Minnesota Senate District 19', where: 'District 19 as Minnesota’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Minnesota Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-20': { seat: 'mn-statesenate-20', composer: false, alias: 'mn-sd-20', route: '/district/mn-sd-20', pid: 'drazkowski_mn', h1: 'Minnesota Senate District 20', where: 'District 20 as Minnesota’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Minnesota Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-21': { seat: 'mn-statesenate-21', composer: false, alias: 'mn-sd-21', route: '/district/mn-sd-21', pid: 'weber_mn', h1: 'Minnesota Senate District 21', where: 'District 21 as Minnesota’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Minnesota Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-22': { seat: 'mn-statesenate-22', composer: false, alias: 'mn-sd-22', route: '/district/mn-sd-22', pid: 'draheim_mn', h1: 'Minnesota Senate District 22', where: 'District 22 as Minnesota’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Minnesota Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-23': { seat: 'mn-statesenate-23', composer: false, alias: 'mn-sd-23', route: '/district/mn-sd-23', pid: 'dornink_mn', h1: 'Minnesota Senate District 23', where: 'District 23 as Minnesota’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Minnesota Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-24': { seat: 'mn-statesenate-24', composer: false, alias: 'mn-sd-24', route: '/district/mn-sd-24', pid: 'carla_nelson_mn', h1: 'Minnesota Senate District 24', where: 'District 24 as Minnesota’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Minnesota Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-25': { seat: 'mn-statesenate-25', composer: false, alias: 'mn-sd-25', route: '/district/mn-sd-25', pid: 'boldon_mn', h1: 'Minnesota Senate District 25', where: 'District 25 as Minnesota’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Minnesota Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-26': { seat: 'mn-statesenate-26', composer: false, alias: 'mn-sd-26', route: '/district/mn-sd-26', pid: 'miller_mn', h1: 'Minnesota Senate District 26', where: 'District 26 as Minnesota’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Minnesota Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-27': { seat: 'mn-statesenate-27', composer: false, alias: 'mn-sd-27', route: '/district/mn-sd-27', pid: 'mathews_mn', h1: 'Minnesota Senate District 27', where: 'District 27 as Minnesota’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Minnesota Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-28': { seat: 'mn-statesenate-28', composer: false, alias: 'mn-sd-28', route: '/district/mn-sd-28', pid: 'koran_mn', h1: 'Minnesota Senate District 28', where: 'District 28 as Minnesota’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Minnesota Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-29': { seat: 'mn-statesenate-29', composer: false, alias: 'mn-sd-29', route: '/district/mn-sd-29', pid: 'holmstrom_mn', h1: 'Minnesota Senate District 29', where: 'District 29 as Minnesota’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Minnesota Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-30': { seat: 'mn-statesenate-30', composer: false, alias: 'mn-sd-30', route: '/district/mn-sd-30', pid: 'lucero_mn', h1: 'Minnesota Senate District 30', where: 'District 30 as Minnesota’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Minnesota Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-31': { seat: 'mn-statesenate-31', composer: false, alias: 'mn-sd-31', route: '/district/mn-sd-31', pid: 'bahr_mn', h1: 'Minnesota Senate District 31', where: 'District 31 as Minnesota’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Minnesota Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-34': { seat: 'mn-statesenate-34', composer: false, alias: 'mn-sd-34', route: '/district/mn-sd-34', pid: 'hoffman_mn', h1: 'Minnesota Senate District 34', where: 'District 34 as Minnesota’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Minnesota Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-36': { seat: 'mn-statesenate-36', composer: false, alias: 'mn-sd-36', route: '/district/mn-sd-36', pid: 'gustafson_mn', h1: 'Minnesota Senate District 36', where: 'District 36 as Minnesota’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Minnesota Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-37': { seat: 'mn-statesenate-37', composer: false, alias: 'mn-sd-37', route: '/district/mn-sd-37', pid: 'limmer_mn', h1: 'Minnesota Senate District 37', where: 'District 37 as Minnesota’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Minnesota Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-38': { seat: 'mn-statesenate-38', composer: false, alias: 'mn-sd-38', route: '/district/mn-sd-38', pid: 'pha_mn', h1: 'Minnesota Senate District 38', where: 'District 38 as Minnesota’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for Minnesota Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-39': { seat: 'mn-statesenate-39', composer: false, alias: 'mn-sd-39', route: '/district/mn-sd-39', pid: 'kunesh_mn', h1: 'Minnesota Senate District 39', where: 'District 39 as Minnesota’s current legislative plan draws it', kick: 'Senate District 39 board', kickTitle: 'The district board for Minnesota Senate District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-40': { seat: 'mn-statesenate-40', composer: false, alias: 'mn-sd-40', route: '/district/mn-sd-40', pid: 'marty_mn', h1: 'Minnesota Senate District 40', where: 'District 40 as Minnesota’s current legislative plan draws it', kick: 'Senate District 40 board', kickTitle: 'The district board for Minnesota Senate District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-42': { seat: 'mn-statesenate-42', composer: false, alias: 'mn-sd-42', route: '/district/mn-sd-42', pid: 'westlin_mn', h1: 'Minnesota Senate District 42', where: 'District 42 as Minnesota’s current legislative plan draws it', kick: 'Senate District 42 board', kickTitle: 'The district board for Minnesota Senate District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-43': { seat: 'mn-statesenate-43', composer: false, alias: 'mn-sd-43', route: '/district/mn-sd-43', pid: 'rest_mn', h1: 'Minnesota Senate District 43', where: 'District 43 as Minnesota’s current legislative plan draws it', kick: 'Senate District 43 board', kickTitle: 'The district board for Minnesota Senate District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-44': { seat: 'mn-statesenate-44', composer: false, alias: 'mn-sd-44', route: '/district/mn-sd-44', pid: 'tou_xiong_mn', h1: 'Minnesota Senate District 44', where: 'District 44 as Minnesota’s current legislative plan draws it', kick: 'Senate District 44 board', kickTitle: 'The district board for Minnesota Senate District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-45': { seat: 'mn-statesenate-45', composer: false, alias: 'mn-sd-45', route: '/district/mn-sd-45', pid: 'johnson_stewart_mn', h1: 'Minnesota Senate District 45', where: 'District 45 as Minnesota’s current legislative plan draws it', kick: 'Senate District 45 board', kickTitle: 'The district board for Minnesota Senate District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-46': { seat: 'mn-statesenate-46', composer: false, alias: 'mn-sd-46', route: '/district/mn-sd-46', pid: 'latz_mn', h1: 'Minnesota Senate District 46', where: 'District 46 as Minnesota’s current legislative plan draws it', kick: 'Senate District 46 board', kickTitle: 'The district board for Minnesota Senate District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-47': { seat: 'mn-statesenate-47', composer: false, alias: 'mn-sd-47', route: '/district/mn-sd-47', pid: 'hemmingsen_jaeger_mn', h1: 'Minnesota Senate District 47', where: 'District 47 as Minnesota’s current legislative plan draws it', kick: 'Senate District 47 board', kickTitle: 'The district board for Minnesota Senate District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-49': { seat: 'mn-statesenate-49', composer: false, alias: 'mn-sd-49', route: '/district/mn-sd-49', pid: 'cwodzinski_mn', h1: 'Minnesota Senate District 49', where: 'District 49 as Minnesota’s current legislative plan draws it', kick: 'Senate District 49 board', kickTitle: 'The district board for Minnesota Senate District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-50': { seat: 'mn-statesenate-50', composer: false, alias: 'mn-sd-50', route: '/district/mn-sd-50', pid: 'mann_mn', h1: 'Minnesota Senate District 50', where: 'District 50 as Minnesota’s current legislative plan draws it', kick: 'Senate District 50 board', kickTitle: 'The district board for Minnesota Senate District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-51': { seat: 'mn-statesenate-51', composer: false, alias: 'mn-sd-51', route: '/district/mn-sd-51', pid: 'wiklund_mn', h1: 'Minnesota Senate District 51', where: 'District 51 as Minnesota’s current legislative plan draws it', kick: 'Senate District 51 board', kickTitle: 'The district board for Minnesota Senate District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-52': { seat: 'mn-statesenate-52', composer: false, alias: 'mn-sd-52', route: '/district/mn-sd-52', pid: 'carlson_mn', h1: 'Minnesota Senate District 52', where: 'District 52 as Minnesota’s current legislative plan draws it', kick: 'Senate District 52 board', kickTitle: 'The district board for Minnesota Senate District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-53': { seat: 'mn-statesenate-53', composer: false, alias: 'mn-sd-53', route: '/district/mn-sd-53', pid: 'klein_mn', h1: 'Minnesota Senate District 53', where: 'District 53 as Minnesota’s current legislative plan draws it', kick: 'Senate District 53 board', kickTitle: 'The district board for Minnesota Senate District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-55': { seat: 'mn-statesenate-55', composer: false, alias: 'mn-sd-55', route: '/district/mn-sd-55', pid: 'port_mn', h1: 'Minnesota Senate District 55', where: 'District 55 as Minnesota’s current legislative plan draws it', kick: 'Senate District 55 board', kickTitle: 'The district board for Minnesota Senate District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-56': { seat: 'mn-statesenate-56', composer: false, alias: 'mn-sd-56', route: '/district/mn-sd-56', pid: 'maye_quade_mn', h1: 'Minnesota Senate District 56', where: 'District 56 as Minnesota’s current legislative plan draws it', kick: 'Senate District 56 board', kickTitle: 'The district board for Minnesota Senate District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-57': { seat: 'mn-statesenate-57', composer: false, alias: 'mn-sd-57', route: '/district/mn-sd-57', pid: 'duckworth_mn', h1: 'Minnesota Senate District 57', where: 'District 57 as Minnesota’s current legislative plan draws it', kick: 'Senate District 57 board', kickTitle: 'The district board for Minnesota Senate District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-58': { seat: 'mn-statesenate-58', composer: false, alias: 'mn-sd-58', route: '/district/mn-sd-58', pid: 'lieske_mn', h1: 'Minnesota Senate District 58', where: 'District 58 as Minnesota’s current legislative plan draws it', kick: 'Senate District 58 board', kickTitle: 'The district board for Minnesota Senate District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-60': { seat: 'mn-statesenate-60', composer: false, alias: 'mn-sd-60', route: '/district/mn-sd-60', pid: 'clark_mn', h1: 'Minnesota Senate District 60', where: 'District 60 as Minnesota’s current legislative plan draws it', kick: 'Senate District 60 board', kickTitle: 'The district board for Minnesota Senate District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-61': { seat: 'mn-statesenate-61', composer: false, alias: 'mn-sd-61', route: '/district/mn-sd-61', pid: 'dibble_mn', h1: 'Minnesota Senate District 61', where: 'District 61 as Minnesota’s current legislative plan draws it', kick: 'Senate District 61 board', kickTitle: 'The district board for Minnesota Senate District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-62': { seat: 'mn-statesenate-62', composer: false, alias: 'mn-sd-62', route: '/district/mn-sd-62', pid: 'fateh_mn', h1: 'Minnesota Senate District 62', where: 'District 62 as Minnesota’s current legislative plan draws it', kick: 'Senate District 62 board', kickTitle: 'The district board for Minnesota Senate District 62: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-63': { seat: 'mn-statesenate-63', composer: false, alias: 'mn-sd-63', route: '/district/mn-sd-63', pid: 'mohamed_mn', h1: 'Minnesota Senate District 63', where: 'District 63 as Minnesota’s current legislative plan draws it', kick: 'Senate District 63 board', kickTitle: 'The district board for Minnesota Senate District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-65': { seat: 'mn-statesenate-65', composer: false, alias: 'mn-sd-65', route: '/district/mn-sd-65', pid: 'pappas_mn', h1: 'Minnesota Senate District 65', where: 'District 65 as Minnesota’s current legislative plan draws it', kick: 'Senate District 65 board', kickTitle: 'The district board for Minnesota Senate District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-66': { seat: 'mn-statesenate-66', composer: false, alias: 'mn-sd-66', route: '/district/mn-sd-66', pid: 'oumou_verbeten_mn', h1: 'Minnesota Senate District 66', where: 'District 66 as Minnesota’s current legislative plan draws it', kick: 'Senate District 66 board', kickTitle: 'The district board for Minnesota Senate District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-67': { seat: 'mn-statesenate-67', composer: false, alias: 'mn-sd-67', route: '/district/mn-sd-67', pid: 'hawj_mn', h1: 'Minnesota Senate District 67', where: 'District 67 as Minnesota’s current legislative plan draws it', kick: 'Senate District 67 board', kickTitle: 'The district board for Minnesota Senate District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'mn-statesenate-54': { seat: 'mn-statesenate-54', composer: false, alias: 'mn-sd-54', route: '/district/mn-sd-54', pid: 'eric_pratt', h1: 'Minnesota Senate District 54', where: 'District 54 as Minnesota’s current legislative plan draws it', kick: 'Senate District 54 board', kickTitle: 'The district board for Minnesota Senate District 54: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-1': { seat: 'mt-statehouse-1', composer: false, alias: 'mt-hd-1', route: '/district/mt-hd-1', pid: 'duram_mt', h1: 'Montana House District 1', where: 'District 1 as Montana’s current legislative plan draws it', kick: 'House District 1 board', kickTitle: 'The district board for Montana House District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-10': { seat: 'mt-statehouse-10', composer: false, alias: 'mt-hd-10', route: '/district/mt-hd-10', pid: 'falk_mt', h1: 'Montana House District 10', where: 'District 10 as Montana’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Montana House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-100': { seat: 'mt-statehouse-100', composer: false, alias: 'mt-hd-100', route: '/district/mt-hd-100', pid: 'howell_mt', h1: 'Montana House District 100', where: 'District 100 as Montana’s current legislative plan draws it', kick: 'House District 100 board', kickTitle: 'The district board for Montana House District 100: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-11': { seat: 'mt-statehouse-11', composer: false, alias: 'mt-hd-11', route: '/district/mt-hd-11', pid: 'byrne_mt', h1: 'Montana House District 11', where: 'District 11 as Montana’s current legislative plan draws it', kick: 'House District 11 board', kickTitle: 'The district board for Montana House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-12': { seat: 'mt-statehouse-12', composer: false, alias: 'mt-hd-12', route: '/district/mt-hd-12', pid: 'sharp_mt', h1: 'Montana House District 12', where: 'District 12 as Montana’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Montana House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-13': { seat: 'mt-statehouse-13', composer: false, alias: 'mt-hd-13', route: '/district/mt-hd-13', pid: 'reksten_mt', h1: 'Montana House District 13', where: 'District 13 as Montana’s current legislative plan draws it', kick: 'House District 13 board', kickTitle: 'The district board for Montana House District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-14': { seat: 'mt-statehouse-14', composer: false, alias: 'mt-hd-14', route: '/district/mt-hd-14', pid: 'fielder_mt', h1: 'Montana House District 14', where: 'District 14 as Montana’s current legislative plan draws it', kick: 'House District 14 board', kickTitle: 'The district board for Montana House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-15': { seat: 'mt-statehouse-15', composer: false, alias: 'mt-hd-15', route: '/district/mt-hd-15', pid: 'crowe_mt', h1: 'Montana House District 15', where: 'District 15 as Montana’s current legislative plan draws it', kick: 'House District 15 board', kickTitle: 'The district board for Montana House District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-16': { seat: 'mt-statehouse-16', composer: false, alias: 'mt-hd-16', route: '/district/mt-hd-16', pid: 'running_wolf_mt', h1: 'Montana House District 16', where: 'District 16 as Montana’s current legislative plan draws it', kick: 'House District 16 board', kickTitle: 'The district board for Montana House District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-17': { seat: 'mt-statehouse-17', composer: false, alias: 'mt-hd-17', route: '/district/mt-hd-17', pid: 'wirth_mt', h1: 'Montana House District 17', where: 'District 17 as Montana’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Montana House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-18': { seat: 'mt-statehouse-18', composer: false, alias: 'mt-hd-18', route: '/district/mt-hd-18', pid: 'jones_mt', h1: 'Montana House District 18', where: 'District 18 as Montana’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Montana House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-19': { seat: 'mt-statehouse-19', composer: false, alias: 'mt-hd-19', route: '/district/mt-hd-19', pid: 'weber_mt', h1: 'Montana House District 19', where: 'District 19 as Montana’s current legislative plan draws it', kick: 'House District 19 board', kickTitle: 'The district board for Montana House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-2': { seat: 'mt-statehouse-2', composer: false, alias: 'mt-hd-2', route: '/district/mt-hd-2', pid: 'millett_mt', h1: 'Montana House District 2', where: 'District 2 as Montana’s current legislative plan draws it', kick: 'House District 2 board', kickTitle: 'The district board for Montana House District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-20': { seat: 'mt-statehouse-20', composer: false, alias: 'mt-hd-20', route: '/district/mt-hd-20', pid: 'nikolakakos_mt', h1: 'Montana House District 20', where: 'District 20 as Montana’s current legislative plan draws it', kick: 'House District 20 board', kickTitle: 'The district board for Montana House District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-21': { seat: 'mt-statehouse-21', composer: false, alias: 'mt-hd-21', route: '/district/mt-hd-21', pid: 'buttrey_mt', h1: 'Montana House District 21', where: 'District 21 as Montana’s current legislative plan draws it', kick: 'House District 21 board', kickTitle: 'The district board for Montana House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-22': { seat: 'mt-statehouse-22', composer: false, alias: 'mt-hd-22', route: '/district/mt-hd-22', pid: 'george_nikolakakos_mt', h1: 'Montana House District 22', where: 'District 22 as Montana’s current legislative plan draws it', kick: 'House District 22 board', kickTitle: 'The district board for Montana House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-23': { seat: 'mt-statehouse-23', composer: false, alias: 'mt-hd-23', route: '/district/mt-hd-23', pid: 'tilleman_mt', h1: 'Montana House District 23', where: 'District 23 as Montana’s current legislative plan draws it', kick: 'House District 23 board', kickTitle: 'The district board for Montana House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-24': { seat: 'mt-statehouse-24', composer: false, alias: 'mt-hd-24', route: '/district/mt-hd-24', pid: 'fitzpatrick_mt', h1: 'Montana House District 24', where: 'District 24 as Montana’s current legislative plan draws it', kick: 'House District 24 board', kickTitle: 'The district board for Montana House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-25': { seat: 'mt-statehouse-25', composer: false, alias: 'mt-hd-25', route: '/district/mt-hd-25', pid: 'gist_mt', h1: 'Montana House District 25', where: 'District 25 as Montana’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for Montana House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-26': { seat: 'mt-statehouse-26', composer: false, alias: 'mt-hd-26', route: '/district/mt-hd-26', pid: 'miner_mt', h1: 'Montana House District 26', where: 'District 26 as Montana’s current legislative plan draws it', kick: 'House District 26 board', kickTitle: 'The district board for Montana House District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-27': { seat: 'mt-statehouse-27', composer: false, alias: 'mt-hd-27', route: '/district/mt-hd-27', pid: 'tuss_mt', h1: 'Montana House District 27', where: 'District 27 as Montana’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Montana House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-28': { seat: 'mt-statehouse-28', composer: false, alias: 'mt-hd-28', route: '/district/mt-hd-28', pid: 'albus_mt', h1: 'Montana House District 28', where: 'District 28 as Montana’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Montana House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-29': { seat: 'mt-statehouse-29', composer: false, alias: 'mt-hd-29', route: '/district/mt-hd-29', pid: 'moore_mt', h1: 'Montana House District 29', where: 'District 29 as Montana’s current legislative plan draws it', kick: 'House District 29 board', kickTitle: 'The district board for Montana House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-3': { seat: 'mt-statehouse-3', composer: false, alias: 'mt-hd-3', route: '/district/mt-hd-3', pid: 'powers_mt', h1: 'Montana House District 3', where: 'District 3 as Montana’s current legislative plan draws it', kick: 'House District 3 board', kickTitle: 'The district board for Montana House District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-30': { seat: 'mt-statehouse-30', composer: false, alias: 'mt-hd-30', route: '/district/mt-hd-30', pid: 'thiel_mt', h1: 'Montana House District 30', where: 'District 30 as Montana’s current legislative plan draws it', kick: 'House District 30 board', kickTitle: 'The district board for Montana House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-31': { seat: 'mt-statehouse-31', composer: false, alias: 'mt-hd-31', route: '/district/mt-hd-31', pid: 'smith_mt', h1: 'Montana House District 31', where: 'District 31 as Montana’s current legislative plan draws it', kick: 'House District 31 board', kickTitle: 'The district board for Montana House District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-32': { seat: 'mt-statehouse-32', composer: false, alias: 'mt-hd-32', route: '/district/mt-hd-32', pid: 'fox_mt', h1: 'Montana House District 32', where: 'District 32 as Montana’s current legislative plan draws it', kick: 'House District 32 board', kickTitle: 'The district board for Montana House District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-33': { seat: 'mt-statehouse-33', composer: false, alias: 'mt-hd-33', route: '/district/mt-hd-33', pid: 'ler_mt', h1: 'Montana House District 33', where: 'District 33 as Montana’s current legislative plan draws it', kick: 'House District 33 board', kickTitle: 'The district board for Montana House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-34': { seat: 'mt-statehouse-34', composer: false, alias: 'mt-hd-34', route: '/district/mt-hd-34', pid: 'schillinger_mt', h1: 'Montana House District 34', where: 'District 34 as Montana’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Montana House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-35': { seat: 'mt-statehouse-35', composer: false, alias: 'mt-hd-35', route: '/district/mt-hd-35', pid: 'parry_mt', h1: 'Montana House District 35', where: 'District 35 as Montana’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Montana House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-36': { seat: 'mt-statehouse-36', composer: false, alias: 'mt-hd-36', route: '/district/mt-hd-36', pid: 'kmetz_mt', h1: 'Montana House District 36', where: 'District 36 as Montana’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Montana House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-37': { seat: 'mt-statehouse-37', composer: false, alias: 'mt-hd-37', route: '/district/mt-hd-37', pid: 'klakken_mt', h1: 'Montana House District 37', where: 'District 37 as Montana’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Montana House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-38': { seat: 'mt-statehouse-38', composer: false, alias: 'mt-hd-38', route: '/district/mt-hd-38', pid: 'oblander_mt', h1: 'Montana House District 38', where: 'District 38 as Montana’s current legislative plan draws it', kick: 'House District 38 board', kickTitle: 'The district board for Montana House District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-39': { seat: 'mt-statehouse-39', composer: false, alias: 'mt-hd-39', route: '/district/mt-hd-39', pid: 'seekins_crowe_mt', h1: 'Montana House District 39', where: 'District 39 as Montana’s current legislative plan draws it', kick: 'House District 39 board', kickTitle: 'The district board for Montana House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-4': { seat: 'mt-statehouse-4', composer: false, alias: 'mt-hd-4', route: '/district/mt-hd-4', pid: 'bennett_mt', h1: 'Montana House District 4', where: 'District 4 as Montana’s current legislative plan draws it', kick: 'House District 4 board', kickTitle: 'The district board for Montana House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-40': { seat: 'mt-statehouse-40', composer: false, alias: 'mt-hd-40', route: '/district/mt-hd-40', pid: 'vinton_mt', h1: 'Montana House District 40', where: 'District 40 as Montana’s current legislative plan draws it', kick: 'House District 40 board', kickTitle: 'The district board for Montana House District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-41': { seat: 'mt-statehouse-41', composer: false, alias: 'mt-hd-41', route: '/district/mt-hd-41', pid: 'sooktis_mt', h1: 'Montana House District 41', where: 'District 41 as Montana’s current legislative plan draws it', kick: 'House District 41 board', kickTitle: 'The district board for Montana House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-42': { seat: 'mt-statehouse-42', composer: false, alias: 'mt-hd-42', route: '/district/mt-hd-42', pid: 'chip_fitzpatrick_mt', h1: 'Montana House District 42', where: 'District 42 as Montana’s current legislative plan draws it', kick: 'House District 42 board', kickTitle: 'The district board for Montana House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-43': { seat: 'mt-statehouse-43', composer: false, alias: 'mt-hd-43', route: '/district/mt-hd-43', pid: 'brewster_mt', h1: 'Montana House District 43', where: 'District 43 as Montana’s current legislative plan draws it', kick: 'House District 43 board', kickTitle: 'The district board for Montana House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-44': { seat: 'mt-statehouse-44', composer: false, alias: 'mt-hd-44', route: '/district/mt-hd-44', pid: 'zolnikov_mt', h1: 'Montana House District 44', where: 'District 44 as Montana’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Montana House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-45': { seat: 'mt-statehouse-45', composer: false, alias: 'mt-hd-45', route: '/district/mt-hd-45', pid: 'baum_mt', h1: 'Montana House District 45', where: 'District 45 as Montana’s current legislative plan draws it', kick: 'House District 45 board', kickTitle: 'The district board for Montana House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-46': { seat: 'mt-statehouse-46', composer: false, alias: 'mt-hd-46', route: '/district/mt-hd-46', pid: 'joy_mt', h1: 'Montana House District 46', where: 'District 46 as Montana’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Montana House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-47': { seat: 'mt-statehouse-47', composer: false, alias: 'mt-hd-47', route: '/district/mt-hd-47', pid: 'reavis_mt', h1: 'Montana House District 47', where: 'District 47 as Montana’s current legislative plan draws it', kick: 'House District 47 board', kickTitle: 'The district board for Montana House District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-48': { seat: 'mt-statehouse-48', composer: false, alias: 'mt-hd-48', route: '/district/mt-hd-48', pid: 'schomer_mt', h1: 'Montana House District 48', where: 'District 48 as Montana’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Montana House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-49': { seat: 'mt-statehouse-49', composer: false, alias: 'mt-hd-49', route: '/district/mt-hd-49', pid: 'essmann_mt', h1: 'Montana House District 49', where: 'District 49 as Montana’s current legislative plan draws it', kick: 'House District 49 board', kickTitle: 'The district board for Montana House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-5': { seat: 'mt-statehouse-5', composer: false, alias: 'mt-hd-5', route: '/district/mt-hd-5', pid: 'mitchell_mt', h1: 'Montana House District 5', where: 'District 5 as Montana’s current legislative plan draws it', kick: 'House District 5 board', kickTitle: 'The district board for Montana House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-50': { seat: 'mt-statehouse-50', composer: false, alias: 'mt-hd-50', route: '/district/mt-hd-50', pid: 'nicastro_mt', h1: 'Montana House District 50', where: 'District 50 as Montana’s current legislative plan draws it', kick: 'House District 50 board', kickTitle: 'The district board for Montana House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-51': { seat: 'mt-statehouse-51', composer: false, alias: 'mt-hd-51', route: '/district/mt-hd-51', pid: 'etchart_mt', h1: 'Montana House District 51', where: 'District 51 as Montana’s current legislative plan draws it', kick: 'House District 51 board', kickTitle: 'The district board for Montana House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-52': { seat: 'mt-statehouse-52', composer: false, alias: 'mt-hd-52', route: '/district/mt-hd-52', pid: 'zinn_mt', h1: 'Montana House District 52', where: 'District 52 as Montana’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Montana House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-53': { seat: 'mt-statehouse-53', composer: false, alias: 'mt-hd-53', route: '/district/mt-hd-53', pid: 'nicol_mt', h1: 'Montana House District 53', where: 'District 53 as Montana’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Montana House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-54': { seat: 'mt-statehouse-54', composer: false, alias: 'mt-hd-54', route: '/district/mt-hd-54', pid: 'deming_mt', h1: 'Montana House District 54', where: 'District 54 as Montana’s current legislative plan draws it', kick: 'House District 54 board', kickTitle: 'The district board for Montana House District 54: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-55': { seat: 'mt-statehouse-55', composer: false, alias: 'mt-hd-55', route: '/district/mt-hd-55', pid: 'barker_mt', h1: 'Montana House District 55', where: 'District 55 as Montana’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Montana House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-56': { seat: 'mt-statehouse-56', composer: false, alias: 'mt-hd-56', route: '/district/mt-hd-56', pid: 'nave_mt', h1: 'Montana House District 56', where: 'District 56 as Montana’s current legislative plan draws it', kick: 'House District 56 board', kickTitle: 'The district board for Montana House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-57': { seat: 'mt-statehouse-57', composer: false, alias: 'mt-hd-57', route: '/district/mt-hd-57', pid: 'rosenzweig_mt', h1: 'Montana House District 57', where: 'District 57 as Montana’s current legislative plan draws it', kick: 'House District 57 board', kickTitle: 'The district board for Montana House District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-58': { seat: 'mt-statehouse-58', composer: false, alias: 'mt-hd-58', route: '/district/mt-hd-58', pid: 'isaly_mt', h1: 'Montana House District 58', where: 'District 58 as Montana’s current legislative plan draws it', kick: 'House District 58 board', kickTitle: 'The district board for Montana House District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-59': { seat: 'mt-statehouse-59', composer: false, alias: 'mt-hd-59', route: '/district/mt-hd-59', pid: 'fire_thunder_mt', h1: 'Montana House District 59', where: 'District 59 as Montana’s current legislative plan draws it', kick: 'House District 59 board', kickTitle: 'The district board for Montana House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-6': { seat: 'mt-statehouse-6', composer: false, alias: 'mt-hd-6', route: '/district/mt-hd-6', pid: 'regier_mt', h1: 'Montana House District 6', where: 'District 6 as Montana’s current legislative plan draws it', kick: 'House District 6 board', kickTitle: 'The district board for Montana House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-60': { seat: 'mt-statehouse-60', composer: false, alias: 'mt-hd-60', route: '/district/mt-hd-60', pid: 'griffith_mt', h1: 'Montana House District 60', where: 'District 60 as Montana’s current legislative plan draws it', kick: 'House District 60 board', kickTitle: 'The district board for Montana House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-61': { seat: 'mt-statehouse-61', composer: false, alias: 'mt-hd-61', route: '/district/mt-hd-61', pid: 'edwards_mt', h1: 'Montana House District 61', where: 'District 61 as Montana’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Montana House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-62': { seat: 'mt-statehouse-62', composer: false, alias: 'mt-hd-62', route: '/district/mt-hd-62', pid: 'seckinger_mt', h1: 'Montana House District 62', where: 'District 62 as Montana’s current legislative plan draws it', kick: 'House District 62 board', kickTitle: 'The district board for Montana House District 62: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-63': { seat: 'mt-statehouse-63', composer: false, alias: 'mt-hd-63', route: '/district/mt-hd-63', pid: 'strand_mt', h1: 'Montana House District 63', where: 'District 63 as Montana’s current legislative plan draws it', kick: 'House District 63 board', kickTitle: 'The district board for Montana House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-64': { seat: 'mt-statehouse-64', composer: false, alias: 'mt-hd-64', route: '/district/mt-hd-64', pid: 'kortum_mt', h1: 'Montana House District 64', where: 'District 64 as Montana’s current legislative plan draws it', kick: 'House District 64 board', kickTitle: 'The district board for Montana House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-65': { seat: 'mt-statehouse-65', composer: false, alias: 'mt-hd-65', route: '/district/mt-hd-65', pid: 'close_mt', h1: 'Montana House District 65', where: 'District 65 as Montana’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Montana House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-66': { seat: 'mt-statehouse-66', composer: false, alias: 'mt-hd-66', route: '/district/mt-hd-66', pid: 'matthews_mt', h1: 'Montana House District 66', where: 'District 66 as Montana’s current legislative plan draws it', kick: 'House District 66 board', kickTitle: 'The district board for Montana House District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-67': { seat: 'mt-statehouse-67', composer: false, alias: 'mt-hd-67', route: '/district/mt-hd-67', pid: 'hinkle_mt', h1: 'Montana House District 67', where: 'District 67 as Montana’s current legislative plan draws it', kick: 'House District 67 board', kickTitle: 'The district board for Montana House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-68': { seat: 'mt-statehouse-68', composer: false, alias: 'mt-hd-68', route: '/district/mt-hd-68', pid: 'caleb_hinkle_mt', h1: 'Montana House District 68', where: 'District 68 as Montana’s current legislative plan draws it', kick: 'House District 68 board', kickTitle: 'The district board for Montana House District 68: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-69': { seat: 'mt-statehouse-69', composer: false, alias: 'mt-hd-69', route: '/district/mt-hd-69', pid: 'walsh_mt', h1: 'Montana House District 69', where: 'District 69 as Montana’s current legislative plan draws it', kick: 'House District 69 board', kickTitle: 'The district board for Montana House District 69: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-7': { seat: 'mt-statehouse-7', composer: false, alias: 'mt-hd-7', route: '/district/mt-hd-7', pid: 'sprunger_mt', h1: 'Montana House District 7', where: 'District 7 as Montana’s current legislative plan draws it', kick: 'House District 7 board', kickTitle: 'The district board for Montana House District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-70': { seat: 'mt-statehouse-70', composer: false, alias: 'mt-hd-70', route: '/district/mt-hd-70', pid: 'maness_mt', h1: 'Montana House District 70', where: 'District 70 as Montana’s current legislative plan draws it', kick: 'House District 70 board', kickTitle: 'The district board for Montana House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-71': { seat: 'mt-statehouse-71', composer: false, alias: 'mt-hd-71', route: '/district/mt-hd-71', pid: 'demarois_mt', h1: 'Montana House District 71', where: 'District 71 as Montana’s current legislative plan draws it', kick: 'House District 71 board', kickTitle: 'The district board for Montana House District 71: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-72': { seat: 'mt-statehouse-72', composer: false, alias: 'mt-hd-72', route: '/district/mt-hd-72', pid: 'hawk_mt', h1: 'Montana House District 72', where: 'District 72 as Montana’s current legislative plan draws it', kick: 'House District 72 board', kickTitle: 'The district board for Montana House District 72: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-73': { seat: 'mt-statehouse-73', composer: false, alias: 'mt-hd-73', route: '/district/mt-hd-73', pid: 'lynch_mt', h1: 'Montana House District 73', where: 'District 73 as Montana’s current legislative plan draws it', kick: 'House District 73 board', kickTitle: 'The district board for Montana House District 73: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-74': { seat: 'mt-statehouse-74', composer: false, alias: 'mt-hd-74', route: '/district/mt-hd-74', pid: 'lee_mt', h1: 'Montana House District 74', where: 'District 74 as Montana’s current legislative plan draws it', kick: 'House District 74 board', kickTitle: 'The district board for Montana House District 74: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-75': { seat: 'mt-statehouse-75', composer: false, alias: 'mt-hd-75', route: '/district/mt-hd-75', pid: 'reinschmidt_mt', h1: 'Montana House District 75', where: 'District 75 as Montana’s current legislative plan draws it', kick: 'House District 75 board', kickTitle: 'The district board for Montana House District 75: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-76': { seat: 'mt-statehouse-76', composer: false, alias: 'mt-hd-76', route: '/district/mt-hd-76', pid: 'john_fitzpatrick_mt', h1: 'Montana House District 76', where: 'District 76 as Montana’s current legislative plan draws it', kick: 'House District 76 board', kickTitle: 'The district board for Montana House District 76: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-77': { seat: 'mt-statehouse-77', composer: false, alias: 'mt-hd-77', route: '/district/mt-hd-77', pid: 'gillette_mt', h1: 'Montana House District 77', where: 'District 77 as Montana’s current legislative plan draws it', kick: 'House District 77 board', kickTitle: 'The district board for Montana House District 77: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-78': { seat: 'mt-statehouse-78', composer: false, alias: 'mt-hd-78', route: '/district/mt-hd-78', pid: 'gregg_mt', h1: 'Montana House District 78', where: 'District 78 as Montana’s current legislative plan draws it', kick: 'House District 78 board', kickTitle: 'The district board for Montana House District 78: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-79': { seat: 'mt-statehouse-79', composer: false, alias: 'mt-hd-79', route: '/district/mt-hd-79', pid: 'muszkiewicz_mt', h1: 'Montana House District 79', where: 'District 79 as Montana’s current legislative plan draws it', kick: 'House District 79 board', kickTitle: 'The district board for Montana House District 79: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-8': { seat: 'mt-statehouse-8', composer: false, alias: 'mt-hd-8', route: '/district/mt-hd-8', pid: 'schubert_mt', h1: 'Montana House District 8', where: 'District 8 as Montana’s current legislative plan draws it', kick: 'House District 8 board', kickTitle: 'The district board for Montana House District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-80': { seat: 'mt-statehouse-80', composer: false, alias: 'mt-hd-80', route: '/district/mt-hd-80', pid: 'romano_mt', h1: 'Montana House District 80', where: 'District 80 as Montana’s current legislative plan draws it', kick: 'House District 80 board', kickTitle: 'The district board for Montana House District 80: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-81': { seat: 'mt-statehouse-81', composer: false, alias: 'mt-hd-81', route: '/district/mt-hd-81', pid: 'caferro_mt', h1: 'Montana House District 81', where: 'District 81 as Montana’s current legislative plan draws it', kick: 'House District 81 board', kickTitle: 'The district board for Montana House District 81: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-82': { seat: 'mt-statehouse-82', composer: false, alias: 'mt-hd-82', route: '/district/mt-hd-82', pid: 'elverum_mt', h1: 'Montana House District 82', where: 'District 82 as Montana’s current legislative plan draws it', kick: 'House District 82 board', kickTitle: 'The district board for Montana House District 82: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-83': { seat: 'mt-statehouse-83', composer: false, alias: 'mt-hd-83', route: '/district/mt-hd-83', pid: 'cohenour_mt', h1: 'Montana House District 83', where: 'District 83 as Montana’s current legislative plan draws it', kick: 'House District 83 board', kickTitle: 'The district board for Montana House District 83: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-84': { seat: 'mt-statehouse-84', composer: false, alias: 'mt-hd-84', route: '/district/mt-hd-84', pid: 'darling_mt', h1: 'Montana House District 84', where: 'District 84 as Montana’s current legislative plan draws it', kick: 'House District 84 board', kickTitle: 'The district board for Montana House District 84: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-85': { seat: 'mt-statehouse-85', composer: false, alias: 'mt-hd-85', route: '/district/mt-hd-85', pid: 'love_mt', h1: 'Montana House District 85', where: 'District 85 as Montana’s current legislative plan draws it', kick: 'House District 85 board', kickTitle: 'The district board for Montana House District 85: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-86': { seat: 'mt-statehouse-86', composer: false, alias: 'mt-hd-86', route: '/district/mt-hd-86', pid: 'bedey_mt', h1: 'Montana House District 86', where: 'District 86 as Montana’s current legislative plan draws it', kick: 'House District 86 board', kickTitle: 'The district board for Montana House District 86: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-87': { seat: 'mt-statehouse-87', composer: false, alias: 'mt-hd-87', route: '/district/mt-hd-87', pid: 'nelson_mt', h1: 'Montana House District 87', where: 'District 87 as Montana’s current legislative plan draws it', kick: 'House District 87 board', kickTitle: 'The district board for Montana House District 87: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-88': { seat: 'mt-statehouse-88', composer: false, alias: 'mt-hd-88', route: '/district/mt-hd-88', pid: 'overstreet_mt', h1: 'Montana House District 88', where: 'District 88 as Montana’s current legislative plan draws it', kick: 'House District 88 board', kickTitle: 'The district board for Montana House District 88: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-89': { seat: 'mt-statehouse-89', composer: false, alias: 'mt-hd-89', route: '/district/mt-hd-89', pid: 'thane_mt', h1: 'Montana House District 89', where: 'District 89 as Montana’s current legislative plan draws it', kick: 'House District 89 board', kickTitle: 'The district board for Montana House District 89: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-9': { seat: 'mt-statehouse-9', composer: false, alias: 'mt-hd-9', route: '/district/mt-hd-9', pid: 'kelly_mt', h1: 'Montana House District 9', where: 'District 9 as Montana’s current legislative plan draws it', kick: 'House District 9 board', kickTitle: 'The district board for Montana House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-90': { seat: 'mt-statehouse-90', composer: false, alias: 'mt-hd-90', route: '/district/mt-hd-90', pid: 'cochran_mt', h1: 'Montana House District 90', where: 'District 90 as Montana’s current legislative plan draws it', kick: 'House District 90 board', kickTitle: 'The district board for Montana House District 90: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-91': { seat: 'mt-statehouse-91', composer: false, alias: 'mt-hd-91', route: '/district/mt-hd-91', pid: 'fyant_mt', h1: 'Montana House District 91', where: 'District 91 as Montana’s current legislative plan draws it', kick: 'House District 91 board', kickTitle: 'The district board for Montana House District 91: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-92': { seat: 'mt-statehouse-92', composer: false, alias: 'mt-hd-92', route: '/district/mt-hd-92', pid: 'keogh_mt', h1: 'Montana House District 92', where: 'District 92 as Montana’s current legislative plan draws it', kick: 'House District 92 board', kickTitle: 'The district board for Montana House District 92: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-93': { seat: 'mt-statehouse-93', composer: false, alias: 'mt-hd-93', route: '/district/mt-hd-93', pid: 'sullivan_mt', h1: 'Montana House District 93', where: 'District 93 as Montana’s current legislative plan draws it', kick: 'House District 93 board', kickTitle: 'The district board for Montana House District 93: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-94': { seat: 'mt-statehouse-94', composer: false, alias: 'mt-hd-94', route: '/district/mt-hd-94', pid: 'marler_mt', h1: 'Montana House District 94', where: 'District 94 as Montana’s current legislative plan draws it', kick: 'House District 94 board', kickTitle: 'The district board for Montana House District 94: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-95': { seat: 'mt-statehouse-95', composer: false, alias: 'mt-hd-95', route: '/district/mt-hd-95', pid: 'zephyr_mt', h1: 'Montana House District 95', where: 'District 95 as Montana’s current legislative plan draws it', kick: 'House District 95 board', kickTitle: 'The district board for Montana House District 95: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-96': { seat: 'mt-statehouse-96', composer: false, alias: 'mt-hd-96', route: '/district/mt-hd-96', pid: 'carter_mt', h1: 'Montana House District 96', where: 'District 96 as Montana’s current legislative plan draws it', kick: 'House District 96 board', kickTitle: 'The district board for Montana House District 96: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-97': { seat: 'mt-statehouse-97', composer: false, alias: 'mt-hd-97', route: '/district/mt-hd-97', pid: 'cunningham_mt', h1: 'Montana House District 97', where: 'District 97 as Montana’s current legislative plan draws it', kick: 'House District 97 board', kickTitle: 'The district board for Montana House District 97: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-98': { seat: 'mt-statehouse-98', composer: false, alias: 'mt-hd-98', route: '/district/mt-hd-98', pid: 'karlen_mt', h1: 'Montana House District 98', where: 'District 98 as Montana’s current legislative plan draws it', kick: 'House District 98 board', kickTitle: 'The district board for Montana House District 98: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statehouse-99': { seat: 'mt-statehouse-99', composer: false, alias: 'mt-hd-99', route: '/district/mt-hd-99', pid: 'france_mt', h1: 'Montana House District 99', where: 'District 99 as Montana’s current legislative plan draws it', kick: 'House District 99 board', kickTitle: 'The district board for Montana House District 99: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-1': { seat: 'mt-statesenate-1', composer: false, alias: 'mt-sd-1', route: '/district/mt-sd-1', pid: 'cuffe_mt', h1: 'Montana Senate District 1', where: 'District 1 as Montana’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Montana Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-10': { seat: 'mt-statesenate-10', composer: false, alias: 'mt-sd-10', route: '/district/mt-sd-10', pid: 'trebas_mt', h1: 'Montana Senate District 10', where: 'District 10 as Montana’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Montana Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-11': { seat: 'mt-statesenate-11', composer: false, alias: 'mt-sd-11', route: '/district/mt-sd-11', pid: 'emrich_mt', h1: 'Montana Senate District 11', where: 'District 11 as Montana’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Montana Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-12': { seat: 'mt-statesenate-12', composer: false, alias: 'mt-sd-12', route: '/district/mt-sd-12', pid: 'mckamey_mt', h1: 'Montana Senate District 12', where: 'District 12 as Montana’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Montana Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-13': { seat: 'mt-statesenate-13', composer: false, alias: 'mt-sd-13', route: '/district/mt-sd-13', pid: 'kassmier_mt', h1: 'Montana Senate District 13', where: 'District 13 as Montana’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Montana Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-14': { seat: 'mt-statesenate-14', composer: false, alias: 'mt-sd-14', route: '/district/mt-sd-14', pid: 'tempel_mt', h1: 'Montana Senate District 14', where: 'District 14 as Montana’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Montana Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-15': { seat: 'mt-statesenate-15', composer: false, alias: 'mt-sd-15', route: '/district/mt-sd-15', pid: 'hunter_mt', h1: 'Montana Senate District 15', where: 'District 15 as Montana’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Montana Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-16': { seat: 'mt-statesenate-16', composer: false, alias: 'mt-sd-16', route: '/district/mt-sd-16', pid: 'windy_boy_mt', h1: 'Montana Senate District 16', where: 'District 16 as Montana’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Montana Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-17': { seat: 'mt-statesenate-17', composer: false, alias: 'mt-sd-17', route: '/district/mt-sd-17', pid: 'phalen_mt', h1: 'Montana Senate District 17', where: 'District 17 as Montana’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Montana Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-18': { seat: 'mt-statesenate-18', composer: false, alias: 'mt-sd-18', route: '/district/mt-sd-18', pid: 'bogner_mt', h1: 'Montana Senate District 18', where: 'District 18 as Montana’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Montana Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-19': { seat: 'mt-statesenate-19', composer: false, alias: 'mt-sd-19', route: '/district/mt-sd-19', pid: 'usher_mt', h1: 'Montana Senate District 19', where: 'District 19 as Montana’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Montana Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-2': { seat: 'mt-statesenate-2', composer: false, alias: 'mt-sd-2', route: '/district/mt-sd-2', pid: 'fern_mt', h1: 'Montana Senate District 2', where: 'District 2 as Montana’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Montana Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-20': { seat: 'mt-statesenate-20', composer: false, alias: 'mt-sd-20', route: '/district/mt-sd-20', pid: 'sue_vinton_mt', h1: 'Montana Senate District 20', where: 'District 20 as Montana’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Montana Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-21': { seat: 'mt-statesenate-21', composer: false, alias: 'mt-sd-21', route: '/district/mt-sd-21', pid: 'lammers_mt', h1: 'Montana Senate District 21', where: 'District 21 as Montana’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Montana Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-22': { seat: 'mt-statesenate-22', composer: false, alias: 'mt-sd-22', route: '/district/mt-sd-22', pid: 'daniel_zolnikov_mt', h1: 'Montana Senate District 22', where: 'District 22 as Montana’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Montana Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-23': { seat: 'mt-statesenate-23', composer: false, alias: 'mt-sd-23', route: '/district/mt-sd-23', pid: 'kerr_carpenter_mt', h1: 'Montana Senate District 23', where: 'District 23 as Montana’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Montana Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-24': { seat: 'mt-statesenate-24', composer: false, alias: 'mt-sd-24', route: '/district/mt-sd-24', pid: 'yakawich_mt', h1: 'Montana Senate District 24', where: 'District 24 as Montana’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Montana Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-25': { seat: 'mt-statesenate-25', composer: false, alias: 'mt-sd-25', route: '/district/mt-sd-25', pid: 'lenz_mt', h1: 'Montana Senate District 25', where: 'District 25 as Montana’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Montana Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-26': { seat: 'mt-statesenate-26', composer: false, alias: 'mt-sd-26', route: '/district/mt-sd-26', pid: 'mcgillvray_mt', h1: 'Montana Senate District 26', where: 'District 26 as Montana’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Montana Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-27': { seat: 'mt-statesenate-27', composer: false, alias: 'mt-sd-27', route: '/district/mt-sd-27', pid: 'ricci_mt', h1: 'Montana Senate District 27', where: 'District 27 as Montana’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Montana Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-28': { seat: 'mt-statesenate-28', composer: false, alias: 'mt-sd-28', route: '/district/mt-sd-28', pid: 'mandeville_mt', h1: 'Montana Senate District 28', where: 'District 28 as Montana’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Montana Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-29': { seat: 'mt-statesenate-29', composer: false, alias: 'mt-sd-29', route: '/district/mt-sd-29', pid: 'esp_mt', h1: 'Montana Senate District 29', where: 'District 29 as Montana’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Montana Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-3': { seat: 'mt-statesenate-3', composer: false, alias: 'mt-sd-3', route: '/district/mt-sd-3', pid: 'glimm_mt', h1: 'Montana Senate District 3', where: 'District 3 as Montana’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Montana Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-30': { seat: 'mt-statesenate-30', composer: false, alias: 'mt-sd-30', route: '/district/mt-sd-30', pid: 'neumann_mt', h1: 'Montana Senate District 30', where: 'District 30 as Montana’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Montana Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-31': { seat: 'mt-statesenate-31', composer: false, alias: 'mt-sd-31', route: '/district/mt-sd-31', pid: 'pat_flowers', h1: 'Montana Senate District 31', where: 'District 31 as Montana’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Montana Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-32': { seat: 'mt-statesenate-32', composer: false, alias: 'mt-sd-32', route: '/district/mt-sd-32', pid: 'hayman_mt', h1: 'Montana Senate District 32', where: 'District 32 as Montana’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Montana Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-33': { seat: 'mt-statesenate-33', composer: false, alias: 'mt-sd-33', route: '/district/mt-sd-33', pid: 'pope_mt', h1: 'Montana Senate District 33', where: 'District 33 as Montana’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Montana Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-34': { seat: 'mt-statesenate-34', composer: false, alias: 'mt-sd-34', route: '/district/mt-sd-34', pid: 'vance_mt', h1: 'Montana Senate District 34', where: 'District 34 as Montana’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Montana Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-35': { seat: 'mt-statesenate-35', composer: false, alias: 'mt-sd-35', route: '/district/mt-sd-35', pid: 'tezak_mt', h1: 'Montana Senate District 35', where: 'District 35 as Montana’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Montana Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-36': { seat: 'mt-statesenate-36', composer: false, alias: 'mt-sd-36', route: '/district/mt-sd-36', pid: 'novak_mt', h1: 'Montana Senate District 36', where: 'District 36 as Montana’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Montana Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-37': { seat: 'mt-statesenate-37', composer: false, alias: 'mt-sd-37', route: '/district/mt-sd-37', pid: 'harvey_mt', h1: 'Montana Senate District 37', where: 'District 37 as Montana’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Montana Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-38': { seat: 'mt-statesenate-38', composer: false, alias: 'mt-sd-38', route: '/district/mt-sd-38', pid: 'beard_mt', h1: 'Montana Senate District 38', where: 'District 38 as Montana’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for Montana Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-39': { seat: 'mt-statesenate-39', composer: false, alias: 'mt-sd-39', route: '/district/mt-sd-39', pid: 'galt_mt', h1: 'Montana Senate District 39', where: 'District 39 as Montana’s current legislative plan draws it', kick: 'Senate District 39 board', kickTitle: 'The district board for Montana Senate District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-4': { seat: 'mt-statesenate-4', composer: false, alias: 'mt-sd-4', route: '/district/mt-sd-4', pid: 'fuller_mt', h1: 'Montana Senate District 4', where: 'District 4 as Montana’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Montana Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-40': { seat: 'mt-statesenate-40', composer: false, alias: 'mt-sd-40', route: '/district/mt-sd-40', pid: 'laura_smith_mt', h1: 'Montana Senate District 40', where: 'District 40 as Montana’s current legislative plan draws it', kick: 'Senate District 40 board', kickTitle: 'The district board for Montana Senate District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-41': { seat: 'mt-statesenate-41', composer: false, alias: 'mt-sd-41', route: '/district/mt-sd-41', pid: 'ellis_mt', h1: 'Montana Senate District 41', where: 'District 41 as Montana’s current legislative plan draws it', kick: 'Senate District 41 board', kickTitle: 'The district board for Montana Senate District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-42': { seat: 'mt-statesenate-42', composer: false, alias: 'mt-sd-42', route: '/district/mt-sd-42', pid: 'dunwell_mt', h1: 'Montana Senate District 42', where: 'District 42 as Montana’s current legislative plan draws it', kick: 'Senate District 42 board', kickTitle: 'The district board for Montana Senate District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-43': { seat: 'mt-statesenate-43', composer: false, alias: 'mt-sd-43', route: '/district/mt-sd-43', pid: 'jason_ellsworth', h1: 'Montana Senate District 43', where: 'District 43 as Montana’s current legislative plan draws it', kick: 'Senate District 43 board', kickTitle: 'The district board for Montana Senate District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-44': { seat: 'mt-statesenate-44', composer: false, alias: 'mt-sd-44', route: '/district/mt-sd-44', pid: 'manzella_mt', h1: 'Montana Senate District 44', where: 'District 44 as Montana’s current legislative plan draws it', kick: 'Senate District 44 board', kickTitle: 'The district board for Montana Senate District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-45': { seat: 'mt-statesenate-45', composer: false, alias: 'mt-sd-45', route: '/district/mt-sd-45', pid: 'loge_mt', h1: 'Montana Senate District 45', where: 'District 45 as Montana’s current legislative plan draws it', kick: 'Senate District 45 board', kickTitle: 'The district board for Montana Senate District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-46': { seat: 'mt-statesenate-46', composer: false, alias: 'mt-sd-46', route: '/district/mt-sd-46', pid: 'morigeau_mt', h1: 'Montana Senate District 46', where: 'District 46 as Montana’s current legislative plan draws it', kick: 'Senate District 46 board', kickTitle: 'The district board for Montana Senate District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-47': { seat: 'mt-statesenate-47', composer: false, alias: 'mt-sd-47', route: '/district/mt-sd-47', pid: 'boldman_mt', h1: 'Montana Senate District 47', where: 'District 47 as Montana’s current legislative plan draws it', kick: 'Senate District 47 board', kickTitle: 'The district board for Montana Senate District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-48': { seat: 'mt-statesenate-48', composer: false, alias: 'mt-sd-48', route: '/district/mt-sd-48', pid: 'olsen_mt', h1: 'Montana Senate District 48', where: 'District 48 as Montana’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Montana Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-49': { seat: 'mt-statesenate-49', composer: false, alias: 'mt-sd-49', route: '/district/mt-sd-49', pid: 'curdy_mt', h1: 'Montana Senate District 49', where: 'District 49 as Montana’s current legislative plan draws it', kick: 'Senate District 49 board', kickTitle: 'The district board for Montana Senate District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-5': { seat: 'mt-statesenate-5', composer: false, alias: 'mt-sd-5', route: '/district/mt-sd-5', pid: 'matt_regier', h1: 'Montana Senate District 5', where: 'District 5 as Montana’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Montana Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-50': { seat: 'mt-statesenate-50', composer: false, alias: 'mt-sd-50', route: '/district/mt-sd-50', pid: 'shane_morigeau_mt', h1: 'Montana Senate District 50', where: 'District 50 as Montana’s current legislative plan draws it', kick: 'Senate District 50 board', kickTitle: 'The district board for Montana Senate District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-6': { seat: 'mt-statesenate-6', composer: false, alias: 'mt-sd-6', route: '/district/mt-sd-6', pid: 'noland_mt', h1: 'Montana Senate District 6', where: 'District 6 as Montana’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Montana Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-7': { seat: 'mt-statesenate-7', composer: false, alias: 'mt-sd-7', route: '/district/mt-sd-7', pid: 'hertz_mt', h1: 'Montana Senate District 7', where: 'District 7 as Montana’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Montana Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-8': { seat: 'mt-statesenate-8', composer: false, alias: 'mt-sd-8', route: '/district/mt-sd-8', pid: 'webber_mt', h1: 'Montana Senate District 8', where: 'District 8 as Montana’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Montana Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'mt-statesenate-9': { seat: 'mt-statesenate-9', composer: false, alias: 'mt-sd-9', route: '/district/mt-sd-9', pid: 'gillespie_mt', h1: 'Montana Senate District 9', where: 'District 9 as Montana’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Montana Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-1': { seat: 'ne-statesenate-1', composer: false, alias: 'ne-sd-1', route: '/district/ne-sd-1', pid: 'hallstrom_ne', h1: 'Nebraska Senate District 1', where: 'District 1 as Nebraska’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Nebraska Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-10': { seat: 'ne-statesenate-10', composer: false, alias: 'ne-sd-10', route: '/district/ne-sd-10', pid: 'deboer_ne', h1: 'Nebraska Senate District 10', where: 'District 10 as Nebraska’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Nebraska Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-11': { seat: 'ne-statesenate-11', composer: false, alias: 'ne-sd-11', route: '/district/ne-sd-11', pid: 'mckinney_ne', h1: 'Nebraska Senate District 11', where: 'District 11 as Nebraska’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Nebraska Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-12': { seat: 'ne-statesenate-12', composer: false, alias: 'ne-sd-12', route: '/district/ne-sd-12', pid: 'merv_riepe', h1: 'Nebraska Senate District 12', where: 'District 12 as Nebraska’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Nebraska Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-13': { seat: 'ne-statesenate-13', composer: false, alias: 'ne-sd-13', route: '/district/ne-sd-13', pid: 'spivey_ne', h1: 'Nebraska Senate District 13', where: 'District 13 as Nebraska’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Nebraska Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-14': { seat: 'ne-statesenate-14', composer: false, alias: 'ne-sd-14', route: '/district/ne-sd-14', pid: 'john_arch', h1: 'Nebraska Senate District 14', where: 'District 14 as Nebraska’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Nebraska Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-15': { seat: 'ne-statesenate-15', composer: false, alias: 'ne-sd-15', route: '/district/ne-sd-15', pid: 'wordekemper_ne', h1: 'Nebraska Senate District 15', where: 'District 15 as Nebraska’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Nebraska Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-16': { seat: 'ne-statesenate-16', composer: false, alias: 'ne-sd-16', route: '/district/ne-sd-16', pid: 'hansen_ne', h1: 'Nebraska Senate District 16', where: 'District 16 as Nebraska’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Nebraska Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-17': { seat: 'ne-statesenate-17', composer: false, alias: 'ne-sd-17', route: '/district/ne-sd-17', pid: 'meyer_ne', h1: 'Nebraska Senate District 17', where: 'District 17 as Nebraska’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Nebraska Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-18': { seat: 'ne-statesenate-18', composer: false, alias: 'ne-sd-18', route: '/district/ne-sd-18', pid: 'armendariz_ne', h1: 'Nebraska Senate District 18', where: 'District 18 as Nebraska’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Nebraska Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-19': { seat: 'ne-statesenate-19', composer: false, alias: 'ne-sd-19', route: '/district/ne-sd-19', pid: 'dover_ne', h1: 'Nebraska Senate District 19', where: 'District 19 as Nebraska’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Nebraska Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-2': { seat: 'ne-statesenate-2', composer: false, alias: 'ne-sd-2', route: '/district/ne-sd-2', pid: 'clements_ne', h1: 'Nebraska Senate District 2', where: 'District 2 as Nebraska’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Nebraska Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-20': { seat: 'ne-statesenate-20', composer: false, alias: 'ne-sd-20', route: '/district/ne-sd-20', pid: 'fredrickson_ne', h1: 'Nebraska Senate District 20', where: 'District 20 as Nebraska’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Nebraska Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-21': { seat: 'ne-statesenate-21', composer: false, alias: 'ne-sd-21', route: '/district/ne-sd-21', pid: 'ballard_ne', h1: 'Nebraska Senate District 21', where: 'District 21 as Nebraska’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Nebraska Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-22': { seat: 'ne-statesenate-22', composer: false, alias: 'ne-sd-22', route: '/district/ne-sd-22', pid: 'moser_ne', h1: 'Nebraska Senate District 22', where: 'District 22 as Nebraska’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Nebraska Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-23': { seat: 'ne-statesenate-23', composer: false, alias: 'ne-sd-23', route: '/district/ne-sd-23', pid: 'storm_ne', h1: 'Nebraska Senate District 23', where: 'District 23 as Nebraska’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Nebraska Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-24': { seat: 'ne-statesenate-24', composer: false, alias: 'ne-sd-24', route: '/district/ne-sd-24', pid: 'hughes_ne', h1: 'Nebraska Senate District 24', where: 'District 24 as Nebraska’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Nebraska Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-25': { seat: 'ne-statesenate-25', composer: false, alias: 'ne-sd-25', route: '/district/ne-sd-25', pid: 'bosn_ne', h1: 'Nebraska Senate District 25', where: 'District 25 as Nebraska’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Nebraska Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-26': { seat: 'ne-statesenate-26', composer: false, alias: 'ne-sd-26', route: '/district/ne-sd-26', pid: 'dungan_ne', h1: 'Nebraska Senate District 26', where: 'District 26 as Nebraska’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Nebraska Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-27': { seat: 'ne-statesenate-27', composer: false, alias: 'ne-sd-27', route: '/district/ne-sd-27', pid: 'prokop_ne', h1: 'Nebraska Senate District 27', where: 'District 27 as Nebraska’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Nebraska Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-28': { seat: 'ne-statesenate-28', composer: false, alias: 'ne-sd-28', route: '/district/ne-sd-28', pid: 'raybould_ne', h1: 'Nebraska Senate District 28', where: 'District 28 as Nebraska’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Nebraska Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-29': { seat: 'ne-statesenate-29', composer: false, alias: 'ne-sd-29', route: '/district/ne-sd-29', pid: 'bostar_ne', h1: 'Nebraska Senate District 29', where: 'District 29 as Nebraska’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Nebraska Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-3': { seat: 'ne-statesenate-3', composer: false, alias: 'ne-sd-3', route: '/district/ne-sd-3', pid: 'rountree_ne', h1: 'Nebraska Senate District 3', where: 'District 3 as Nebraska’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Nebraska Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-30': { seat: 'ne-statesenate-30', composer: false, alias: 'ne-sd-30', route: '/district/ne-sd-30', pid: 'dorn_ne', h1: 'Nebraska Senate District 30', where: 'District 30 as Nebraska’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Nebraska Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-31': { seat: 'ne-statesenate-31', composer: false, alias: 'ne-sd-31', route: '/district/ne-sd-31', pid: 'kauth_ne', h1: 'Nebraska Senate District 31', where: 'District 31 as Nebraska’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Nebraska Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-32': { seat: 'ne-statesenate-32', composer: false, alias: 'ne-sd-32', route: '/district/ne-sd-32', pid: 'brandt_ne', h1: 'Nebraska Senate District 32', where: 'District 32 as Nebraska’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Nebraska Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-33': { seat: 'ne-statesenate-33', composer: false, alias: 'ne-sd-33', route: '/district/ne-sd-33', pid: 'lonowski_ne', h1: 'Nebraska Senate District 33', where: 'District 33 as Nebraska’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Nebraska Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-34': { seat: 'ne-statesenate-34', composer: false, alias: 'ne-sd-34', route: '/district/ne-sd-34', pid: 'loren_lippincott', h1: 'Nebraska Senate District 34', where: 'District 34 as Nebraska’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Nebraska Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-35': { seat: 'ne-statesenate-35', composer: false, alias: 'ne-sd-35', route: '/district/ne-sd-35', pid: 'quick_ne', h1: 'Nebraska Senate District 35', where: 'District 35 as Nebraska’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Nebraska Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-36': { seat: 'ne-statesenate-36', composer: false, alias: 'ne-sd-36', route: '/district/ne-sd-36', pid: 'holdcroft_ne', h1: 'Nebraska Senate District 36', where: 'District 36 as Nebraska’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Nebraska Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-37': { seat: 'ne-statesenate-37', composer: false, alias: 'ne-sd-37', route: '/district/ne-sd-37', pid: 'clouse_ne', h1: 'Nebraska Senate District 37', where: 'District 37 as Nebraska’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Nebraska Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-38': { seat: 'ne-statesenate-38', composer: false, alias: 'ne-sd-38', route: '/district/ne-sd-38', pid: 'murman_ne', h1: 'Nebraska Senate District 38', where: 'District 38 as Nebraska’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for Nebraska Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-39': { seat: 'ne-statesenate-39', composer: false, alias: 'ne-sd-39', route: '/district/ne-sd-39', pid: 'sorrentino_ne', h1: 'Nebraska Senate District 39', where: 'District 39 as Nebraska’s current legislative plan draws it', kick: 'Senate District 39 board', kickTitle: 'The district board for Nebraska Senate District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-4': { seat: 'ne-statesenate-4', composer: false, alias: 'ne-sd-4', route: '/district/ne-sd-4', pid: 'von_gillern_ne', h1: 'Nebraska Senate District 4', where: 'District 4 as Nebraska’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Nebraska Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-40': { seat: 'ne-statesenate-40', composer: false, alias: 'ne-sd-40', route: '/district/ne-sd-40', pid: 'dekay_ne', h1: 'Nebraska Senate District 40', where: 'District 40 as Nebraska’s current legislative plan draws it', kick: 'Senate District 40 board', kickTitle: 'The district board for Nebraska Senate District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-41': { seat: 'ne-statesenate-41', composer: false, alias: 'ne-sd-41', route: '/district/ne-sd-41', pid: 'fred_meyer_ne', h1: 'Nebraska Senate District 41', where: 'District 41 as Nebraska’s current legislative plan draws it', kick: 'Senate District 41 board', kickTitle: 'The district board for Nebraska Senate District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-42': { seat: 'ne-statesenate-42', composer: false, alias: 'ne-sd-42', route: '/district/ne-sd-42', pid: 'jacobson_ne', h1: 'Nebraska Senate District 42', where: 'District 42 as Nebraska’s current legislative plan draws it', kick: 'Senate District 42 board', kickTitle: 'The district board for Nebraska Senate District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-43': { seat: 'ne-statesenate-43', composer: false, alias: 'ne-sd-43', route: '/district/ne-sd-43', pid: 'storer_ne', h1: 'Nebraska Senate District 43', where: 'District 43 as Nebraska’s current legislative plan draws it', kick: 'Senate District 43 board', kickTitle: 'The district board for Nebraska Senate District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-44': { seat: 'ne-statesenate-44', composer: false, alias: 'ne-sd-44', route: '/district/ne-sd-44', pid: 'ibach_ne', h1: 'Nebraska Senate District 44', where: 'District 44 as Nebraska’s current legislative plan draws it', kick: 'Senate District 44 board', kickTitle: 'The district board for Nebraska Senate District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-45': { seat: 'ne-statesenate-45', composer: false, alias: 'ne-sd-45', route: '/district/ne-sd-45', pid: 'sanders_ne', h1: 'Nebraska Senate District 45', where: 'District 45 as Nebraska’s current legislative plan draws it', kick: 'Senate District 45 board', kickTitle: 'The district board for Nebraska Senate District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-46': { seat: 'ne-statesenate-46', composer: false, alias: 'ne-sd-46', route: '/district/ne-sd-46', pid: 'conrad_ne', h1: 'Nebraska Senate District 46', where: 'District 46 as Nebraska’s current legislative plan draws it', kick: 'Senate District 46 board', kickTitle: 'The district board for Nebraska Senate District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-47': { seat: 'ne-statesenate-47', composer: false, alias: 'ne-sd-47', route: '/district/ne-sd-47', pid: 'strommen_ne', h1: 'Nebraska Senate District 47', where: 'District 47 as Nebraska’s current legislative plan draws it', kick: 'Senate District 47 board', kickTitle: 'The district board for Nebraska Senate District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-48': { seat: 'ne-statesenate-48', composer: false, alias: 'ne-sd-48', route: '/district/ne-sd-48', pid: 'hardin_ne', h1: 'Nebraska Senate District 48', where: 'District 48 as Nebraska’s current legislative plan draws it', kick: 'Senate District 48 board', kickTitle: 'The district board for Nebraska Senate District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-49': { seat: 'ne-statesenate-49', composer: false, alias: 'ne-sd-49', route: '/district/ne-sd-49', pid: 'andersen_ne', h1: 'Nebraska Senate District 49', where: 'District 49 as Nebraska’s current legislative plan draws it', kick: 'Senate District 49 board', kickTitle: 'The district board for Nebraska Senate District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-5': { seat: 'ne-statesenate-5', composer: false, alias: 'ne-sd-5', route: '/district/ne-sd-5', pid: 'juarez_ne', h1: 'Nebraska Senate District 5', where: 'District 5 as Nebraska’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Nebraska Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-6': { seat: 'ne-statesenate-6', composer: false, alias: 'ne-sd-6', route: '/district/ne-sd-6', pid: 'machaela_cavanaugh', h1: 'Nebraska Senate District 6', where: 'District 6 as Nebraska’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Nebraska Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-7': { seat: 'ne-statesenate-7', composer: false, alias: 'ne-sd-7', route: '/district/ne-sd-7', pid: 'guereca_ne', h1: 'Nebraska Senate District 7', where: 'District 7 as Nebraska’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Nebraska Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-8': { seat: 'ne-statesenate-8', composer: false, alias: 'ne-sd-8', route: '/district/ne-sd-8', pid: 'hunt_ne', h1: 'Nebraska Senate District 8', where: 'District 8 as Nebraska’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Nebraska Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ne-statesenate-9': { seat: 'ne-statesenate-9', composer: false, alias: 'ne-sd-9', route: '/district/ne-sd-9', pid: 'john_cavanaugh_ne', h1: 'Nebraska Senate District 9', where: 'District 9 as Nebraska’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Nebraska Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-6': { seat: 'nv-statesenate-6', composer: false, alias: 'nv-sd-6', route: '/district/nv-sd-6', pid: 'nicole_cannizzaro', h1: 'Nevada Senate District 6', where: 'District 6 as Nevada’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Nevada Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-17': { seat: 'nv-statesenate-17', composer: false, alias: 'nv-sd-17', route: '/district/nv-sd-17', pid: 'robin_titus', h1: 'Nevada Senate District 17', where: 'District 17 as Nevada’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Nevada Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-8': { seat: 'nv-statesenate-8', composer: false, alias: 'nv-sd-8', route: '/district/nv-sd-8', pid: 'marilyn_dondero_loop', h1: 'Nevada Senate District 8', where: 'District 8 as Nevada’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Nevada Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-9': { seat: 'nv-statesenate-9', composer: false, alias: 'nv-sd-9', route: '/district/nv-sd-9', pid: 'scheible_nv', h1: 'Nevada Senate District 9', where: 'District 9 as Nevada’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Nevada Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-12': { seat: 'nv-statesenate-12', composer: false, alias: 'nv-sd-12', route: '/district/nv-sd-12', pid: 'pazina_nv', h1: 'Nevada Senate District 12', where: 'District 12 as Nevada’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Nevada Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-4': { seat: 'nv-statehouse-4', composer: false, alias: 'nv-hd-4', route: '/district/nv-hd-4', pid: 'lisa_cole_nv', h1: 'Nevada Assembly District 4', where: 'District 4 as Nevada’s current legislative plan draws it', kick: 'Assembly District 4 board', kickTitle: 'The district board for Nevada Assembly District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-21': { seat: 'nv-statehouse-21', composer: false, alias: 'nv-hd-21', route: '/district/nv-hd-21', pid: 'marzola_nv', h1: 'Nevada Assembly District 21', where: 'District 21 as Nevada’s current legislative plan draws it', kick: 'Assembly District 21 board', kickTitle: 'The district board for Nevada Assembly District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-25': { seat: 'nv-statehouse-25', composer: false, alias: 'nv-hd-25', route: '/district/nv-hd-25', pid: 'la_rue_hatch_nv', h1: 'Nevada Assembly District 25', where: 'District 25 as Nevada’s current legislative plan draws it', kick: 'Assembly District 25 board', kickTitle: 'The district board for Nevada Assembly District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-35': { seat: 'nv-statehouse-35', composer: false, alias: 'nv-hd-35', route: '/district/nv-hd-35', pid: 'edgeworth_nv', h1: 'Nevada Assembly District 35', where: 'District 35 as Nevada’s current legislative plan draws it', kick: 'Assembly District 35 board', kickTitle: 'The district board for Nevada Assembly District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-37': { seat: 'nv-statehouse-37', composer: false, alias: 'nv-hd-37', route: '/district/nv-hd-37', pid: 'backus_nv', h1: 'Nevada Assembly District 37', where: 'District 37 as Nevada’s current legislative plan draws it', kick: 'Assembly District 37 board', kickTitle: 'The district board for Nevada Assembly District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-1': { seat: 'nv-statehouse-1', composer: false, alias: 'nv-hd-1', route: '/district/nv-hd-1', pid: 'monroe_moreno_nv', h1: 'Nevada Assembly District 1', where: 'District 1 as Nevada’s current legislative plan draws it', kick: 'Assembly District 1 board', kickTitle: 'The district board for Nevada Assembly District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-2': { seat: 'nv-statehouse-2', composer: false, alias: 'nv-hd-2', route: '/district/nv-hd-2', pid: 'kasama_nv', h1: 'Nevada Assembly District 2', where: 'District 2 as Nevada’s current legislative plan draws it', kick: 'Assembly District 2 board', kickTitle: 'The district board for Nevada Assembly District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-3': { seat: 'nv-statehouse-3', composer: false, alias: 'nv-hd-3', route: '/district/nv-hd-3', pid: 'torres_fossett_nv', h1: 'Nevada Assembly District 3', where: 'District 3 as Nevada’s current legislative plan draws it', kick: 'Assembly District 3 board', kickTitle: 'The district board for Nevada Assembly District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-5': { seat: 'nv-statehouse-5', composer: false, alias: 'nv-hd-5', route: '/district/nv-hd-5', pid: 'miller_nv', h1: 'Nevada Assembly District 5', where: 'District 5 as Nevada’s current legislative plan draws it', kick: 'Assembly District 5 board', kickTitle: 'The district board for Nevada Assembly District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-6': { seat: 'nv-statehouse-6', composer: false, alias: 'nv-hd-6', route: '/district/nv-hd-6', pid: 'jackson_nv', h1: 'Nevada Assembly District 6', where: 'District 6 as Nevada’s current legislative plan draws it', kick: 'Assembly District 6 board', kickTitle: 'The district board for Nevada Assembly District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-7': { seat: 'nv-statehouse-7', composer: false, alias: 'nv-hd-7', route: '/district/nv-hd-7', pid: 'flanagan_nv', h1: 'Nevada Assembly District 7', where: 'District 7 as Nevada’s current legislative plan draws it', kick: 'Assembly District 7 board', kickTitle: 'The district board for Nevada Assembly District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-8': { seat: 'nv-statehouse-8', composer: false, alias: 'nv-hd-8', route: '/district/nv-hd-8', pid: 'nguyen_nv', h1: 'Nevada Assembly District 8', where: 'District 8 as Nevada’s current legislative plan draws it', kick: 'Assembly District 8 board', kickTitle: 'The district board for Nevada Assembly District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-9': { seat: 'nv-statehouse-9', composer: false, alias: 'nv-hd-9', route: '/district/nv-hd-9', pid: 'yeager_nv', h1: 'Nevada Assembly District 9', where: 'District 9 as Nevada’s current legislative plan draws it', kick: 'Assembly District 9 board', kickTitle: 'The district board for Nevada Assembly District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-10': { seat: 'nv-statehouse-10', composer: false, alias: 'nv-hd-10', route: '/district/nv-hd-10', pid: 'karris_nv', h1: 'Nevada Assembly District 10', where: 'District 10 as Nevada’s current legislative plan draws it', kick: 'Assembly District 10 board', kickTitle: 'The district board for Nevada Assembly District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-11': { seat: 'nv-statehouse-11', composer: false, alias: 'nv-hd-11', route: '/district/nv-hd-11', pid: 'moore_nv', h1: 'Nevada Assembly District 11', where: 'District 11 as Nevada’s current legislative plan draws it', kick: 'Assembly District 11 board', kickTitle: 'The district board for Nevada Assembly District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-12': { seat: 'nv-statehouse-12', composer: false, alias: 'nv-hd-12', route: '/district/nv-hd-12', pid: 'carter_nv', h1: 'Nevada Assembly District 12', where: 'District 12 as Nevada’s current legislative plan draws it', kick: 'Assembly District 12 board', kickTitle: 'The district board for Nevada Assembly District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-13': { seat: 'nv-statehouse-13', composer: false, alias: 'nv-hd-13', route: '/district/nv-hd-13', pid: 'hibbetts_nv', h1: 'Nevada Assembly District 13', where: 'District 13 as Nevada’s current legislative plan draws it', kick: 'Assembly District 13 board', kickTitle: 'The district board for Nevada Assembly District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-14': { seat: 'nv-statehouse-14', composer: false, alias: 'nv-hd-14', route: '/district/nv-hd-14', pid: 'mosca_nv', h1: 'Nevada Assembly District 14', where: 'District 14 as Nevada’s current legislative plan draws it', kick: 'Assembly District 14 board', kickTitle: 'The district board for Nevada Assembly District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-15': { seat: 'nv-statehouse-15', composer: false, alias: 'nv-hd-15', route: '/district/nv-hd-15', pid: 'watts_nv', h1: 'Nevada Assembly District 15', where: 'District 15 as Nevada’s current legislative plan draws it', kick: 'Assembly District 15 board', kickTitle: 'The district board for Nevada Assembly District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-16': { seat: 'nv-statehouse-16', composer: false, alias: 'nv-hd-16', route: '/district/nv-hd-16', pid: 'gonzalez_nv', h1: 'Nevada Assembly District 16', where: 'District 16 as Nevada’s current legislative plan draws it', kick: 'Assembly District 16 board', kickTitle: 'The district board for Nevada Assembly District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-17': { seat: 'nv-statehouse-17', composer: false, alias: 'nv-hd-17', route: '/district/nv-hd-17', pid: 'hunt_nv', h1: 'Nevada Assembly District 17', where: 'District 17 as Nevada’s current legislative plan draws it', kick: 'Assembly District 17 board', kickTitle: 'The district board for Nevada Assembly District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-18': { seat: 'nv-statehouse-18', composer: false, alias: 'nv-hd-18', route: '/district/nv-hd-18', pid: 'considine_nv', h1: 'Nevada Assembly District 18', where: 'District 18 as Nevada’s current legislative plan draws it', kick: 'Assembly District 18 board', kickTitle: 'The district board for Nevada Assembly District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-19': { seat: 'nv-statehouse-19', composer: false, alias: 'nv-hd-19', route: '/district/nv-hd-19', pid: 'patchett_nv', h1: 'Nevada Assembly District 19', where: 'District 19 as Nevada’s current legislative plan draws it', kick: 'Assembly District 19 board', kickTitle: 'The district board for Nevada Assembly District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-20': { seat: 'nv-statehouse-20', composer: false, alias: 'nv-hd-20', route: '/district/nv-hd-20', pid: 'orentlicher_nv', h1: 'Nevada Assembly District 20', where: 'District 20 as Nevada’s current legislative plan draws it', kick: 'Assembly District 20 board', kickTitle: 'The district board for Nevada Assembly District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-22': { seat: 'nv-statehouse-22', composer: false, alias: 'nv-hd-22', route: '/district/nv-hd-22', pid: 'hardy_nv', h1: 'Nevada Assembly District 22', where: 'District 22 as Nevada’s current legislative plan draws it', kick: 'Assembly District 22 board', kickTitle: 'The district board for Nevada Assembly District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-23': { seat: 'nv-statehouse-23', composer: false, alias: 'nv-hd-23', route: '/district/nv-hd-23', pid: 'gallant_nv', h1: 'Nevada Assembly District 23', where: 'District 23 as Nevada’s current legislative plan draws it', kick: 'Assembly District 23 board', kickTitle: 'The district board for Nevada Assembly District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-24': { seat: 'nv-statehouse-24', composer: false, alias: 'nv-hd-24', route: '/district/nv-hd-24', pid: 'roth_nv', h1: 'Nevada Assembly District 24', where: 'District 24 as Nevada’s current legislative plan draws it', kick: 'Assembly District 24 board', kickTitle: 'The district board for Nevada Assembly District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-26': { seat: 'nv-statehouse-26', composer: false, alias: 'nv-hd-26', route: '/district/nv-hd-26', pid: 'delong_nv', h1: 'Nevada Assembly District 26', where: 'District 26 as Nevada’s current legislative plan draws it', kick: 'Assembly District 26 board', kickTitle: 'The district board for Nevada Assembly District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-27': { seat: 'nv-statehouse-27', composer: false, alias: 'nv-hd-27', route: '/district/nv-hd-27', pid: 'goulding_nv', h1: 'Nevada Assembly District 27', where: 'District 27 as Nevada’s current legislative plan draws it', kick: 'Assembly District 27 board', kickTitle: 'The district board for Nevada Assembly District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-28': { seat: 'nv-statehouse-28', composer: false, alias: 'nv-hd-28', route: '/district/nv-hd-28', pid: 'd_silva_nv', h1: 'Nevada Assembly District 28', where: 'District 28 as Nevada’s current legislative plan draws it', kick: 'Assembly District 28 board', kickTitle: 'The district board for Nevada Assembly District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-29': { seat: 'nv-statehouse-29', composer: false, alias: 'nv-hd-29', route: '/district/nv-hd-29', pid: 'dalia_nv', h1: 'Nevada Assembly District 29', where: 'District 29 as Nevada’s current legislative plan draws it', kick: 'Assembly District 29 board', kickTitle: 'The district board for Nevada Assembly District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-30': { seat: 'nv-statehouse-30', composer: false, alias: 'nv-hd-30', route: '/district/nv-hd-30', pid: 'anderson_nv', h1: 'Nevada Assembly District 30', where: 'District 30 as Nevada’s current legislative plan draws it', kick: 'Assembly District 30 board', kickTitle: 'The district board for Nevada Assembly District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-31': { seat: 'nv-statehouse-31', composer: false, alias: 'nv-hd-31', route: '/district/nv-hd-31', pid: 'dickman_nv', h1: 'Nevada Assembly District 31', where: 'District 31 as Nevada’s current legislative plan draws it', kick: 'Assembly District 31 board', kickTitle: 'The district board for Nevada Assembly District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-32': { seat: 'nv-statehouse-32', composer: false, alias: 'nv-hd-32', route: '/district/nv-hd-32', pid: 'hansen_nv', h1: 'Nevada Assembly District 32', where: 'District 32 as Nevada’s current legislative plan draws it', kick: 'Assembly District 32 board', kickTitle: 'The district board for Nevada Assembly District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-33': { seat: 'nv-statehouse-33', composer: false, alias: 'nv-hd-33', route: '/district/nv-hd-33', pid: 'gurr_nv', h1: 'Nevada Assembly District 33', where: 'District 33 as Nevada’s current legislative plan draws it', kick: 'Assembly District 33 board', kickTitle: 'The district board for Nevada Assembly District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-34': { seat: 'nv-statehouse-34', composer: false, alias: 'nv-hd-34', route: '/district/nv-hd-34', pid: 'nadeem_nv', h1: 'Nevada Assembly District 34', where: 'District 34 as Nevada’s current legislative plan draws it', kick: 'Assembly District 34 board', kickTitle: 'The district board for Nevada Assembly District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-36': { seat: 'nv-statehouse-36', composer: false, alias: 'nv-hd-36', route: '/district/nv-hd-36', pid: 'hafen_nv', h1: 'Nevada Assembly District 36', where: 'District 36 as Nevada’s current legislative plan draws it', kick: 'Assembly District 36 board', kickTitle: 'The district board for Nevada Assembly District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-38': { seat: 'nv-statehouse-38', composer: false, alias: 'nv-hd-38', route: '/district/nv-hd-38', pid: 'koenig_nv', h1: 'Nevada Assembly District 38', where: 'District 38 as Nevada’s current legislative plan draws it', kick: 'Assembly District 38 board', kickTitle: 'The district board for Nevada Assembly District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-39': { seat: 'nv-statehouse-39', composer: false, alias: 'nv-hd-39', route: '/district/nv-hd-39', pid: 'osborn_nv', h1: 'Nevada Assembly District 39', where: 'District 39 as Nevada’s current legislative plan draws it', kick: 'Assembly District 39 board', kickTitle: 'The district board for Nevada Assembly District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-40': { seat: 'nv-statehouse-40', composer: false, alias: 'nv-hd-40', route: '/district/nv-hd-40', pid: 'o_neill_nv', h1: 'Nevada Assembly District 40', where: 'District 40 as Nevada’s current legislative plan draws it', kick: 'Assembly District 40 board', kickTitle: 'The district board for Nevada Assembly District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-41': { seat: 'nv-statehouse-41', composer: false, alias: 'nv-hd-41', route: '/district/nv-hd-41', pid: 'jauregui_nv', h1: 'Nevada Assembly District 41', where: 'District 41 as Nevada’s current legislative plan draws it', kick: 'Assembly District 41 board', kickTitle: 'The district board for Nevada Assembly District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statehouse-42': { seat: 'nv-statehouse-42', composer: false, alias: 'nv-hd-42', route: '/district/nv-hd-42', pid: 'brown_may_nv', h1: 'Nevada Assembly District 42', where: 'District 42 as Nevada’s current legislative plan draws it', kick: 'Assembly District 42 board', kickTitle: 'The district board for Nevada Assembly District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-1': { seat: 'nv-statesenate-1', composer: false, alias: 'nv-sd-1', route: '/district/nv-sd-1', pid: 'crawford_nv', h1: 'Nevada Senate District 1', where: 'District 1 as Nevada’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Nevada Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-2': { seat: 'nv-statesenate-2', composer: false, alias: 'nv-sd-2', route: '/district/nv-sd-2', pid: 'flores_nv', h1: 'Nevada Senate District 2', where: 'District 2 as Nevada’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Nevada Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-3': { seat: 'nv-statesenate-3', composer: false, alias: 'nv-sd-3', route: '/district/nv-sd-3', pid: 'rochelle_nguyen_nv', h1: 'Nevada Senate District 3', where: 'District 3 as Nevada’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Nevada Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-4': { seat: 'nv-statesenate-4', composer: false, alias: 'nv-sd-4', route: '/district/nv-sd-4', pid: 'neal_nv', h1: 'Nevada Senate District 4', where: 'District 4 as Nevada’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Nevada Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-7': { seat: 'nv-statesenate-7', composer: false, alias: 'nv-sd-7', route: '/district/nv-sd-7', pid: 'lange_nv', h1: 'Nevada Senate District 7', where: 'District 7 as Nevada’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Nevada Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-10': { seat: 'nv-statesenate-10', composer: false, alias: 'nv-sd-10', route: '/district/nv-sd-10', pid: 'fabian_donate_nv', h1: 'Nevada Senate District 10', where: 'District 10 as Nevada’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Nevada Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-11': { seat: 'nv-statesenate-11', composer: false, alias: 'nv-sd-11', route: '/district/nv-sd-11', pid: 'rogich_nv', h1: 'Nevada Senate District 11', where: 'District 11 as Nevada’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Nevada Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-13': { seat: 'nv-statesenate-13', composer: false, alias: 'nv-sd-13', route: '/district/nv-sd-13', pid: 'daly_nv', h1: 'Nevada Senate District 13', where: 'District 13 as Nevada’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Nevada Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-14': { seat: 'nv-statesenate-14', composer: false, alias: 'nv-sd-14', route: '/district/nv-sd-14', pid: 'ira_hansen_nv', h1: 'Nevada Senate District 14', where: 'District 14 as Nevada’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Nevada Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-15': { seat: 'nv-statesenate-15', composer: false, alias: 'nv-sd-15', route: '/district/nv-sd-15', pid: 'taylor_nv', h1: 'Nevada Senate District 15', where: 'District 15 as Nevada’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Nevada Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-16': { seat: 'nv-statesenate-16', composer: false, alias: 'nv-sd-16', route: '/district/nv-sd-16', pid: 'krasner_nv', h1: 'Nevada Senate District 16', where: 'District 16 as Nevada’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Nevada Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-18': { seat: 'nv-statesenate-18', composer: false, alias: 'nv-sd-18', route: '/district/nv-sd-18', pid: 'steinbeck_nv', h1: 'Nevada Senate District 18', where: 'District 18 as Nevada’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Nevada Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-19': { seat: 'nv-statesenate-19', composer: false, alias: 'nv-sd-19', route: '/district/nv-sd-19', pid: 'ellison_nv', h1: 'Nevada Senate District 19', where: 'District 19 as Nevada’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Nevada Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-20': { seat: 'nv-statesenate-20', composer: false, alias: 'nv-sd-20', route: '/district/nv-sd-20', pid: 'stone_nv', h1: 'Nevada Senate District 20', where: 'District 20 as Nevada’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Nevada Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-21': { seat: 'nv-statesenate-21', composer: false, alias: 'nv-sd-21', route: '/district/nv-sd-21', pid: 'ohrenschall_nv', h1: 'Nevada Senate District 21', where: 'District 21 as Nevada’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Nevada Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'nv-statesenate-5': { seat: 'nv-statesenate-5', composer: false, alias: 'nv-sd-5', route: '/district/nv-sd-5', pid: 'carrie_buck', h1: 'Nevada Senate District 5', where: 'District 5 as Nevada’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Nevada Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statesenate-43': { seat: 'ny-statesenate-43', composer: true, alias: 'ny-sd-43', route: '/district/ny-sd-43', pid: 'ashby_ny', h1: 'New York Senate District 43', where: 'District 43 as New York’s current legislative plan draws it', kick: 'Senate District 43 board', kickTitle: 'The district board for New York Senate District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statesenate-39': { seat: 'ny-statesenate-39', composer: true, alias: 'ny-sd-39', route: '/district/ny-sd-39', pid: 'rolison_ny', h1: 'New York Senate District 39', where: 'District 39 as New York’s current legislative plan draws it', kick: 'Senate District 39 board', kickTitle: 'The district board for New York Senate District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statesenate-44': { seat: 'ny-statesenate-44', composer: true, alias: 'ny-sd-44', route: '/district/ny-sd-44', pid: 'tedisco_ny', h1: 'New York Senate District 44', where: 'District 44 as New York’s current legislative plan draws it', kick: 'Senate District 44 board', kickTitle: 'The district board for New York Senate District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statesenate-38': { seat: 'ny-statesenate-38', composer: true, alias: 'ny-sd-38', route: '/district/ny-sd-38', pid: 'weber_ny', h1: 'New York Senate District 38', where: 'District 38 as New York’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for New York Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statehouse-107': { seat: 'ny-statehouse-107', composer: true, alias: 'ny-hd-107', route: '/district/ny-hd-107', pid: 'bendett_ny', h1: 'New York Assembly District 107', where: 'District 107 as New York’s current legislative plan draws it', kick: 'Assembly District 107 board', kickTitle: 'The district board for New York Assembly District 107: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statehouse-46': { seat: 'ny-statehouse-46', composer: true, alias: 'ny-hd-46', route: '/district/ny-hd-46', pid: 'brook_krasny_ny', h1: 'New York Assembly District 46', where: 'District 46 as New York’s current legislative plan draws it', kick: 'Assembly District 46 board', kickTitle: 'The district board for New York Assembly District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statehouse-143': { seat: 'ny-statehouse-143', composer: true, alias: 'ny-hd-143', route: '/district/ny-hd-143', pid: 'chludzinski_ny', h1: 'New York Assembly District 143', where: 'District 143 as New York’s current legislative plan draws it', kick: 'Assembly District 143 board', kickTitle: 'The district board for New York Assembly District 143: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statehouse-21': { seat: 'ny-statehouse-21', composer: true, alias: 'ny-hd-21', route: '/district/ny-hd-21', pid: 'griffin_ny', h1: 'New York Assembly District 21', where: 'District 21 as New York’s current legislative plan draws it', kick: 'Assembly District 21 board', kickTitle: 'The district board for New York Assembly District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ny-statehouse-97': { seat: 'ny-statehouse-97', composer: true, alias: 'ny-hd-97', route: '/district/ny-hd-97', pid: 'wieder_ny', h1: 'New York Assembly District 97', where: 'District 97 as New York’s current legislative plan draws it', kick: 'Assembly District 97 board', kickTitle: 'The district board for New York Assembly District 97: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-7': { seat: 'nc-statesenate-7', composer: true, alias: 'nc-sd-7', route: '/district/nc-sd-7', pid: 'michael_lee_nc', h1: 'North Carolina Senate District 7', where: 'District 7 as North Carolina’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for North Carolina Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-11': { seat: 'nc-statesenate-11', composer: true, alias: 'nc-sd-11', route: '/district/nc-sd-11', pid: 'barnes_nc', h1: 'North Carolina Senate District 11', where: 'District 11 as North Carolina’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for North Carolina Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-42': { seat: 'nc-statesenate-42', composer: true, alias: 'nc-sd-42', route: '/district/nc-sd-42', pid: 'bradley_nc', h1: 'North Carolina Senate District 42', where: 'District 42 as North Carolina’s current legislative plan draws it', kick: 'Senate District 42 board', kickTitle: 'The district board for North Carolina Senate District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statesenate-18': { seat: 'nc-statesenate-18', composer: true, alias: 'nc-sd-18', route: '/district/nc-sd-18', pid: 'fatmi_nc', h1: 'North Carolina Senate District 18', where: 'District 18 as North Carolina’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for North Carolina Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-25': { seat: 'nc-statehouse-25', composer: true, alias: 'nc-hd-25', route: '/district/nc-hd-25', pid: 'chesser_nc', h1: 'North Carolina House District 25', where: 'District 25 as North Carolina’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for North Carolina House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-105': { seat: 'nc-statehouse-105', composer: true, alias: 'nc-hd-105', route: '/district/nc-hd-105', pid: 'cotham_nc', h1: 'North Carolina House District 105', where: 'District 105 as North Carolina’s current legislative plan draws it', kick: 'House District 105 board', kickTitle: 'The district board for North Carolina House District 105: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-98': { seat: 'nc-statehouse-98', composer: true, alias: 'nc-hd-98', route: '/district/nc-hd-98', pid: 'helfrich_nc', h1: 'North Carolina House District 98', where: 'District 98 as North Carolina’s current legislative plan draws it', kick: 'House District 98 board', kickTitle: 'The district board for North Carolina House District 98: who is in the room and what is on the table. A place, not a scorecard.' },
    'nc-statehouse-37': { seat: 'nc-statehouse-37', composer: true, alias: 'nc-hd-37', route: '/district/nc-hd-37', pid: 'pare_nc', h1: 'North Carolina House District 37', where: 'District 37 as North Carolina’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for North Carolina House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-statesenate-29': { seat: 'oh-statesenate-29', composer: true, alias: 'oh-sd-29', route: '/district/oh-sd-29', pid: 'timken_oh', h1: 'Ohio Senate District 29', where: 'District 29 as Ohio’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Ohio Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-statehouse-10': { seat: 'oh-statehouse-10', composer: true, alias: 'oh-hd-10', route: '/district/oh-hd-10', pid: 'sigrist_oh', h1: 'Ohio House District 10', where: 'District 10 as Ohio’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Ohio House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-statehouse-17': { seat: 'oh-statehouse-17', composer: true, alias: 'oh-hd-17', route: '/district/oh-hd-17', pid: 'dovilla_oh', h1: 'Ohio House District 17', where: 'District 17 as Ohio’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Ohio House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-statehouse-36': { seat: 'oh-statehouse-36', composer: true, alias: 'oh-hd-36', route: '/district/oh-hd-36', pid: 'andrea_white_oh', h1: 'Ohio House District 36', where: 'District 36 as Ohio’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Ohio House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'oh-statehouse-60': { seat: 'oh-statehouse-60', composer: true, alias: 'oh-hd-60', route: '/district/oh-hd-60', pid: 'lorenz_oh', h1: 'Ohio House District 60', where: 'District 60 as Ohio’s current legislative plan draws it', kick: 'House District 60 board', kickTitle: 'The district board for Ohio House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-40': { seat: 'pa-statesenate-40', composer: true, alias: 'pa-sd-40', route: '/district/pa-sd-40', pid: 'rosemary_brown_pa', h1: 'Pennsylvania Senate District 40', where: 'District 40 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 40 board', kickTitle: 'The district board for Pennsylvania Senate District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-16': { seat: 'pa-statesenate-16', composer: true, alias: 'pa-sd-16', route: '/district/pa-sd-16', pid: 'coleman_pa', h1: 'Pennsylvania Senate District 16', where: 'District 16 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Pennsylvania Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-6': { seat: 'pa-statesenate-6', composer: true, alias: 'pa-sd-6', route: '/district/pa-sd-6', pid: 'farry_pa', h1: 'Pennsylvania Senate District 6', where: 'District 6 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Pennsylvania Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-36': { seat: 'pa-statesenate-36', composer: true, alias: 'pa-sd-36', route: '/district/pa-sd-36', pid: 'malone_pa', h1: 'Pennsylvania Senate District 36', where: 'District 36 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Pennsylvania Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statesenate-24': { seat: 'pa-statesenate-24', composer: true, alias: 'pa-sd-24', route: '/district/pa-sd-24', pid: 'pennycuick_pa', h1: 'Pennsylvania Senate District 24', where: 'District 24 as Pennsylvania’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Pennsylvania Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-72': { seat: 'pa-statehouse-72', composer: true, alias: 'pa-hd-72', route: '/district/pa-hd-72', pid: 'burns_pa', h1: 'Pennsylvania House District 72', where: 'District 72 as Pennsylvania’s current legislative plan draws it', kick: 'House District 72 board', kickTitle: 'The district board for Pennsylvania House District 72: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-12': { seat: 'pa-statehouse-12', composer: true, alias: 'pa-hd-12', route: '/district/pa-hd-12', pid: 'dukes_pa', h1: 'Pennsylvania House District 12', where: 'District 12 as Pennsylvania’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Pennsylvania House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-137': { seat: 'pa-statehouse-137', composer: true, alias: 'pa-hd-137', route: '/district/pa-hd-137', pid: 'emrick_pa', h1: 'Pennsylvania House District 137', where: 'District 137 as Pennsylvania’s current legislative plan draws it', kick: 'House District 137 board', kickTitle: 'The district board for Pennsylvania House District 137: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-142': { seat: 'pa-statehouse-142', composer: true, alias: 'pa-hd-142', route: '/district/pa-hd-142', pid: 'hogan_pa', h1: 'Pennsylvania House District 142', where: 'District 142 as Pennsylvania’s current legislative plan draws it', kick: 'House District 142 board', kickTitle: 'The district board for Pennsylvania House District 142: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-144': { seat: 'pa-statehouse-144', composer: true, alias: 'pa-hd-144', route: '/district/pa-hd-144', pid: 'munroe_pa', h1: 'Pennsylvania House District 144', where: 'District 144 as Pennsylvania’s current legislative plan draws it', kick: 'House District 144 board', kickTitle: 'The district board for Pennsylvania House District 144: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-18': { seat: 'pa-statehouse-18', composer: true, alias: 'pa-hd-18', route: '/district/pa-hd-18', pid: 'tomlinson_pa', h1: 'Pennsylvania House District 18', where: 'District 18 as Pennsylvania’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Pennsylvania House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'pa-statehouse-160': { seat: 'pa-statehouse-160', composer: true, alias: 'pa-hd-160', route: '/district/pa-hd-160', pid: 'craig_williams_pa', h1: 'Pennsylvania House District 160', where: 'District 160 as Pennsylvania’s current legislative plan draws it', kick: 'House District 160 board', kickTitle: 'The district board for Pennsylvania House District 160: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-1': { seat: 'ri-statehouse-1', composer: false, alias: 'ri-hd-1', route: '/district/ri-hd-1', pid: 'ajello_ri', h1: 'Rhode Island House District 1', where: 'District 1 as Rhode Island’s current legislative plan draws it', kick: 'House District 1 board', kickTitle: 'The district board for Rhode Island House District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-10': { seat: 'ri-statehouse-10', composer: false, alias: 'ri-hd-10', route: '/district/ri-hd-10', pid: 'slater_ri', h1: 'Rhode Island House District 10', where: 'District 10 as Rhode Island’s current legislative plan draws it', kick: 'House District 10 board', kickTitle: 'The district board for Rhode Island House District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-11': { seat: 'ri-statehouse-11', composer: false, alias: 'ri-hd-11', route: '/district/ri-hd-11', pid: 'diaz_ri', h1: 'Rhode Island House District 11', where: 'District 11 as Rhode Island’s current legislative plan draws it', kick: 'House District 11 board', kickTitle: 'The district board for Rhode Island House District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-12': { seat: 'ri-statehouse-12', composer: false, alias: 'ri-hd-12', route: '/district/ri-hd-12', pid: 'batista_ri', h1: 'Rhode Island House District 12', where: 'District 12 as Rhode Island’s current legislative plan draws it', kick: 'House District 12 board', kickTitle: 'The district board for Rhode Island House District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-13': { seat: 'ri-statehouse-13', composer: false, alias: 'ri-hd-13', route: '/district/ri-hd-13', pid: 'perez_ri', h1: 'Rhode Island House District 13', where: 'District 13 as Rhode Island’s current legislative plan draws it', kick: 'House District 13 board', kickTitle: 'The district board for Rhode Island House District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-14': { seat: 'ri-statehouse-14', composer: false, alias: 'ri-hd-14', route: '/district/ri-hd-14', pid: 'lima_ri', h1: 'Rhode Island House District 14', where: 'District 14 as Rhode Island’s current legislative plan draws it', kick: 'House District 14 board', kickTitle: 'The district board for Rhode Island House District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-15': { seat: 'ri-statehouse-15', composer: false, alias: 'ri-hd-15', route: '/district/ri-hd-15', pid: 'paplauskas_ri', h1: 'Rhode Island House District 15', where: 'District 15 as Rhode Island’s current legislative plan draws it', kick: 'House District 15 board', kickTitle: 'The district board for Rhode Island House District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-16': { seat: 'ri-statehouse-16', composer: false, alias: 'ri-hd-16', route: '/district/ri-hd-16', pid: 'potter_ri', h1: 'Rhode Island House District 16', where: 'District 16 as Rhode Island’s current legislative plan draws it', kick: 'House District 16 board', kickTitle: 'The district board for Rhode Island House District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-17': { seat: 'ri-statehouse-17', composer: false, alias: 'ri-hd-17', route: '/district/ri-hd-17', pid: 'baginski_ri', h1: 'Rhode Island House District 17', where: 'District 17 as Rhode Island’s current legislative plan draws it', kick: 'House District 17 board', kickTitle: 'The district board for Rhode Island House District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-18': { seat: 'ri-statehouse-18', composer: false, alias: 'ri-hd-18', route: '/district/ri-hd-18', pid: 'handy_ri', h1: 'Rhode Island House District 18', where: 'District 18 as Rhode Island’s current legislative plan draws it', kick: 'House District 18 board', kickTitle: 'The district board for Rhode Island House District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-19': { seat: 'ri-statehouse-19', composer: false, alias: 'ri-hd-19', route: '/district/ri-hd-19', pid: 'mcnamara_ri', h1: 'Rhode Island House District 19', where: 'District 19 as Rhode Island’s current legislative plan draws it', kick: 'House District 19 board', kickTitle: 'The district board for Rhode Island House District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-2': { seat: 'ri-statehouse-2', composer: false, alias: 'ri-hd-2', route: '/district/ri-hd-2', pid: 'blazejewski_ri', h1: 'Rhode Island House District 2', where: 'District 2 as Rhode Island’s current legislative plan draws it', kick: 'House District 2 board', kickTitle: 'The district board for Rhode Island House District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-20': { seat: 'ri-statehouse-20', composer: false, alias: 'ri-hd-20', route: '/district/ri-hd-20', pid: 'bennett_ri', h1: 'Rhode Island House District 20', where: 'District 20 as Rhode Island’s current legislative plan draws it', kick: 'House District 20 board', kickTitle: 'The district board for Rhode Island House District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-21': { seat: 'ri-statehouse-21', composer: false, alias: 'ri-hd-21', route: '/district/ri-hd-21', pid: 'hopkins_ri', h1: 'Rhode Island House District 21', where: 'District 21 as Rhode Island’s current legislative plan draws it', kick: 'House District 21 board', kickTitle: 'The district board for Rhode Island House District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-22': { seat: 'ri-statehouse-22', composer: false, alias: 'ri-hd-22', route: '/district/ri-hd-22', pid: 'solomon_ri', h1: 'Rhode Island House District 22', where: 'District 22 as Rhode Island’s current legislative plan draws it', kick: 'House District 22 board', kickTitle: 'The district board for Rhode Island House District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-23': { seat: 'ri-statehouse-23', composer: false, alias: 'ri-hd-23', route: '/district/ri-hd-23', pid: 'shekarchi_ri', h1: 'Rhode Island House District 23', where: 'District 23 as Rhode Island’s current legislative plan draws it', kick: 'House District 23 board', kickTitle: 'The district board for Rhode Island House District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-24': { seat: 'ri-statehouse-24', composer: false, alias: 'ri-hd-24', route: '/district/ri-hd-24', pid: 'shanley_ri', h1: 'Rhode Island House District 24', where: 'District 24 as Rhode Island’s current legislative plan draws it', kick: 'House District 24 board', kickTitle: 'The district board for Rhode Island House District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-25': { seat: 'ri-statehouse-25', composer: false, alias: 'ri-hd-25', route: '/district/ri-hd-25', pid: 'noret_ri', h1: 'Rhode Island House District 25', where: 'District 25 as Rhode Island’s current legislative plan draws it', kick: 'House District 25 board', kickTitle: 'The district board for Rhode Island House District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-26': { seat: 'ri-statehouse-26', composer: false, alias: 'ri-hd-26', route: '/district/ri-hd-26', pid: 'read_ri', h1: 'Rhode Island House District 26', where: 'District 26 as Rhode Island’s current legislative plan draws it', kick: 'House District 26 board', kickTitle: 'The district board for Rhode Island House District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-27': { seat: 'ri-statehouse-27', composer: false, alias: 'ri-hd-27', route: '/district/ri-hd-27', pid: 'serpa_ri', h1: 'Rhode Island House District 27', where: 'District 27 as Rhode Island’s current legislative plan draws it', kick: 'House District 27 board', kickTitle: 'The district board for Rhode Island House District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-28': { seat: 'ri-statehouse-28', composer: false, alias: 'ri-hd-28', route: '/district/ri-hd-28', pid: 'nardone_ri', h1: 'Rhode Island House District 28', where: 'District 28 as Rhode Island’s current legislative plan draws it', kick: 'House District 28 board', kickTitle: 'The district board for Rhode Island House District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-29': { seat: 'ri-statehouse-29', composer: false, alias: 'ri-hd-29', route: '/district/ri-hd-29', pid: 'roberts_ri', h1: 'Rhode Island House District 29', where: 'District 29 as Rhode Island’s current legislative plan draws it', kick: 'House District 29 board', kickTitle: 'The district board for Rhode Island House District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-3': { seat: 'ri-statehouse-3', composer: false, alias: 'ri-hd-3', route: '/district/ri-hd-3', pid: 'biah_ri', h1: 'Rhode Island House District 3', where: 'District 3 as Rhode Island’s current legislative plan draws it', kick: 'House District 3 board', kickTitle: 'The district board for Rhode Island House District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-30': { seat: 'ri-statehouse-30', composer: false, alias: 'ri-hd-30', route: '/district/ri-hd-30', pid: 'caldwell_ri', h1: 'Rhode Island House District 30', where: 'District 30 as Rhode Island’s current legislative plan draws it', kick: 'House District 30 board', kickTitle: 'The district board for Rhode Island House District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-32': { seat: 'ri-statehouse-32', composer: false, alias: 'ri-hd-32', route: '/district/ri-hd-32', pid: 'craven_ri', h1: 'Rhode Island House District 32', where: 'District 32 as Rhode Island’s current legislative plan draws it', kick: 'House District 32 board', kickTitle: 'The district board for Rhode Island House District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-33': { seat: 'ri-statehouse-33', composer: false, alias: 'ri-hd-33', route: '/district/ri-hd-33', pid: 'mcentee_ri', h1: 'Rhode Island House District 33', where: 'District 33 as Rhode Island’s current legislative plan draws it', kick: 'House District 33 board', kickTitle: 'The district board for Rhode Island House District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-34': { seat: 'ri-statehouse-34', composer: false, alias: 'ri-hd-34', route: '/district/ri-hd-34', pid: 'tanzi_ri', h1: 'Rhode Island House District 34', where: 'District 34 as Rhode Island’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Rhode Island House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-35': { seat: 'ri-statehouse-35', composer: false, alias: 'ri-hd-35', route: '/district/ri-hd-35', pid: 'fogarty_ri', h1: 'Rhode Island House District 35', where: 'District 35 as Rhode Island’s current legislative plan draws it', kick: 'House District 35 board', kickTitle: 'The district board for Rhode Island House District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-36': { seat: 'ri-statehouse-36', composer: false, alias: 'ri-hd-36', route: '/district/ri-hd-36', pid: 'spears_ri', h1: 'Rhode Island House District 36', where: 'District 36 as Rhode Island’s current legislative plan draws it', kick: 'House District 36 board', kickTitle: 'The district board for Rhode Island House District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-37': { seat: 'ri-statehouse-37', composer: false, alias: 'ri-hd-37', route: '/district/ri-hd-37', pid: 'azzinaro_ri', h1: 'Rhode Island House District 37', where: 'District 37 as Rhode Island’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Rhode Island House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-38': { seat: 'ri-statehouse-38', composer: false, alias: 'ri-hd-38', route: '/district/ri-hd-38', pid: 'kennedy_ri', h1: 'Rhode Island House District 38', where: 'District 38 as Rhode Island’s current legislative plan draws it', kick: 'House District 38 board', kickTitle: 'The district board for Rhode Island House District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-39': { seat: 'ri-statehouse-39', composer: false, alias: 'ri-hd-39', route: '/district/ri-hd-39', pid: 'cotter_ri', h1: 'Rhode Island House District 39', where: 'District 39 as Rhode Island’s current legislative plan draws it', kick: 'House District 39 board', kickTitle: 'The district board for Rhode Island House District 39: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-4': { seat: 'ri-statehouse-4', composer: false, alias: 'ri-hd-4', route: '/district/ri-hd-4', pid: 'kislak_ri', h1: 'Rhode Island House District 4', where: 'District 4 as Rhode Island’s current legislative plan draws it', kick: 'House District 4 board', kickTitle: 'The district board for Rhode Island House District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-40': { seat: 'ri-statehouse-40', composer: false, alias: 'ri-hd-40', route: '/district/ri-hd-40', pid: 'chippendale_ri', h1: 'Rhode Island House District 40', where: 'District 40 as Rhode Island’s current legislative plan draws it', kick: 'House District 40 board', kickTitle: 'The district board for Rhode Island House District 40: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-41': { seat: 'ri-statehouse-41', composer: false, alias: 'ri-hd-41', route: '/district/ri-hd-41', pid: 'quattrocchi_ri', h1: 'Rhode Island House District 41', where: 'District 41 as Rhode Island’s current legislative plan draws it', kick: 'House District 41 board', kickTitle: 'The district board for Rhode Island House District 41: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-42': { seat: 'ri-statehouse-42', composer: false, alias: 'ri-hd-42', route: '/district/ri-hd-42', pid: 'fascia_ri', h1: 'Rhode Island House District 42', where: 'District 42 as Rhode Island’s current legislative plan draws it', kick: 'House District 42 board', kickTitle: 'The district board for Rhode Island House District 42: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-43': { seat: 'ri-statehouse-43', composer: false, alias: 'ri-hd-43', route: '/district/ri-hd-43', pid: 'fellela_ri', h1: 'Rhode Island House District 43', where: 'District 43 as Rhode Island’s current legislative plan draws it', kick: 'House District 43 board', kickTitle: 'The district board for Rhode Island House District 43: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-44': { seat: 'ri-statehouse-44', composer: false, alias: 'ri-hd-44', route: '/district/ri-hd-44', pid: 'costantino_ri', h1: 'Rhode Island House District 44', where: 'District 44 as Rhode Island’s current legislative plan draws it', kick: 'House District 44 board', kickTitle: 'The district board for Rhode Island House District 44: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-45': { seat: 'ri-statehouse-45', composer: false, alias: 'ri-hd-45', route: '/district/ri-hd-45', pid: 'ackerman_ri', h1: 'Rhode Island House District 45', where: 'District 45 as Rhode Island’s current legislative plan draws it', kick: 'House District 45 board', kickTitle: 'The district board for Rhode Island House District 45: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-46': { seat: 'ri-statehouse-46', composer: false, alias: 'ri-hd-46', route: '/district/ri-hd-46', pid: 'shallcross_smith_ri', h1: 'Rhode Island House District 46', where: 'District 46 as Rhode Island’s current legislative plan draws it', kick: 'House District 46 board', kickTitle: 'The district board for Rhode Island House District 46: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-47': { seat: 'ri-statehouse-47', composer: false, alias: 'ri-hd-47', route: '/district/ri-hd-47', pid: 'place_ri', h1: 'Rhode Island House District 47', where: 'District 47 as Rhode Island’s current legislative plan draws it', kick: 'House District 47 board', kickTitle: 'The district board for Rhode Island House District 47: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-48': { seat: 'ri-statehouse-48', composer: false, alias: 'ri-hd-48', route: '/district/ri-hd-48', pid: 'newberry_ri', h1: 'Rhode Island House District 48', where: 'District 48 as Rhode Island’s current legislative plan draws it', kick: 'House District 48 board', kickTitle: 'The district board for Rhode Island House District 48: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-49': { seat: 'ri-statehouse-49', composer: false, alias: 'ri-hd-49', route: '/district/ri-hd-49', pid: 'brien_ri', h1: 'Rhode Island House District 49', where: 'District 49 as Rhode Island’s current legislative plan draws it', kick: 'House District 49 board', kickTitle: 'The district board for Rhode Island House District 49: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-5': { seat: 'ri-statehouse-5', composer: false, alias: 'ri-hd-5', route: '/district/ri-hd-5', pid: 'desimone_ri', h1: 'Rhode Island House District 5', where: 'District 5 as Rhode Island’s current legislative plan draws it', kick: 'House District 5 board', kickTitle: 'The district board for Rhode Island House District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-50': { seat: 'ri-statehouse-50', composer: false, alias: 'ri-hd-50', route: '/district/ri-hd-50', pid: 'casey_ri', h1: 'Rhode Island House District 50', where: 'District 50 as Rhode Island’s current legislative plan draws it', kick: 'House District 50 board', kickTitle: 'The district board for Rhode Island House District 50: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-51': { seat: 'ri-statehouse-51', composer: false, alias: 'ri-hd-51', route: '/district/ri-hd-51', pid: 'phillips_ri', h1: 'Rhode Island House District 51', where: 'District 51 as Rhode Island’s current legislative plan draws it', kick: 'House District 51 board', kickTitle: 'The district board for Rhode Island House District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-52': { seat: 'ri-statehouse-52', composer: false, alias: 'ri-hd-52', route: '/district/ri-hd-52', pid: 'marszalkowski_ri', h1: 'Rhode Island House District 52', where: 'District 52 as Rhode Island’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Rhode Island House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-53': { seat: 'ri-statehouse-53', composer: false, alias: 'ri-hd-53', route: '/district/ri-hd-53', pid: 'santucci_ri', h1: 'Rhode Island House District 53', where: 'District 53 as Rhode Island’s current legislative plan draws it', kick: 'House District 53 board', kickTitle: 'The district board for Rhode Island House District 53: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-54': { seat: 'ri-statehouse-54', composer: false, alias: 'ri-hd-54', route: '/district/ri-hd-54', pid: 'o_brien_ri', h1: 'Rhode Island House District 54', where: 'District 54 as Rhode Island’s current legislative plan draws it', kick: 'House District 54 board', kickTitle: 'The district board for Rhode Island House District 54: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-55': { seat: 'ri-statehouse-55', composer: false, alias: 'ri-hd-55', route: '/district/ri-hd-55', pid: 'corvese_ri', h1: 'Rhode Island House District 55', where: 'District 55 as Rhode Island’s current legislative plan draws it', kick: 'House District 55 board', kickTitle: 'The district board for Rhode Island House District 55: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-56': { seat: 'ri-statehouse-56', composer: false, alias: 'ri-hd-56', route: '/district/ri-hd-56', pid: 'giraldo_ri', h1: 'Rhode Island House District 56', where: 'District 56 as Rhode Island’s current legislative plan draws it', kick: 'House District 56 board', kickTitle: 'The district board for Rhode Island House District 56: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-57': { seat: 'ri-statehouse-57', composer: false, alias: 'ri-hd-57', route: '/district/ri-hd-57', pid: 'voas_ri', h1: 'Rhode Island House District 57', where: 'District 57 as Rhode Island’s current legislative plan draws it', kick: 'House District 57 board', kickTitle: 'The district board for Rhode Island House District 57: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-58': { seat: 'ri-statehouse-58', composer: false, alias: 'ri-hd-58', route: '/district/ri-hd-58', pid: 'cruz_ri', h1: 'Rhode Island House District 58', where: 'District 58 as Rhode Island’s current legislative plan draws it', kick: 'House District 58 board', kickTitle: 'The district board for Rhode Island House District 58: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-59': { seat: 'ri-statehouse-59', composer: false, alias: 'ri-hd-59', route: '/district/ri-hd-59', pid: 'stewart_ri', h1: 'Rhode Island House District 59', where: 'District 59 as Rhode Island’s current legislative plan draws it', kick: 'House District 59 board', kickTitle: 'The district board for Rhode Island House District 59: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-6': { seat: 'ri-statehouse-6', composer: false, alias: 'ri-hd-6', route: '/district/ri-hd-6', pid: 'hull_ri', h1: 'Rhode Island House District 6', where: 'District 6 as Rhode Island’s current legislative plan draws it', kick: 'House District 6 board', kickTitle: 'The district board for Rhode Island House District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-60': { seat: 'ri-statehouse-60', composer: false, alias: 'ri-hd-60', route: '/district/ri-hd-60', pid: 'alzate_ri', h1: 'Rhode Island House District 60', where: 'District 60 as Rhode Island’s current legislative plan draws it', kick: 'House District 60 board', kickTitle: 'The district board for Rhode Island House District 60: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-61': { seat: 'ri-statehouse-61', composer: false, alias: 'ri-hd-61', route: '/district/ri-hd-61', pid: 'felix_ri', h1: 'Rhode Island House District 61', where: 'District 61 as Rhode Island’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Rhode Island House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-62': { seat: 'ri-statehouse-62', composer: false, alias: 'ri-hd-62', route: '/district/ri-hd-62', pid: 'messier_ri', h1: 'Rhode Island House District 62', where: 'District 62 as Rhode Island’s current legislative plan draws it', kick: 'House District 62 board', kickTitle: 'The district board for Rhode Island House District 62: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-63': { seat: 'ri-statehouse-63', composer: false, alias: 'ri-hd-63', route: '/district/ri-hd-63', pid: 'kazarian_ri', h1: 'Rhode Island House District 63', where: 'District 63 as Rhode Island’s current legislative plan draws it', kick: 'House District 63 board', kickTitle: 'The district board for Rhode Island House District 63: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-64': { seat: 'ri-statehouse-64', composer: false, alias: 'ri-hd-64', route: '/district/ri-hd-64', pid: 'furtado_ri', h1: 'Rhode Island House District 64', where: 'District 64 as Rhode Island’s current legislative plan draws it', kick: 'House District 64 board', kickTitle: 'The district board for Rhode Island House District 64: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-65': { seat: 'ri-statehouse-65', composer: false, alias: 'ri-hd-65', route: '/district/ri-hd-65', pid: 'dawson_ri', h1: 'Rhode Island House District 65', where: 'District 65 as Rhode Island’s current legislative plan draws it', kick: 'House District 65 board', kickTitle: 'The district board for Rhode Island House District 65: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-66': { seat: 'ri-statehouse-66', composer: false, alias: 'ri-hd-66', route: '/district/ri-hd-66', pid: 'boylan_ri', h1: 'Rhode Island House District 66', where: 'District 66 as Rhode Island’s current legislative plan draws it', kick: 'House District 66 board', kickTitle: 'The district board for Rhode Island House District 66: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-67': { seat: 'ri-statehouse-67', composer: false, alias: 'ri-hd-67', route: '/district/ri-hd-67', pid: 'knight_ri', h1: 'Rhode Island House District 67', where: 'District 67 as Rhode Island’s current legislative plan draws it', kick: 'House District 67 board', kickTitle: 'The district board for Rhode Island House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-68': { seat: 'ri-statehouse-68', composer: false, alias: 'ri-hd-68', route: '/district/ri-hd-68', pid: 'speakman_ri', h1: 'Rhode Island House District 68', where: 'District 68 as Rhode Island’s current legislative plan draws it', kick: 'House District 68 board', kickTitle: 'The district board for Rhode Island House District 68: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-69': { seat: 'ri-statehouse-69', composer: false, alias: 'ri-hd-69', route: '/district/ri-hd-69', pid: 'donovan_ri', h1: 'Rhode Island House District 69', where: 'District 69 as Rhode Island’s current legislative plan draws it', kick: 'House District 69 board', kickTitle: 'The district board for Rhode Island House District 69: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-7': { seat: 'ri-statehouse-7', composer: false, alias: 'ri-hd-7', route: '/district/ri-hd-7', pid: 'morales_ri', h1: 'Rhode Island House District 7', where: 'District 7 as Rhode Island’s current legislative plan draws it', kick: 'House District 7 board', kickTitle: 'The district board for Rhode Island House District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-70': { seat: 'ri-statehouse-70', composer: false, alias: 'ri-hd-70', route: '/district/ri-hd-70', pid: 'edwards_ri', h1: 'Rhode Island House District 70', where: 'District 70 as Rhode Island’s current legislative plan draws it', kick: 'House District 70 board', kickTitle: 'The district board for Rhode Island House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-71': { seat: 'ri-statehouse-71', composer: false, alias: 'ri-hd-71', route: '/district/ri-hd-71', pid: 'mcgaw_ri', h1: 'Rhode Island House District 71', where: 'District 71 as Rhode Island’s current legislative plan draws it', kick: 'House District 71 board', kickTitle: 'The district board for Rhode Island House District 71: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-72': { seat: 'ri-statehouse-72', composer: false, alias: 'ri-hd-72', route: '/district/ri-hd-72', pid: 'cortvriend_ri', h1: 'Rhode Island House District 72', where: 'District 72 as Rhode Island’s current legislative plan draws it', kick: 'House District 72 board', kickTitle: 'The district board for Rhode Island House District 72: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-73': { seat: 'ri-statehouse-73', composer: false, alias: 'ri-hd-73', route: '/district/ri-hd-73', pid: 'abney_ri', h1: 'Rhode Island House District 73', where: 'District 73 as Rhode Island’s current legislative plan draws it', kick: 'House District 73 board', kickTitle: 'The district board for Rhode Island House District 73: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-74': { seat: 'ri-statehouse-74', composer: false, alias: 'ri-hd-74', route: '/district/ri-hd-74', pid: 'finkelman_ri', h1: 'Rhode Island House District 74', where: 'District 74 as Rhode Island’s current legislative plan draws it', kick: 'House District 74 board', kickTitle: 'The district board for Rhode Island House District 74: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-75': { seat: 'ri-statehouse-75', composer: false, alias: 'ri-hd-75', route: '/district/ri-hd-75', pid: 'carson_ri', h1: 'Rhode Island House District 75', where: 'District 75 as Rhode Island’s current legislative plan draws it', kick: 'House District 75 board', kickTitle: 'The district board for Rhode Island House District 75: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-8': { seat: 'ri-statehouse-8', composer: false, alias: 'ri-hd-8', route: '/district/ri-hd-8', pid: 'lombardi_ri', h1: 'Rhode Island House District 8', where: 'District 8 as Rhode Island’s current legislative plan draws it', kick: 'House District 8 board', kickTitle: 'The district board for Rhode Island House District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statehouse-9': { seat: 'ri-statehouse-9', composer: false, alias: 'ri-hd-9', route: '/district/ri-hd-9', pid: 'sanchez_ri', h1: 'Rhode Island House District 9', where: 'District 9 as Rhode Island’s current legislative plan draws it', kick: 'House District 9 board', kickTitle: 'The district board for Rhode Island House District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-1': { seat: 'ri-statesenate-1', composer: false, alias: 'ri-sd-1', route: '/district/ri-sd-1', pid: 'bissaillon_ri', h1: 'Rhode Island Senate District 1', where: 'District 1 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for Rhode Island Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-10': { seat: 'ri-statesenate-10', composer: false, alias: 'ri-sd-10', route: '/district/ri-sd-10', pid: 'felag_ri', h1: 'Rhode Island Senate District 10', where: 'District 10 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for Rhode Island Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-11': { seat: 'ri-statesenate-11', composer: false, alias: 'ri-sd-11', route: '/district/ri-sd-11', pid: 'ujifusa_ri', h1: 'Rhode Island Senate District 11', where: 'District 11 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for Rhode Island Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-12': { seat: 'ri-statesenate-12', composer: false, alias: 'ri-sd-12', route: '/district/ri-sd-12', pid: 'dipalma_ri', h1: 'Rhode Island Senate District 12', where: 'District 12 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for Rhode Island Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-13': { seat: 'ri-statesenate-13', composer: false, alias: 'ri-sd-13', route: '/district/ri-sd-13', pid: 'euer_ri', h1: 'Rhode Island Senate District 13', where: 'District 13 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for Rhode Island Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-14': { seat: 'ri-statesenate-14', composer: false, alias: 'ri-sd-14', route: '/district/ri-sd-14', pid: 'lawson_ri', h1: 'Rhode Island Senate District 14', where: 'District 14 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for Rhode Island Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-15': { seat: 'ri-statesenate-15', composer: false, alias: 'ri-sd-15', route: '/district/ri-sd-15', pid: 'kallman_ri', h1: 'Rhode Island Senate District 15', where: 'District 15 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for Rhode Island Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-16': { seat: 'ri-statesenate-16', composer: false, alias: 'ri-sd-16', route: '/district/ri-sd-16', pid: 'acosta_ri', h1: 'Rhode Island Senate District 16', where: 'District 16 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for Rhode Island Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-17': { seat: 'ri-statesenate-17', composer: false, alias: 'ri-sd-17', route: '/district/ri-sd-17', pid: 'paolino_ri', h1: 'Rhode Island Senate District 17', where: 'District 17 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Rhode Island Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-18': { seat: 'ri-statesenate-18', composer: false, alias: 'ri-sd-18', route: '/district/ri-sd-18', pid: 'britto_ri', h1: 'Rhode Island Senate District 18', where: 'District 18 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for Rhode Island Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-19': { seat: 'ri-statesenate-19', composer: false, alias: 'ri-sd-19', route: '/district/ri-sd-19', pid: 'ryan_pearson', h1: 'Rhode Island Senate District 19', where: 'District 19 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Rhode Island Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-2': { seat: 'ri-statesenate-2', composer: false, alias: 'ri-sd-2', route: '/district/ri-sd-2', pid: 'quezada_ri', h1: 'Rhode Island Senate District 2', where: 'District 2 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for Rhode Island Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-20': { seat: 'ri-statesenate-20', composer: false, alias: 'ri-sd-20', route: '/district/ri-sd-20', pid: 'thompson_ri', h1: 'Rhode Island Senate District 20', where: 'District 20 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for Rhode Island Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-21': { seat: 'ri-statesenate-21', composer: false, alias: 'ri-sd-21', route: '/district/ri-sd-21', pid: 'rogers_ri', h1: 'Rhode Island Senate District 21', where: 'District 21 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Rhode Island Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-22': { seat: 'ri-statesenate-22', composer: false, alias: 'ri-sd-22', route: '/district/ri-sd-22', pid: 'tikoian_ri', h1: 'Rhode Island Senate District 22', where: 'District 22 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for Rhode Island Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-23': { seat: 'ri-statesenate-23', composer: false, alias: 'ri-sd-23', route: '/district/ri-sd-23', pid: 'jessica_de_la_cruz', h1: 'Rhode Island Senate District 23', where: 'District 23 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for Rhode Island Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-24': { seat: 'ri-statesenate-24', composer: false, alias: 'ri-sd-24', route: '/district/ri-sd-24', pid: 'murray_ri', h1: 'Rhode Island Senate District 24', where: 'District 24 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for Rhode Island Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-25': { seat: 'ri-statesenate-25', composer: false, alias: 'ri-sd-25', route: '/district/ri-sd-25', pid: 'dimitri_ri', h1: 'Rhode Island Senate District 25', where: 'District 25 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for Rhode Island Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-26': { seat: 'ri-statesenate-26', composer: false, alias: 'ri-sd-26', route: '/district/ri-sd-26', pid: 'patalano_ri', h1: 'Rhode Island Senate District 26', where: 'District 26 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Rhode Island Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-27': { seat: 'ri-statesenate-27', composer: false, alias: 'ri-sd-27', route: '/district/ri-sd-27', pid: 'gallo_ri', h1: 'Rhode Island Senate District 27', where: 'District 27 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for Rhode Island Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-28': { seat: 'ri-statesenate-28', composer: false, alias: 'ri-sd-28', route: '/district/ri-sd-28', pid: 'vargas_ri', h1: 'Rhode Island Senate District 28', where: 'District 28 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for Rhode Island Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-29': { seat: 'ri-statesenate-29', composer: false, alias: 'ri-sd-29', route: '/district/ri-sd-29', pid: 'appollonio_ri', h1: 'Rhode Island Senate District 29', where: 'District 29 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for Rhode Island Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-3': { seat: 'ri-statesenate-3', composer: false, alias: 'ri-sd-3', route: '/district/ri-sd-3', pid: 'zurier_ri', h1: 'Rhode Island Senate District 3', where: 'District 3 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for Rhode Island Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-30': { seat: 'ri-statesenate-30', composer: false, alias: 'ri-sd-30', route: '/district/ri-sd-30', pid: 'mckenney_ri', h1: 'Rhode Island Senate District 30', where: 'District 30 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for Rhode Island Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-31': { seat: 'ri-statesenate-31', composer: false, alias: 'ri-sd-31', route: '/district/ri-sd-31', pid: 'lamountain_ri', h1: 'Rhode Island Senate District 31', where: 'District 31 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Rhode Island Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-32': { seat: 'ri-statesenate-32', composer: false, alias: 'ri-sd-32', route: '/district/ri-sd-32', pid: 'lauria_ri', h1: 'Rhode Island Senate District 32', where: 'District 32 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for Rhode Island Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-33': { seat: 'ri-statesenate-33', composer: false, alias: 'ri-sd-33', route: '/district/ri-sd-33', pid: 'raptakis_ri', h1: 'Rhode Island Senate District 33', where: 'District 33 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for Rhode Island Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-34': { seat: 'ri-statesenate-34', composer: false, alias: 'ri-sd-34', route: '/district/ri-sd-34', pid: 'morgan_ri', h1: 'Rhode Island Senate District 34', where: 'District 34 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for Rhode Island Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-35': { seat: 'ri-statesenate-35', composer: false, alias: 'ri-sd-35', route: '/district/ri-sd-35', pid: 'valverde_ri', h1: 'Rhode Island Senate District 35', where: 'District 35 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Rhode Island Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-36': { seat: 'ri-statesenate-36', composer: false, alias: 'ri-sd-36', route: '/district/ri-sd-36', pid: 'dimario_ri', h1: 'Rhode Island Senate District 36', where: 'District 36 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 36 board', kickTitle: 'The district board for Rhode Island Senate District 36: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-37': { seat: 'ri-statesenate-37', composer: false, alias: 'ri-sd-37', route: '/district/ri-sd-37', pid: 'sosnowski_ri', h1: 'Rhode Island Senate District 37', where: 'District 37 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 37 board', kickTitle: 'The district board for Rhode Island Senate District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-38': { seat: 'ri-statesenate-38', composer: false, alias: 'ri-sd-38', route: '/district/ri-sd-38', pid: 'gu_ri', h1: 'Rhode Island Senate District 38', where: 'District 38 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 38 board', kickTitle: 'The district board for Rhode Island Senate District 38: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-4': { seat: 'ri-statesenate-4', composer: false, alias: 'ri-sd-4', route: '/district/ri-sd-4', pid: 'famiglietti_ri', h1: 'Rhode Island Senate District 4', where: 'District 4 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for Rhode Island Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-5': { seat: 'ri-statesenate-5', composer: false, alias: 'ri-sd-5', route: '/district/ri-sd-5', pid: 'bell_ri', h1: 'Rhode Island Senate District 5', where: 'District 5 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for Rhode Island Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-6': { seat: 'ri-statesenate-6', composer: false, alias: 'ri-sd-6', route: '/district/ri-sd-6', pid: 'mack_ri', h1: 'Rhode Island Senate District 6', where: 'District 6 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for Rhode Island Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-7': { seat: 'ri-statesenate-7', composer: false, alias: 'ri-sd-7', route: '/district/ri-sd-7', pid: 'frank_ciccone', h1: 'Rhode Island Senate District 7', where: 'District 7 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for Rhode Island Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-8': { seat: 'ri-statesenate-8', composer: false, alias: 'ri-sd-8', route: '/district/ri-sd-8', pid: 'urso_ri', h1: 'Rhode Island Senate District 8', where: 'District 8 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for Rhode Island Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'ri-statesenate-9': { seat: 'ri-statesenate-9', composer: false, alias: 'ri-sd-9', route: '/district/ri-sd-9', pid: 'burke_ri', h1: 'Rhode Island Senate District 9', where: 'District 9 as Rhode Island’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Rhode Island Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-1-p1': { seat: 'sd-statehouse-1-p1', composer: false, alias: 'sd-hd-1-p1', route: '/district/sd-hd-1-p1', pid: 'fosness_sd', h1: 'South Dakota House District 1, Seat A', where: 'District 1 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 1, Seat A board', kickTitle: 'The district board for South Dakota House District 1, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-1-p2': { seat: 'sd-statehouse-1-p2', composer: false, alias: 'sd-hd-1-p2', route: '/district/sd-hd-1-p2', pid: 'manhart_sd', h1: 'South Dakota House District 1, Seat B', where: 'District 1 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 1, Seat B board', kickTitle: 'The district board for South Dakota House District 1, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-10-p1': { seat: 'sd-statehouse-10-p1', composer: false, alias: 'sd-hd-10-p1', route: '/district/sd-hd-10-p1', pid: 'andera_sd', h1: 'South Dakota House District 10, Seat A', where: 'District 10 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 10, Seat A board', kickTitle: 'The district board for South Dakota House District 10, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-10-p2': { seat: 'sd-statehouse-10-p2', composer: false, alias: 'sd-hd-10-p2', route: '/district/sd-hd-10-p2', pid: 'healy_sd', h1: 'South Dakota House District 10, Seat B', where: 'District 10 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 10, Seat B board', kickTitle: 'The district board for South Dakota House District 10, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-11-p1': { seat: 'sd-statehouse-11-p1', composer: false, alias: 'sd-hd-11-p1', route: '/district/sd-hd-11-p1', pid: 'mulder_sd', h1: 'South Dakota House District 11, Seat A', where: 'District 11 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 11, Seat A board', kickTitle: 'The district board for South Dakota House District 11, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-11-p2': { seat: 'sd-statehouse-11-p2', composer: false, alias: 'sd-hd-11-p2', route: '/district/sd-hd-11-p2', pid: 'weems_sd', h1: 'South Dakota House District 11, Seat B', where: 'District 11 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 11, Seat B board', kickTitle: 'The district board for South Dakota House District 11, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-12-p1': { seat: 'sd-statehouse-12-p1', composer: false, alias: 'sd-hd-12-p1', route: '/district/sd-hd-12-p1', pid: 'arlint_sd', h1: 'South Dakota House District 12, Seat A', where: 'District 12 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 12, Seat A board', kickTitle: 'The district board for South Dakota House District 12, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-12-p2': { seat: 'sd-statehouse-12-p2', composer: false, alias: 'sd-hd-12-p2', route: '/district/sd-hd-12-p2', pid: 'jamison_sd', h1: 'South Dakota House District 12, Seat B', where: 'District 12 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 12, Seat B board', kickTitle: 'The district board for South Dakota House District 12, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-13-p1': { seat: 'sd-statehouse-13-p1', composer: false, alias: 'sd-hd-13-p1', route: '/district/sd-hd-13-p1', pid: 'hughes_sd', h1: 'South Dakota House District 13, Seat A', where: 'District 13 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 13, Seat A board', kickTitle: 'The district board for South Dakota House District 13, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-13-p2': { seat: 'sd-statehouse-13-p2', composer: false, alias: 'sd-hd-13-p2', route: '/district/sd-hd-13-p2', pid: 'kolbeck_sd', h1: 'South Dakota House District 13, Seat B', where: 'District 13 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 13, Seat B board', kickTitle: 'The district board for South Dakota House District 13, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-14-p1': { seat: 'sd-statehouse-14-p1', composer: false, alias: 'sd-hd-14-p1', route: '/district/sd-hd-14-p1', pid: 'kayser_sd', h1: 'South Dakota House District 14, Seat A', where: 'District 14 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 14, Seat A board', kickTitle: 'The district board for South Dakota House District 14, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-14-p2': { seat: 'sd-statehouse-14-p2', composer: false, alias: 'sd-hd-14-p2', route: '/district/sd-hd-14-p2', pid: 'rehfeldt_sd', h1: 'South Dakota House District 14, Seat B', where: 'District 14 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 14, Seat B board', kickTitle: 'The district board for South Dakota House District 14, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-15-p1': { seat: 'sd-statehouse-15-p1', composer: false, alias: 'sd-hd-15-p1', route: '/district/sd-hd-15-p1', pid: 'muckey_sd', h1: 'South Dakota House District 15, Seat A', where: 'District 15 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 15, Seat A board', kickTitle: 'The district board for South Dakota House District 15, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-15-p2': { seat: 'sd-statehouse-15-p2', composer: false, alias: 'sd-hd-15-p2', route: '/district/sd-hd-15-p2', pid: 'wittman_sd', h1: 'South Dakota House District 15, Seat B', where: 'District 15 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 15, Seat B board', kickTitle: 'The district board for South Dakota House District 15, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-16-p1': { seat: 'sd-statehouse-16-p1', composer: false, alias: 'sd-hd-16-p1', route: '/district/sd-hd-16-p1', pid: 'lems_sd', h1: 'South Dakota House District 16, Seat A', where: 'District 16 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 16, Seat A board', kickTitle: 'The district board for South Dakota House District 16, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-16-p2': { seat: 'sd-statehouse-16-p2', composer: false, alias: 'sd-hd-16-p2', route: '/district/sd-hd-16-p2', pid: 'shubeck_sd', h1: 'South Dakota House District 16, Seat B', where: 'District 16 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 16, Seat B board', kickTitle: 'The district board for South Dakota House District 16, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-17-p1': { seat: 'sd-statehouse-17-p1', composer: false, alias: 'sd-hd-17-p1', route: '/district/sd-hd-17-p1', pid: 'kassin_sd', h1: 'South Dakota House District 17, Seat A', where: 'District 17 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 17, Seat A board', kickTitle: 'The district board for South Dakota House District 17, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-17-p2': { seat: 'sd-statehouse-17-p2', composer: false, alias: 'sd-hd-17-p2', route: '/district/sd-hd-17-p2', pid: 'shorma_sd', h1: 'South Dakota House District 17, Seat B', where: 'District 17 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 17, Seat B board', kickTitle: 'The district board for South Dakota House District 17, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-18-p1': { seat: 'sd-statehouse-18-p1', composer: false, alias: 'sd-hd-18-p1', route: '/district/sd-hd-18-p1', pid: 'auch_sd', h1: 'South Dakota House District 18, Seat A', where: 'District 18 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 18, Seat A board', kickTitle: 'The district board for South Dakota House District 18, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-18-p2': { seat: 'sd-statehouse-18-p2', composer: false, alias: 'sd-hd-18-p2', route: '/district/sd-hd-18-p2', pid: 'stevens_sd', h1: 'South Dakota House District 18, Seat B', where: 'District 18 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 18, Seat B board', kickTitle: 'The district board for South Dakota House District 18, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-19-p1': { seat: 'sd-statehouse-19-p1', composer: false, alias: 'sd-hd-19-p1', route: '/district/sd-hd-19-p1', pid: 'bahmuller_sd', h1: 'South Dakota House District 19, Seat A', where: 'District 19 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 19, Seat A board', kickTitle: 'The district board for South Dakota House District 19, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-19-p2': { seat: 'sd-statehouse-19-p2', composer: false, alias: 'sd-hd-19-p2', route: '/district/sd-hd-19-p2', pid: 'peterson_sd', h1: 'South Dakota House District 19, Seat B', where: 'District 19 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 19, Seat B board', kickTitle: 'The district board for South Dakota House District 19, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-2-p1': { seat: 'sd-statehouse-2-p1', composer: false, alias: 'sd-hd-2-p1', route: '/district/sd-hd-2-p1', pid: 'kull_sd', h1: 'South Dakota House District 2, Seat A', where: 'District 2 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 2, Seat A board', kickTitle: 'The district board for South Dakota House District 2, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-2-p2': { seat: 'sd-statehouse-2-p2', composer: false, alias: 'sd-hd-2-p2', route: '/district/sd-hd-2-p2', pid: 'sjaarda_sd', h1: 'South Dakota House District 2, Seat B', where: 'District 2 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 2, Seat B board', kickTitle: 'The district board for South Dakota House District 2, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-20-p1': { seat: 'sd-statehouse-20-p1', composer: false, alias: 'sd-hd-20-p1', route: '/district/sd-hd-20-p1', pid: 'bathke_sd', h1: 'South Dakota House District 20, Seat A', where: 'District 20 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 20, Seat A board', kickTitle: 'The district board for South Dakota House District 20, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-20-p2': { seat: 'sd-statehouse-20-p2', composer: false, alias: 'sd-hd-20-p2', route: '/district/sd-hd-20-p2', pid: 'nolz_sd', h1: 'South Dakota House District 20, Seat B', where: 'District 20 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 20, Seat B board', kickTitle: 'The district board for South Dakota House District 20, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-21-p1': { seat: 'sd-statehouse-21-p1', composer: false, alias: 'sd-hd-21-p1', route: '/district/sd-hd-21-p1', pid: 'halverson_sd', h1: 'South Dakota House District 21, Seat A', where: 'District 21 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 21, Seat A board', kickTitle: 'The district board for South Dakota House District 21, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-21-p2': { seat: 'sd-statehouse-21-p2', composer: false, alias: 'sd-hd-21-p2', route: '/district/sd-hd-21-p2', pid: 'overweg_sd', h1: 'South Dakota House District 21, Seat B', where: 'District 21 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 21, Seat B board', kickTitle: 'The district board for South Dakota House District 21, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-22-p1': { seat: 'sd-statehouse-22-p1', composer: false, alias: 'sd-hd-22-p1', route: '/district/sd-hd-22-p1', pid: 'greenfield_sd', h1: 'South Dakota House District 22, Seat A', where: 'District 22 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 22, Seat A board', kickTitle: 'The district board for South Dakota House District 22, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-22-p2': { seat: 'sd-statehouse-22-p2', composer: false, alias: 'sd-hd-22-p2', route: '/district/sd-hd-22-p2', pid: 'van_diepen_sd', h1: 'South Dakota House District 22, Seat B', where: 'District 22 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 22, Seat B board', kickTitle: 'The district board for South Dakota House District 22, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-23-p1': { seat: 'sd-statehouse-23-p1', composer: false, alias: 'sd-hd-23-p1', route: '/district/sd-hd-23-p1', pid: 'gosch_sd', h1: 'South Dakota House District 23, Seat A', where: 'District 23 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 23, Seat A board', kickTitle: 'The district board for South Dakota House District 23, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-23-p2': { seat: 'sd-statehouse-23-p2', composer: false, alias: 'sd-hd-23-p2', route: '/district/sd-hd-23-p2', pid: 'moore_sd', h1: 'South Dakota House District 23, Seat B', where: 'District 23 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 23, Seat B board', kickTitle: 'The district board for South Dakota House District 23, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-24-p1': { seat: 'sd-statehouse-24-p1', composer: false, alias: 'sd-hd-24-p1', route: '/district/sd-hd-24-p1', pid: 'mortenson_sd', h1: 'South Dakota House District 24, Seat A', where: 'District 24 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 24, Seat A board', kickTitle: 'The district board for South Dakota House District 24, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-24-p2': { seat: 'sd-statehouse-24-p2', composer: false, alias: 'sd-hd-24-p2', route: '/district/sd-hd-24-p2', pid: 'weisgram_sd', h1: 'South Dakota House District 24, Seat B', where: 'District 24 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 24, Seat B board', kickTitle: 'The district board for South Dakota House District 24, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-25-p1': { seat: 'sd-statehouse-25-p1', composer: false, alias: 'sd-hd-25-p1', route: '/district/sd-hd-25-p1', pid: 'hansen_sd', h1: 'South Dakota House District 25, Seat A', where: 'District 25 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 25, Seat A board', kickTitle: 'The district board for South Dakota House District 25, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-25-p2': { seat: 'sd-statehouse-25-p2', composer: false, alias: 'sd-hd-25-p2', route: '/district/sd-hd-25-p2', pid: 'heinemann_sd', h1: 'South Dakota House District 25, Seat B', where: 'District 25 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 25, Seat B board', kickTitle: 'The district board for South Dakota House District 25, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-34': { seat: 'sd-statehouse-34', composer: false, alias: 'sd-hd-34', route: '/district/sd-hd-34', pid: 'emery_sd', h1: 'South Dakota House District 26A', where: 'District 26A as South Dakota’s current legislative plan draws it', kick: 'House District 26A board', kickTitle: 'The district board for South Dakota House District 26A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-35': { seat: 'sd-statehouse-35', composer: false, alias: 'sd-hd-35', route: '/district/sd-hd-35', pid: 'reimer_sd', h1: 'South Dakota House District 26B', where: 'District 26B as South Dakota’s current legislative plan draws it', kick: 'House District 26B board', kickTitle: 'The district board for South Dakota House District 26B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-26-p1': { seat: 'sd-statehouse-26-p1', composer: false, alias: 'sd-hd-26-p1', route: '/district/sd-hd-26-p1', pid: 'may_sd', h1: 'South Dakota House District 27, Seat A', where: 'District 27 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 27, Seat A board', kickTitle: 'The district board for South Dakota House District 27, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-26-p2': { seat: 'sd-statehouse-26-p2', composer: false, alias: 'sd-hd-26-p2', route: '/district/sd-hd-26-p2', pid: 'pourier_sd', h1: 'South Dakota House District 27, Seat B', where: 'District 27 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 27, Seat B board', kickTitle: 'The district board for South Dakota House District 27, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-36': { seat: 'sd-statehouse-36', composer: false, alias: 'sd-hd-36', route: '/district/sd-hd-36', pid: 'hunt_sd', h1: 'South Dakota House District 28A', where: 'District 28A as South Dakota’s current legislative plan draws it', kick: 'House District 28A board', kickTitle: 'The district board for South Dakota House District 28A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-37': { seat: 'sd-statehouse-37', composer: false, alias: 'sd-hd-37', route: '/district/sd-hd-37', pid: 'ismay_sd', h1: 'South Dakota House District 28B', where: 'District 28B as South Dakota’s current legislative plan draws it', kick: 'House District 28B board', kickTitle: 'The district board for South Dakota House District 28B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-27-p1': { seat: 'sd-statehouse-27-p1', composer: false, alias: 'sd-hd-27-p1', route: '/district/sd-hd-27-p1', pid: 'jorgenson_sd', h1: 'South Dakota House District 29, Seat A', where: 'District 29 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 29, Seat A board', kickTitle: 'The district board for South Dakota House District 29, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-27-p2': { seat: 'sd-statehouse-27-p2', composer: false, alias: 'sd-hd-27-p2', route: '/district/sd-hd-27-p2', pid: 'rice_sd', h1: 'South Dakota House District 29, Seat B', where: 'District 29 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 29, Seat B board', kickTitle: 'The district board for South Dakota House District 29, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-3-p1': { seat: 'sd-statehouse-3-p1', composer: false, alias: 'sd-hd-3-p1', route: '/district/sd-hd-3-p1', pid: 'novstrup_sd', h1: 'South Dakota House District 3, Seat A', where: 'District 3 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 3, Seat A board', kickTitle: 'The district board for South Dakota House District 3, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-3-p2': { seat: 'sd-statehouse-3-p2', composer: false, alias: 'sd-hd-3-p2', route: '/district/sd-hd-3-p2', pid: 'schaefbauer_sd', h1: 'South Dakota House District 3, Seat B', where: 'District 3 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 3, Seat B board', kickTitle: 'The district board for South Dakota House District 3, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-28-p1': { seat: 'sd-statehouse-28-p1', composer: false, alias: 'sd-hd-28-p1', route: '/district/sd-hd-28-p1', pid: 'goodwin_sd', h1: 'South Dakota House District 30, Seat A', where: 'District 30 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 30, Seat A board', kickTitle: 'The district board for South Dakota House District 30, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-28-p2': { seat: 'sd-statehouse-28-p2', composer: false, alias: 'sd-hd-28-p2', route: '/district/sd-hd-28-p2', pid: 'ladner_sd', h1: 'South Dakota House District 30, Seat B', where: 'District 30 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 30, Seat B board', kickTitle: 'The district board for South Dakota House District 30, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-29-p1': { seat: 'sd-statehouse-29-p1', composer: false, alias: 'sd-hd-29-p1', route: '/district/sd-hd-29-p1', pid: 'fitzgerald_sd', h1: 'South Dakota House District 31, Seat A', where: 'District 31 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 31, Seat A board', kickTitle: 'The district board for South Dakota House District 31, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-29-p2': { seat: 'sd-statehouse-29-p2', composer: false, alias: 'sd-hd-29-p2', route: '/district/sd-hd-29-p2', pid: 'odenbach_sd', h1: 'South Dakota House District 31, Seat B', where: 'District 31 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 31, Seat B board', kickTitle: 'The district board for South Dakota House District 31, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-30-p1': { seat: 'sd-statehouse-30-p1', composer: false, alias: 'sd-hd-30-p1', route: '/district/sd-hd-30-p1', pid: 'duffy_sd', h1: 'South Dakota House District 32, Seat A', where: 'District 32 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 32, Seat A board', kickTitle: 'The district board for South Dakota House District 32, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-30-p2': { seat: 'sd-statehouse-30-p2', composer: false, alias: 'sd-hd-30-p2', route: '/district/sd-hd-30-p2', pid: 'uhre_balk_sd', h1: 'South Dakota House District 32, Seat B', where: 'District 32 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 32, Seat B board', kickTitle: 'The district board for South Dakota House District 32, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-31-p1': { seat: 'sd-statehouse-31-p1', composer: false, alias: 'sd-hd-31-p1', route: '/district/sd-hd-31-p1', pid: 'jensen_sd', h1: 'South Dakota House District 33, Seat A', where: 'District 33 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 33, Seat A board', kickTitle: 'The district board for South Dakota House District 33, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-31-p2': { seat: 'sd-statehouse-31-p2', composer: false, alias: 'sd-hd-31-p2', route: '/district/sd-hd-31-p2', pid: 'massie_sd', h1: 'South Dakota House District 33, Seat B', where: 'District 33 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 33, Seat B board', kickTitle: 'The district board for South Dakota House District 33, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-32-p1': { seat: 'sd-statehouse-32-p1', composer: false, alias: 'sd-hd-32-p1', route: '/district/sd-hd-32-p1', pid: 'baxter_sd', h1: 'South Dakota House District 34, Seat A', where: 'District 34 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 34, Seat A board', kickTitle: 'The district board for South Dakota House District 34, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-32-p2': { seat: 'sd-statehouse-32-p2', composer: false, alias: 'sd-hd-32-p2', route: '/district/sd-hd-32-p2', pid: 'derby_sd', h1: 'South Dakota House District 34, Seat B', where: 'District 34 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 34, Seat B board', kickTitle: 'The district board for South Dakota House District 34, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-33-p1': { seat: 'sd-statehouse-33-p1', composer: false, alias: 'sd-hd-33-p1', route: '/district/sd-hd-33-p1', pid: 'mulally_sd', h1: 'South Dakota House District 35, Seat A', where: 'District 35 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 35, Seat A board', kickTitle: 'The district board for South Dakota House District 35, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-33-p2': { seat: 'sd-statehouse-33-p2', composer: false, alias: 'sd-hd-33-p2', route: '/district/sd-hd-33-p2', pid: 'randolph_sd', h1: 'South Dakota House District 35, Seat B', where: 'District 35 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 35, Seat B board', kickTitle: 'The district board for South Dakota House District 35, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-4-p1': { seat: 'sd-statehouse-4-p1', composer: false, alias: 'sd-hd-4-p1', route: '/district/sd-hd-4-p1', pid: 'jordan_sd', h1: 'South Dakota House District 4, Seat A', where: 'District 4 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 4, Seat A board', kickTitle: 'The district board for South Dakota House District 4, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-4-p2': { seat: 'sd-statehouse-4-p2', composer: false, alias: 'sd-hd-4-p2', route: '/district/sd-hd-4-p2', pid: 'roe_sd', h1: 'South Dakota House District 4, Seat B', where: 'District 4 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 4, Seat B board', kickTitle: 'The district board for South Dakota House District 4, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-5-p1': { seat: 'sd-statehouse-5-p1', composer: false, alias: 'sd-hd-5-p1', route: '/district/sd-hd-5-p1', pid: 'garcia_sd', h1: 'South Dakota House District 5, Seat A', where: 'District 5 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 5, Seat A board', kickTitle: 'The district board for South Dakota House District 5, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-5-p2': { seat: 'sd-statehouse-5-p2', composer: false, alias: 'sd-hd-5-p2', route: '/district/sd-hd-5-p2', pid: 'roby_sd', h1: 'South Dakota House District 5, Seat B', where: 'District 5 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 5, Seat B board', kickTitle: 'The district board for South Dakota House District 5, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-6-p1': { seat: 'sd-statehouse-6-p1', composer: false, alias: 'sd-hd-6-p1', route: '/district/sd-hd-6-p1', pid: 'aylward_sd', h1: 'South Dakota House District 6, Seat A', where: 'District 6 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 6, Seat A board', kickTitle: 'The district board for South Dakota House District 6, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-6-p2': { seat: 'sd-statehouse-6-p2', composer: false, alias: 'sd-hd-6-p2', route: '/district/sd-hd-6-p2', pid: 'czmowski_sd', h1: 'South Dakota House District 6, Seat B', where: 'District 6 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 6, Seat B board', kickTitle: 'The district board for South Dakota House District 6, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-7-p1': { seat: 'sd-statehouse-7-p1', composer: false, alias: 'sd-hd-7-p1', route: '/district/sd-hd-7-p1', pid: 'degroot_sd', h1: 'South Dakota House District 7, Seat A', where: 'District 7 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 7, Seat A board', kickTitle: 'The district board for South Dakota House District 7, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-7-p2': { seat: 'sd-statehouse-7-p2', composer: false, alias: 'sd-hd-7-p2', route: '/district/sd-hd-7-p2', pid: 'heermann_sd', h1: 'South Dakota House District 7, Seat B', where: 'District 7 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 7, Seat B board', kickTitle: 'The district board for South Dakota House District 7, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-8-p1': { seat: 'sd-statehouse-8-p1', composer: false, alias: 'sd-hd-8-p1', route: '/district/sd-hd-8-p1', pid: 'reisch_sd', h1: 'South Dakota House District 8, Seat A', where: 'District 8 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 8, Seat A board', kickTitle: 'The district board for South Dakota House District 8, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-8-p2': { seat: 'sd-statehouse-8-p2', composer: false, alias: 'sd-hd-8-p2', route: '/district/sd-hd-8-p2', pid: 'walburg_sd', h1: 'South Dakota House District 8, Seat B', where: 'District 8 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 8, Seat B board', kickTitle: 'The district board for South Dakota House District 8, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-9-p1': { seat: 'sd-statehouse-9-p1', composer: false, alias: 'sd-hd-9-p1', route: '/district/sd-hd-9-p1', pid: 'schwans_sd', h1: 'South Dakota House District 9, Seat A', where: 'District 9 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat A” is PolitiDex’s label, not the state’s', kick: 'House District 9, Seat A board', kickTitle: 'The district board for South Dakota House District 9, Seat A: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statehouse-9-p2': { seat: 'sd-statehouse-9-p2', composer: false, alias: 'sd-hd-9-p2', route: '/district/sd-hd-9-p2', pid: 'soye_sd', h1: 'South Dakota House District 9, Seat B', where: 'District 9 as South Dakota’s current legislative plan draws it · one of two members it elects at large; “Seat B” is PolitiDex’s label, not the state’s', kick: 'House District 9, Seat B board', kickTitle: 'The district board for South Dakota House District 9, Seat B: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-1': { seat: 'sd-statesenate-1', composer: false, alias: 'sd-sd-1', route: '/district/sd-sd-1', pid: 'rohl_sd', h1: 'South Dakota Senate District 1', where: 'District 1 as South Dakota’s current legislative plan draws it', kick: 'Senate District 1 board', kickTitle: 'The district board for South Dakota Senate District 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-10': { seat: 'sd-statesenate-10', composer: false, alias: 'sd-sd-10', route: '/district/sd-sd-10', pid: 'liz_larson', h1: 'South Dakota Senate District 10', where: 'District 10 as South Dakota’s current legislative plan draws it', kick: 'Senate District 10 board', kickTitle: 'The district board for South Dakota Senate District 10: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-11': { seat: 'sd-statesenate-11', composer: false, alias: 'sd-sd-11', route: '/district/sd-sd-11', pid: 'chris_karr', h1: 'South Dakota Senate District 11', where: 'District 11 as South Dakota’s current legislative plan draws it', kick: 'Senate District 11 board', kickTitle: 'The district board for South Dakota Senate District 11: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-12': { seat: 'sd-statesenate-12', composer: false, alias: 'sd-sd-12', route: '/district/sd-sd-12', pid: 'beal_sd', h1: 'South Dakota Senate District 12', where: 'District 12 as South Dakota’s current legislative plan draws it', kick: 'Senate District 12 board', kickTitle: 'The district board for South Dakota Senate District 12: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-13': { seat: 'sd-statesenate-13', composer: false, alias: 'sd-sd-13', route: '/district/sd-sd-13', pid: 'sue_peterson_sd', h1: 'South Dakota Senate District 13', where: 'District 13 as South Dakota’s current legislative plan draws it', kick: 'Senate District 13 board', kickTitle: 'The district board for South Dakota Senate District 13: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-14': { seat: 'sd-statesenate-14', composer: false, alias: 'sd-sd-14', route: '/district/sd-sd-14', pid: 'zikmund_sd', h1: 'South Dakota Senate District 14', where: 'District 14 as South Dakota’s current legislative plan draws it', kick: 'Senate District 14 board', kickTitle: 'The district board for South Dakota Senate District 14: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-15': { seat: 'sd-statesenate-15', composer: false, alias: 'sd-sd-15', route: '/district/sd-sd-15', pid: 'smith_sd', h1: 'South Dakota Senate District 15', where: 'District 15 as South Dakota’s current legislative plan draws it', kick: 'Senate District 15 board', kickTitle: 'The district board for South Dakota Senate District 15: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-16': { seat: 'sd-statesenate-16', composer: false, alias: 'sd-sd-16', route: '/district/sd-sd-16', pid: 'kevin_jensen_sd', h1: 'South Dakota Senate District 16', where: 'District 16 as South Dakota’s current legislative plan draws it', kick: 'Senate District 16 board', kickTitle: 'The district board for South Dakota Senate District 16: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-17': { seat: 'sd-statesenate-17', composer: false, alias: 'sd-sd-17', route: '/district/sd-sd-17', pid: 'davis_sd', h1: 'South Dakota Senate District 17', where: 'District 17 as South Dakota’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for South Dakota Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-18': { seat: 'sd-statesenate-18', composer: false, alias: 'sd-sd-18', route: '/district/sd-sd-18', pid: 'nelson_sd', h1: 'South Dakota Senate District 18', where: 'District 18 as South Dakota’s current legislative plan draws it', kick: 'Senate District 18 board', kickTitle: 'The district board for South Dakota Senate District 18: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-19': { seat: 'sd-statesenate-19', composer: false, alias: 'sd-sd-19', route: '/district/sd-sd-19', pid: 'schoenfish_sd', h1: 'South Dakota Senate District 19', where: 'District 19 as South Dakota’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for South Dakota Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-2': { seat: 'sd-statesenate-2', composer: false, alias: 'sd-sd-2', route: '/district/sd-sd-2', pid: 'steve_kolbeck_sd', h1: 'South Dakota Senate District 2', where: 'District 2 as South Dakota’s current legislative plan draws it', kick: 'Senate District 2 board', kickTitle: 'The district board for South Dakota Senate District 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-20': { seat: 'sd-statesenate-20', composer: false, alias: 'sd-sd-20', route: '/district/sd-sd-20', pid: 'miskimins_sd', h1: 'South Dakota Senate District 20', where: 'District 20 as South Dakota’s current legislative plan draws it', kick: 'Senate District 20 board', kickTitle: 'The district board for South Dakota Senate District 20: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-21': { seat: 'sd-statesenate-21', composer: false, alias: 'sd-sd-21', route: '/district/sd-sd-21', pid: 'voita_sd', h1: 'South Dakota Senate District 21', where: 'District 21 as South Dakota’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for South Dakota Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-22': { seat: 'sd-statesenate-22', composer: false, alias: 'sd-sd-22', route: '/district/sd-sd-22', pid: 'wipf_sd', h1: 'South Dakota Senate District 22', where: 'District 22 as South Dakota’s current legislative plan draws it', kick: 'Senate District 22 board', kickTitle: 'The district board for South Dakota Senate District 22: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-23': { seat: 'sd-statesenate-23', composer: false, alias: 'sd-sd-23', route: '/district/sd-sd-23', pid: 'lapka_sd', h1: 'South Dakota Senate District 23', where: 'District 23 as South Dakota’s current legislative plan draws it', kick: 'Senate District 23 board', kickTitle: 'The district board for South Dakota Senate District 23: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-24': { seat: 'sd-statesenate-24', composer: false, alias: 'sd-sd-24', route: '/district/sd-sd-24', pid: 'jim_mehlhaff', h1: 'South Dakota Senate District 24', where: 'District 24 as South Dakota’s current legislative plan draws it', kick: 'Senate District 24 board', kickTitle: 'The district board for South Dakota Senate District 24: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-25': { seat: 'sd-statesenate-25', composer: false, alias: 'sd-sd-25', route: '/district/sd-sd-25', pid: 'pischke_sd', h1: 'South Dakota Senate District 25', where: 'District 25 as South Dakota’s current legislative plan draws it', kick: 'Senate District 25 board', kickTitle: 'The district board for South Dakota Senate District 25: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-26': { seat: 'sd-statesenate-26', composer: false, alias: 'sd-sd-26', route: '/district/sd-sd-26', pid: 'grove_sd', h1: 'South Dakota Senate District 26', where: 'District 26 as South Dakota’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for South Dakota Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-27': { seat: 'sd-statesenate-27', composer: false, alias: 'sd-sd-27', route: '/district/sd-sd-27', pid: 'foster_sd', h1: 'South Dakota Senate District 27', where: 'District 27 as South Dakota’s current legislative plan draws it', kick: 'Senate District 27 board', kickTitle: 'The district board for South Dakota Senate District 27: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-28': { seat: 'sd-statesenate-28', composer: false, alias: 'sd-sd-28', route: '/district/sd-sd-28', pid: 'marty_sd', h1: 'South Dakota Senate District 28', where: 'District 28 as South Dakota’s current legislative plan draws it', kick: 'Senate District 28 board', kickTitle: 'The district board for South Dakota Senate District 28: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-29': { seat: 'sd-statesenate-29', composer: false, alias: 'sd-sd-29', route: '/district/sd-sd-29', pid: 'carley_sd', h1: 'South Dakota Senate District 29', where: 'District 29 as South Dakota’s current legislative plan draws it', kick: 'Senate District 29 board', kickTitle: 'The district board for South Dakota Senate District 29: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-3': { seat: 'sd-statesenate-3', composer: false, alias: 'sd-sd-3', route: '/district/sd-sd-3', pid: 'perry_sd', h1: 'South Dakota Senate District 3', where: 'District 3 as South Dakota’s current legislative plan draws it', kick: 'Senate District 3 board', kickTitle: 'The district board for South Dakota Senate District 3: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-30': { seat: 'sd-statesenate-30', composer: false, alias: 'sd-sd-30', route: '/district/sd-sd-30', pid: 'hulse_sd', h1: 'South Dakota Senate District 30', where: 'District 30 as South Dakota’s current legislative plan draws it', kick: 'Senate District 30 board', kickTitle: 'The district board for South Dakota Senate District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-31': { seat: 'sd-statesenate-31', composer: false, alias: 'sd-sd-31', route: '/district/sd-sd-31', pid: 'deibert_sd', h1: 'South Dakota Senate District 31', where: 'District 31 as South Dakota’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for South Dakota Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-32': { seat: 'sd-statesenate-32', composer: false, alias: 'sd-sd-32', route: '/district/sd-sd-32', pid: 'duhamel_sd', h1: 'South Dakota Senate District 32', where: 'District 32 as South Dakota’s current legislative plan draws it', kick: 'Senate District 32 board', kickTitle: 'The district board for South Dakota Senate District 32: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-33': { seat: 'sd-statesenate-33', composer: false, alias: 'sd-sd-33', route: '/district/sd-sd-33', pid: 'voight_sd', h1: 'South Dakota Senate District 33', where: 'District 33 as South Dakota’s current legislative plan draws it', kick: 'Senate District 33 board', kickTitle: 'The district board for South Dakota Senate District 33: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-34': { seat: 'sd-statesenate-34', composer: false, alias: 'sd-sd-34', route: '/district/sd-sd-34', pid: 'howard_sd', h1: 'South Dakota Senate District 34', where: 'District 34 as South Dakota’s current legislative plan draws it', kick: 'Senate District 34 board', kickTitle: 'The district board for South Dakota Senate District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-35': { seat: 'sd-statesenate-35', composer: false, alias: 'sd-sd-35', route: '/district/sd-sd-35', pid: 'blanc_sd', h1: 'South Dakota Senate District 35', where: 'District 35 as South Dakota’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for South Dakota Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-4': { seat: 'sd-statesenate-4', composer: false, alias: 'sd-sd-4', route: '/district/sd-sd-4', pid: 'sauder_sd', h1: 'South Dakota Senate District 4', where: 'District 4 as South Dakota’s current legislative plan draws it', kick: 'Senate District 4 board', kickTitle: 'The district board for South Dakota Senate District 4: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-5': { seat: 'sd-statesenate-5', composer: false, alias: 'sd-sd-5', route: '/district/sd-sd-5', pid: 'vilhauer_sd', h1: 'South Dakota Senate District 5', where: 'District 5 as South Dakota’s current legislative plan draws it', kick: 'Senate District 5 board', kickTitle: 'The district board for South Dakota Senate District 5: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-6': { seat: 'sd-statesenate-6', composer: false, alias: 'sd-sd-6', route: '/district/sd-sd-6', pid: 'otten_sd', h1: 'South Dakota Senate District 6', where: 'District 6 as South Dakota’s current legislative plan draws it', kick: 'Senate District 6 board', kickTitle: 'The district board for South Dakota Senate District 6: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-7': { seat: 'sd-statesenate-7', composer: false, alias: 'sd-sd-7', route: '/district/sd-sd-7', pid: 'reed_sd', h1: 'South Dakota Senate District 7', where: 'District 7 as South Dakota’s current legislative plan draws it', kick: 'Senate District 7 board', kickTitle: 'The district board for South Dakota Senate District 7: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-8': { seat: 'sd-statesenate-8', composer: false, alias: 'sd-sd-8', route: '/district/sd-sd-8', pid: 'crabtree_sd', h1: 'South Dakota Senate District 8', where: 'District 8 as South Dakota’s current legislative plan draws it', kick: 'Senate District 8 board', kickTitle: 'The district board for South Dakota Senate District 8: who is in the room and what is on the table. A place, not a scorecard.' },
    'sd-statesenate-9': { seat: 'sd-statesenate-9', composer: false, alias: 'sd-sd-9', route: '/district/sd-sd-9', pid: 'hohn_sd', h1: 'South Dakota Senate District 9', where: 'District 9 as South Dakota’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for South Dakota Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statesenate-19': { seat: 'tx-statesenate-19', composer: true, alias: 'tx-sd-19', route: '/district/tx-sd-19', pid: 'gutierrez_tx', h1: 'Texas Senate District 19', where: 'District 19 as Texas’s current legislative plan draws it', kick: 'Senate District 19 board', kickTitle: 'The district board for Texas Senate District 19: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-34': { seat: 'tx-statehouse-34', composer: true, alias: 'tx-hd-34', route: '/district/tx-hd-34', pid: 'villalobos_tx', h1: 'Texas House District 34', where: 'District 34 as Texas’s current legislative plan draws it', kick: 'House District 34 board', kickTitle: 'The district board for Texas House District 34: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-37': { seat: 'tx-statehouse-37', composer: true, alias: 'tx-hd-37', route: '/district/tx-hd-37', pid: 'janie_lopez_tx', h1: 'Texas House District 37', where: 'District 37 as Texas’s current legislative plan draws it', kick: 'House District 37 board', kickTitle: 'The district board for Texas House District 37: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-52': { seat: 'tx-statehouse-52', composer: true, alias: 'tx-hd-52', route: '/district/tx-hd-52', pid: 'harris_davila_tx', h1: 'Texas House District 52', where: 'District 52 as Texas’s current legislative plan draws it', kick: 'House District 52 board', kickTitle: 'The district board for Texas House District 52: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-61': { seat: 'tx-statehouse-61', composer: true, alias: 'tx-hd-61', route: '/district/tx-hd-61', pid: 'richardson_tx', h1: 'Texas House District 61', where: 'District 61 as Texas’s current legislative plan draws it', kick: 'House District 61 board', kickTitle: 'The district board for Texas House District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-67': { seat: 'tx-statehouse-67', composer: true, alias: 'tx-hd-67', route: '/district/tx-hd-67', pid: 'leach_tx', h1: 'Texas House District 67', where: 'District 67 as Texas’s current legislative plan draws it', kick: 'House District 67 board', kickTitle: 'The district board for Texas House District 67: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-70': { seat: 'tx-statehouse-70', composer: true, alias: 'tx-hd-70', route: '/district/tx-hd-70', pid: 'plesa_tx', h1: 'Texas House District 70', where: 'District 70 as Texas’s current legislative plan draws it', kick: 'House District 70 board', kickTitle: 'The district board for Texas House District 70: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-74': { seat: 'tx-statehouse-74', composer: true, alias: 'tx-hd-74', route: '/district/tx-hd-74', pid: 'eddie_morales_tx', h1: 'Texas House District 74', where: 'District 74 as Texas’s current legislative plan draws it', kick: 'House District 74 board', kickTitle: 'The district board for Texas House District 74: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-108': { seat: 'tx-statehouse-108', composer: true, alias: 'tx-hd-108', route: '/district/tx-hd-108', pid: 'meyer_tx', h1: 'Texas House District 108', where: 'District 108 as Texas’s current legislative plan draws it', kick: 'House District 108 board', kickTitle: 'The district board for Texas House District 108: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-112': { seat: 'tx-statehouse-112', composer: true, alias: 'tx-hd-112', route: '/district/tx-hd-112', pid: 'button_tx', h1: 'Texas House District 112', where: 'District 112 as Texas’s current legislative plan draws it', kick: 'House District 112 board', kickTitle: 'The district board for Texas House District 112: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-121': { seat: 'tx-statehouse-121', composer: true, alias: 'tx-hd-121', route: '/district/tx-hd-121', pid: 'lahood_tx', h1: 'Texas House District 121', where: 'District 121 as Texas’s current legislative plan draws it', kick: 'House District 121 board', kickTitle: 'The district board for Texas House District 121: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statehouse-138': { seat: 'tx-statehouse-138', composer: true, alias: 'tx-hd-138', route: '/district/tx-hd-138', pid: 'hull_tx', h1: 'Texas House District 138', where: 'District 138 as Texas’s current legislative plan draws it', kick: 'House District 138 board', kickTitle: 'The district board for Texas House District 138: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statesenate-9': { seat: 'tx-statesenate-9', composer: true, alias: 'tx-sd-9', route: '/district/tx-sd-9', pid: 'rehmet_tx', h1: 'Texas Senate District 9', where: 'District 9 as Texas’s current legislative plan draws it', kick: 'Senate District 9 board', kickTitle: 'The district board for Texas Senate District 9: who is in the room and what is on the table. A place, not a scorecard.' },
    'tx-statesenate-21': { seat: 'tx-statesenate-21', composer: true, alias: 'tx-sd-21', route: '/district/tx-sd-21', pid: 'zaffirini_tx', h1: 'Texas Senate District 21', where: 'District 21 as Texas’s current legislative plan draws it', kick: 'Senate District 21 board', kickTitle: 'The district board for Texas Senate District 21: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statesenate-26': { seat: 'wa-statesenate-26', composer: true, alias: 'wa-sd-26', route: '/district/wa-sd-26', pid: 'krishnadasan_wa', h1: 'Washington Senate District 26', where: 'District 26 as Washington’s current legislative plan draws it', kick: 'Senate District 26 board', kickTitle: 'The district board for Washington Senate District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statesenate-35': { seat: 'wa-statesenate-35', composer: true, alias: 'wa-sd-35', route: '/district/wa-sd-35', pid: 'macewen_wa', h1: 'Washington Senate District 35', where: 'District 35 as Washington’s current legislative plan draws it', kick: 'Senate District 35 board', kickTitle: 'The district board for Washington Senate District 35: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-10-p1': { seat: 'wa-statehouse-10-p1', composer: true, alias: 'wa-hd-10-p1', route: '/district/wa-hd-10-p1', pid: 'shavers_wa', h1: 'Washington House District 10, Position 1', where: 'District 10 as Washington’s current legislative plan draws it', kick: 'House District 10, Position 1 board', kickTitle: 'The district board for Washington House District 10, Position 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-10-p2': { seat: 'wa-statehouse-10-p2', composer: true, alias: 'wa-hd-10-p2', route: '/district/wa-hd-10-p2', pid: 'dave_paul_wa', h1: 'Washington House District 10, Position 2', where: 'District 10 as Washington’s current legislative plan draws it', kick: 'House District 10, Position 2 board', kickTitle: 'The district board for Washington House District 10, Position 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-17-p1': { seat: 'wa-statehouse-17-p1', composer: true, alias: 'wa-hd-17-p1', route: '/district/wa-hd-17-p1', pid: 'kevin_waters_wa', h1: 'Washington House District 17, Position 1', where: 'District 17 as Washington’s current legislative plan draws it', kick: 'House District 17, Position 1 board', kickTitle: 'The district board for Washington House District 17, Position 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-17-p2': { seat: 'wa-statehouse-17-p2', composer: true, alias: 'wa-hd-17-p2', route: '/district/wa-hd-17-p2', pid: 'stuebe_wa', h1: 'Washington House District 17, Position 2', where: 'District 17 as Washington’s current legislative plan draws it', kick: 'House District 17, Position 2 board', kickTitle: 'The district board for Washington House District 17, Position 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-18-p1': { seat: 'wa-statehouse-18-p1', composer: true, alias: 'wa-hd-18-p1', route: '/district/wa-hd-18-p1', pid: 'mcclintock_wa', h1: 'Washington House District 18, Position 1', where: 'District 18 as Washington’s current legislative plan draws it', kick: 'House District 18, Position 1 board', kickTitle: 'The district board for Washington House District 18, Position 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-18-p2': { seat: 'wa-statehouse-18-p2', composer: true, alias: 'wa-hd-18-p2', route: '/district/wa-hd-18-p2', pid: 'ley_wa', h1: 'Washington House District 18, Position 2', where: 'District 18 as Washington’s current legislative plan draws it', kick: 'House District 18, Position 2 board', kickTitle: 'The district board for Washington House District 18, Position 2: who is in the room and what is on the table. A place, not a scorecard.' },
    'wa-statehouse-26-p1': { seat: 'wa-statehouse-26-p1', composer: true, alias: 'wa-hd-26-p1', route: '/district/wa-hd-26-p1', pid: 'adison_richards_wa', h1: 'Washington House District 26, Position 1', where: 'District 26 as Washington’s current legislative plan draws it', kick: 'House District 26, Position 1 board', kickTitle: 'The district board for Washington House District 26, Position 1: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statesenate-17': { seat: 'wi-statesenate-17', composer: true, alias: 'wi-sd-17', route: '/district/wi-sd-17', pid: 'marklein_wi', h1: 'Wisconsin Senate District 17', where: 'District 17 as Wisconsin’s current legislative plan draws it', kick: 'Senate District 17 board', kickTitle: 'The district board for Wisconsin Senate District 17: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statesenate-31': { seat: 'wi-statesenate-31', composer: true, alias: 'wi-sd-31', route: '/district/wi-sd-31', pid: 'smith_wi', h1: 'Wisconsin Senate District 31', where: 'District 31 as Wisconsin’s current legislative plan draws it', kick: 'Senate District 31 board', kickTitle: 'The district board for Wisconsin Senate District 31: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-26': { seat: 'wi-statehouse-26', composer: true, alias: 'wi-hd-26', route: '/district/wi-hd-26', pid: 'sheehan_wi', h1: 'Wisconsin Assembly District 26', where: 'District 26 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 26 board', kickTitle: 'The district board for Wisconsin Assembly District 26: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-30': { seat: 'wi-statehouse-30', composer: true, alias: 'wi-hd-30', route: '/district/wi-hd-30', pid: 'zimmerman_wi', h1: 'Wisconsin Assembly District 30', where: 'District 30 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 30 board', kickTitle: 'The district board for Wisconsin Assembly District 30: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-51': { seat: 'wi-statehouse-51', composer: true, alias: 'wi-hd-51', route: '/district/wi-hd-51', pid: 'novak_wi', h1: 'Wisconsin Assembly District 51', where: 'District 51 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 51 board', kickTitle: 'The district board for Wisconsin Assembly District 51: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-61': { seat: 'wi-statehouse-61', composer: true, alias: 'wi-hd-61', route: '/district/wi-hd-61', pid: 'donovan_wi', h1: 'Wisconsin Assembly District 61', where: 'District 61 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 61 board', kickTitle: 'The district board for Wisconsin Assembly District 61: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-85': { seat: 'wi-statehouse-85', composer: true, alias: 'wi-hd-85', route: '/district/wi-hd-85', pid: 'snyder_wi', h1: 'Wisconsin Assembly District 85', where: 'District 85 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 85 board', kickTitle: 'The district board for Wisconsin Assembly District 85: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-88': { seat: 'wi-statehouse-88', composer: true, alias: 'wi-hd-88', route: '/district/wi-hd-88', pid: 'franklin_wi', h1: 'Wisconsin Assembly District 88', where: 'District 88 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 88 board', kickTitle: 'The district board for Wisconsin Assembly District 88: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-89': { seat: 'wi-statehouse-89', composer: true, alias: 'wi-hd-89', route: '/district/wi-hd-89', pid: 'spaude_wi', h1: 'Wisconsin Assembly District 89', where: 'District 89 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 89 board', kickTitle: 'The district board for Wisconsin Assembly District 89: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-91': { seat: 'wi-statehouse-91', composer: true, alias: 'wi-hd-91', route: '/district/wi-hd-91', pid: 'emerson_wi', h1: 'Wisconsin Assembly District 91', where: 'District 91 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 91 board', kickTitle: 'The district board for Wisconsin Assembly District 91: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-92': { seat: 'wi-statehouse-92', composer: true, alias: 'wi-hd-92', route: '/district/wi-hd-92', pid: 'moses_wi', h1: 'Wisconsin Assembly District 92', where: 'District 92 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 92 board', kickTitle: 'The district board for Wisconsin Assembly District 92: who is in the room and what is on the table. A place, not a scorecard.' },
    'wi-statehouse-94': { seat: 'wi-statehouse-94', composer: true, alias: 'wi-hd-94', route: '/district/wi-hd-94', pid: 'doyle_wi', h1: 'Wisconsin Assembly District 94', where: 'District 94 as Wisconsin’s current legislative plan draws it', kick: 'Assembly District 94 board', kickTitle: 'The district board for Wisconsin Assembly District 94: who is in the room and what is on the table. A place, not a scorecard.' },
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
  // A SEAT ELECTED BY POSITION (Washington's House: two seats per district),
  // <code>-statehouse-<n>-p<k>, alias <code>-hd-<n>-p<k>. A shape, not a list.
  var POSITION_KEY_RE = /^[a-z]{2}-statehouse-[1-9][0-9]*-p[1-9]$/;
  var POSITION_ALIAS_RE = /^([a-z]{2})-hd-([1-9][0-9]*)-(p[1-9])$/;

  function normalizeSeatKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!s) return '';
    if (SEAT_KEY_RE.test(s) || STATEWIDE_KEY_RE.test(s) || POSITION_KEY_RE.test(s)) return s;
    var pm = POSITION_ALIAS_RE.exec(s);
    if (pm) return pm[1] + '-statehouse-' + pm[2] + '-' + pm[3];
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
    utPinEmpty: 'No measures on hand for this seat on this issue.',
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
