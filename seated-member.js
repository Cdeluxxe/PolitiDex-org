/* ═══════════════════════════════════════════════════════════════════════════
   seated-member.js — the seat→officeholder table, for documents that carry no
   ballot-breakdown.js
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN. /voice listed a Layton reader's six seats and named nobody
   in three of them. The State House card read

       No sitting member on hand for this seat.

   for HD-16, the State Senate card read the same for SD-7, and both of those
   seats have a BOARD — so the hallway printed "Open board" directly under a
   sentence saying nobody holds the seat the board belongs to. One tap away, the
   board itself named Trevor Lee and Stuart Adams, because district-board.js
   writes those two pids down in its own table.

   IT WAS NOT THE SEAT LIST AND IT WAS NOT THE GATE. pdxRepsForMe() is the one
   seat list, and it already asks the right joins: window._pdxUsHouseSeat() for
   the congressional seat and window.pdxSeatedMemberFor() for the two
   legislative ones. The second of those two is declared inside
   ballot-breakdown.js — 407 KB of curated race machinery — and voice.html
   deliberately loads none of it. So on the hallway the call site was there, the
   function was not, the resolver failed soft to null exactly as it is written
   to, and the card printed the sentence that means "nobody holds this seat".

   The reader whose location came from /find felt it hardest: that document
   carries no curated tables either, so there was no memo to fall back to and
   nothing on the page had ever seen these two seats resolved.

   WHAT THIS FILE IS. The three district→pid tables and the one lookup over
   them, and nothing else, small enough to put on a lean document: ~4 KB in
   place of 407 KB. It reads no roster, resolves no location, composes no label
   and prints nothing. Every consumer of it is elsewhere and unchanged —
   voter-hub-location.js's pdxRepsForMe(), district-voice.js, district-file.js
   and district-ballot.js all already ask window.pdxSeatedMemberFor and always
   have.

   THE PRECEDENT IS profile-alias.js, ON THIS EXACT PAGE, for this exact reason:
   a ruling that voice.html needed was locked inside a 68 KB module the document
   does not load, so the one literal was lifted out and byte-pinned to its
   source. This is the same move against the same page's second missing join.

   ONE LITERAL PER TABLE, COPIED ONCE, PINNED BYTE FOR BYTE. The four blocks
   below are copied VERBATIM out of ballot-breakdown.js — same lines, same
   indentation, same quoting — and scripts/test-voice-sitting-member.mjs fails if
   any of them stops being byte-identical. ballot-breakdown.js remains the
   source: it is the file with the reasoning and the per-district notes, entries
   are added there, and this copy is re-derived from it rather than edited by
   hand. That is the same discipline profile-alias.js keeps against
   profile-evidence.js.

   THE ASSIGNMENT IS GUARDED HERE. ballot-breakdown.js writes
   window.pdxSeatedMemberFor unconditionally and stays byte-pinned to HEAD by the
   suite, so the guard is on this side: a document carrying both files gets the
   owner's function whatever the script order resolves to, and never two
   different ones. That is safe precisely BECAUSE of the byte pin — the two
   answer identically for every seat, so which one wins is not a question the
   page can get wrong. No document carries both today: voice.html is the only
   one that loads this file, and it loads none of the four modules it exists to
   not load.

   WHAT THIS FILE IS NOT. It is NOT a second answer to "who represents me": it
   is keyed on a SEAT, not on a reader, and it cannot be asked who somebody's
   member is. It is NOT the congressional join either — window._pdxUsHouseSeat()
   in voter-hub-location.js owns that, off the roster's own district-qualified
   records, and the U.S. House lane in district-voice.js asks THAT and never the
   congressional table below. And it opens no room: the board allow-list is
   district-voice.js's BOARD_ROUTES and there is not one seat key, board address
   or state name in this file.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // COPIED VERBATIM FROM ballot-breakdown.js LINES 1895–1900.
    var KR_CONGRESSIONAL_INCUMBENTS = {
      1: { pid: 'bmoore', label: 'Incumbent — current Utah U.S. Representative' },
      2: { pid: 'maloy',  label: 'Incumbent — current Utah U.S. Representative' },
      3: { pid: 'kennedy', label: 'Incumbent — current Utah U.S. Representative' },
      4: { pid: 'owens',  label: 'Incumbent — current Utah U.S. Representative' }
    };

  // COPIED VERBATIM FROM ballot-breakdown.js LINES 2024–2036.
    var KR_STATE_HOUSE_INCUMBENTS = {
      4:'auxier_h4', 5:'snider_h5', 6:'rob_bishop', 9:'jake_sawyer', 10:'koford_h10',
      11:'hall_h11', 12:'mschultz', 14:'lisonbee_h14', 15:'defay_h15', 16:'tlee',
      19:'rward', 21:'hollins_h24', 22:'jennifer_dailey_provost', 23:'hoang_nguyen', 24:'grant_miller',
      25:'aromero', 28:'nicholeen_p_peck', 29:'bolinder_h68', 30:'fitisemanu_h30', 31:'verona_mauga',
      33:'doug_owens', 34:'carol_spackman_moss', 36:'james_dunnigan', 37:'ashlee_matthews', 39:'ivory_h39',
      41:'john_arthur', 42:'clinton_okerlund', 43:'eliason_h45', 44:'teuscher_h44', 45:'tracy_miller',
      46:'calvin_roberts', 49:'candice_pierucci', 50:'gricius_h50', 51:'leah_hansen', 52:'cory_maloy_h52',
      53:'kay_christofferson', 55:'jon_hawkins', 56:'valpeterson_h56', 59:'kohler_h59', 60:'grant_pace', 61:'lisa_shepherd',
      63:'whyte_h63', 64:'jackie_larson', 65:'doug_welton', 66:'shelley_h66', 67:'christine_watkins',
      68:'chew_h68', 69:'logan_monson', 70:'carl_albrecht', 71:'rshipp', 73:'colin_w_jack',
      75:'walt_brooks'
    };

  // COPIED VERBATIM FROM ballot-breakdown.js LINES 2077–2084.
    var KR_STATE_SENATE_INCUMBENTS = {
      1:'ssandall', 2:'cwilson', 3:'john_johnson', 4:'cmusselman', 5:'amillner',
      6:'jstevenson', 7:'sadams', 8:'tweiler', 9:'jennifer_plumb', 10:'lescamilla',
      11:'emily_buss', 12:'kwan_s12', 13:'blouin_s13', 14:'stephanie_pitcher', 15:'kathleen_riebe',
      16:'harper_s16', 17:'lincoln_fillmore', 18:'mccay_s11', 19:'kcullimore', 20:'rwinterton',
      21:'brammer_s21', 22:'heidi_balderree', 23:'kgrover', 24:'kstratton', 25:'mckell_s25',
      26:'dhinkins', 27:'dowens_st', 28:'evickers', 29:'dipson'
    };

  // The guard. See the header: the owner's assignment is unguarded and pinned,
  // so this side is the one that yields.
  if (typeof window.pdxSeatedMemberFor !== 'function') {
  // COPIED VERBATIM FROM ballot-breakdown.js LINES 2468–2496.
    function _pdxSeatKeyOf(raw) {
      var s = String(raw == null ? '' : raw).toLowerCase();
      // 'statehouse' before 'house', because 'ut-statehouse-68' contains both and
      // only one of them is the seat it names.
      if (s.indexOf('statehouse') >= 0) return 'statehouse';
      if (s.indexOf('statesenate') >= 0) return 'statesenate';
      if (/(^|[^a-z])house([^a-z]|$)/.test(s)) return 'house';
      return '';
    }
    window.pdxSeatedMemberFor = function (seatKey, districtNumber) {
      try {
        var k = _pdxSeatKeyOf(seatKey);
        if (!k) return null;
        // The explicit number wins when there is one; otherwise the trailing digits
        // of the composed key are the number, which is what lets the district key
        // answer on its own.
        var n = parseInt(String(districtNumber == null ? '' : districtNumber)
          .replace(/[^0-9]/g, ''), 10);
        if (!isFinite(n) || n <= 0) {
          var m = /([0-9]+)\s*\/?\s*$/.exec(String(seatKey == null ? '' : seatKey));
          n = m ? parseInt(m[1], 10) : NaN;
        }
        if (!isFinite(n) || n <= 0) return null;
        if (k === 'statehouse') return KR_STATE_HOUSE_INCUMBENTS[n] || null;
        if (k === 'statesenate') return KR_STATE_SENATE_INCUMBENTS[n] || null;
        var c = KR_CONGRESSIONAL_INCUMBENTS[n];
        return (c && c.pid) || null;
      } catch (e) { return null; }
    };
  }
})();
