/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE SUPPORT LANE (people-support / momentum)
   ─────────────────────────────────────────────────────────────────────────────

   WHY THIS FILE EXISTS

   The People's Mandate lets a visitor back a reform proposal. That is the one
   piece of "what people want" this site carries, and it is worth carrying: a
   reform with four thousand people behind it is a different political fact from
   a reform with four, and neither of those numbers is anywhere in the formal
   record.

   But it is the single most dangerous number on the site, because it looks
   exactly like the numbers that are earned. A support count is a tally, renders
   as a tally, sits beside Direction Match's percentage and the formal-act
   counts, and unlike either of those it can be produced by anybody with an
   opinion and a thumb. Left unlabelled it reads as a finding. It is not one.

   So this file exists to hold three things in one place, where they can be
   audited together and cannot drift apart:

     1. THE VOCABULARY — what these counts are called, everywhere. "Momentum",
        "support", "backing". Never "votes", because a vote on this site is a
        roll call: a formal act with a date, a chamber and a citation. Spending
        that word on a click blurs the one distinction the whole archive rests
        on. Never "evidence", because a count of opinions is not a receipt.

     2. THE PALETTE — categorical, and deliberately NOT the verdict palette. The
        support button used to be the app's good-green (#4ade80 / #86efac). That
        green means one thing everywhere else on this site: the record came out
        the way the stated position said it would. Wearing it on a social button
        says a tap is a kind of vindication. The lane uses the Mandate's gold
        instead — the section's own identity colour, which carries no verdict
        anywhere in this codebase — and it never uses red, because there is no
        "against" here to render. Nothing on this lane is coloured by how high
        the count is.

     3. THE WALL — declared as data on the object, asserted by the suite. No
        support count, and nothing derived from one, is read by Direction Match,
        by Word vs Action, by a formal pattern tier, by the publication floor,
        by any count of formal acts, by ballot sort order, or by Your Match. Not
        weighted in, not a tiebreak, not a confidence modifier, not a display
        annotation on a scored row.

   WHAT SUPPORT ATTACHES TO

   Reforms, and only reforms. There is no surface here for backing a person, and
   none for upvoting a vote row — a roll call is a fact, and a fact with a score
   attached to it is a poll about a fact. The Mandate proposal is the right
   attachment point because a proposal is a *proposition*: something a person can
   coherently be for, that nobody has yet made a record on.

   WHAT THE SERVER DOES

   netlify/functions/mandate-proposals.mts meters both write routes through
   netlify/lib/rate-limit.ts, keyed on the participant key AND the client IP,
   because the participant key is minted in this browser and rotating it would
   otherwise be a one-line bypass. A count a script can inflate is not a count
   of people, and this lane's whole claim is that it is a count of people.

   ── ON THE `pdxsup-` PREFIX ──
   Checked against every other shipped file before use: no other module defines
   or references a `pdxsup-` class. The Mandate's own UI uses `pp-*`, which stays
   where it is; this prefix covers only the labelling this file adds. The suite
   asserts the separation permanently, because a stylesheet that silently
   restyles another module's surface is the kind of bug that ships.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── The wall. Read by scripts/test-support-lane.mjs. ───────────────────────
  var NEVER_FEEDS = [
    'directionMatch',
    'wordVsAction',
    'formalPatternTier',
    'publicationFloor',
    'formalActCounts',
    'ballotSort',
    'yourMatch',
    'anyPersonRanking',
    'anyIntegrityRead'
  ];

  // ── Palette. Categorical, and none of it is a verdict hue. ─────────────────
  // #f5c842 is the Mandate's identity gold, used for its headers and counts
  // already. The two derived tints below are the same hue at different weights
  // for the idle and active button states — a state change, not a grade change.
  // The verdict hues (#4ade80, #86efac, #6ee7a0, #f87171, #f89b9b) appear
  // nowhere in this lane, and the suite checks that they do not.
  var COLORS = {
    gold: '#f5c842',
    goldBright: '#ffe08a',
    text: '#c7d3e6',
    muted: '#7a8aa8'
  };

  // ── Vocabulary. One source, so no surface can invent its own word. ─────────
  var WORDS = {
    // The button, idle and active.
    support: 'Support',
    supported: 'Supported',
    // The headline stat on the Mandate page. NOT "total votes".
    statLabel: 'shows of support',
    // The label under a per-proposal count.
    countLabel: 'Backing',
    // What the count is, in one word, for any consumer that needs to say it.
    kind: 'momentum'
  };

  // The sentence that has to appear wherever a count appears. It says what the
  // number is and what it is not, in that order, unprompted — the same posture
  // publication-floor.js takes when it declines to publish a percentage.
  var MOMENTUM_NOTE =
    'Momentum, not evidence: support counts show how many people asked for a ' +
    'reform to be tracked. They are not part of any record and feed no score.';

  // The stronger version, for the person file — the one page where a count sits
  // in the same scroll as Direction Match and the formal act list.
  var WALL_NOTE =
    'Support is momentum, not evidence. These counts are not part of this ' +
    'person\'s record and feed no score, match percentage or ranking on this page.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Format a count for display. Plain integer with locale separators — no ramp,
  // no threshold, no "hot"/"trending" band. A big number is a big number.
  function count(n) {
    var v = Math.max(0, parseInt(n, 10) || 0);
    return v.toLocaleString();
  }

  // "1 person backing" / "N people backing". People, because that is what the
  // one-support-per-participant unique index makes it.
  function countText(n) {
    var v = Math.max(0, parseInt(n, 10) || 0);
    return v === 1 ? '1 person backing this' : count(v) + ' people backing this';
  }

  // The note, rendered. `opts.wall` picks the stronger person-file wording.
  function noteHtml(opts) {
    opts = opts || {};
    var text = opts.wall ? WALL_NOTE : MOMENTUM_NOTE;
    return '<p class="pdxsup-note' + (opts.wall ? ' pdxsup-note-wall' : '') + '">' +
      esc(text) + '</p>';
  }

  // The headline stat's label, so the Mandate page never hard-codes it.
  function statLabel() { return WORDS.statLabel; }

  window.PDXSupportLane = {
    // Declarations the suite reads. Support produces no score and orders no
    // people; both are structural, not a current state of the data.
    scored: false,
    evidence: false,
    momentum: true,
    NEVER_FEEDS: NEVER_FEEDS,
    COLORS: COLORS,
    WORDS: WORDS,
    MOMENTUM_NOTE: MOMENTUM_NOTE,
    WALL_NOTE: WALL_NOTE,
    count: count,
    countText: countText,
    noteHtml: noteHtml,
    statLabel: statLabel
  };
})();
