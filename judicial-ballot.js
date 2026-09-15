/* ══════════════════════════════════════════════════════════════════════════
   judicial-ballot.js — the third branch, in a room of its own
   ──────────────────────────────────────────────────────────────────────────
   Two surfaces, one owner. Both read judicial-retention.js and neither one
   decides anything for itself.

   ── DOOR 2: one line, and a lane of its own ──────────────────────────────
   A Utah ballot in an even year carries judicial retention questions. Door 2
   resolved six legislative seats and said nothing about them, which meant the
   workspace called itself "your ballot" while a whole branch of government was
   missing from it.

   The first fix over-corrected. The retention band went inside
   #ballot-workspace and the courts archive went into #who-represents-me
   .wrm-inner — which put a long list of judges directly between the reader's
   seat list and the workspace where they make their picks. Someone scrolling
   from "here are your reps" to "choose your candidates" had to scroll past a
   wall of judges to get there, and the archive listing in particular is not
   about their ballot at all.

   So both surfaces moved into #judicial-lane, a static section in index.html
   that sits BELOW the workspace and below the picks — and then, in the pass
   below, out of that document altogether. What is left inside
   #ballot-workspace is one line — #jr-line — that says retention is separate
   from the builder and offers a jump down to the lane. One line is the whole
   Door 2 footprint, and the lane it points at now holds the door to the room
   rather than the room itself.

   Both mounts are SIBLINGS of the elements another module owns, never children
   of them: ballot-workspace.js's sync() assigns #bw-body.innerHTML in a single
   write, so anything appended inside that element is destroyed on the next
   repaint — the same reason issue-file.js mounts its letterhead as a sibling.

   And the band is not a seat. It does not join seats(), which is what
   door2-spine.js counts to say "3 of 6 decided": a retention question is a
   yes/no on one name, not a field of candidates to choose between, so adding
   it to that denominator would make the progress counter measure two different
   acts at once and the spine has no pick engine for the second one. The lane
   shows the question. It does not ask the reader to pick a winner, and there
   is no pick to save.

   ── THE ROOM MOVED. THE DOOR STAYED. ────────────────────────────────────
   The lane was the second-tallest block on the homepage: the reader's own
   retention questions, and under them the whole Utah courts archive — every
   judge on file, by court, under a heading reading "ARCHIVE · UTAH COURTS ·
   NOT A BALLOT". None of that is the front page's job, which is two doors
   (who represents me, and find the record), and a reader who wanted the courts
   had no address to bookmark and no link to send.

   So both rosters now live at /courts (courts.html, the ninth shell) and the
   homepage keeps ONE SHORT CARD. There are now two ways this module paints and
   the document says which, through one flag it sets before any script runs:

     window.__PDX_COURTS_DOC  #courts-ballot gets the reader's own questions,
                              #courts-archive gets the roster. Both mounts are
                              STATIC MARKUP in courts.html, under two static
                              region labels, and this module never creates
                              either one — the labels are the whole reason that
                              page has two regions, and a module that could
                              invent a mount could put the archive under the
                              wrong label.
     everything else          #judicial-lane gets #jr-card and nothing else: an
                              eyebrow, "Judges on your ballot", the COUNT of
                              questions the resolver can defend for this
                              location, and a link into the room. No name, no
                              roster, no archive. A reader with no location set
                              is told to set one, which is the only honest thing
                              a card can say before it has a location.

   SAME DATA, SAME RETAIN CONTROLS, NEW ADDRESS. bandHtml() and archHtml() are
   untouched by the move: what /courts renders in region A is byte-for-byte what
   the homepage strip used to render for the same location, because it is the
   same function reading the same owner. The card is the only new copy, it holds
   one number and that number is b.rows.length — the resolver's own count of
   resolved questions — not a score, not a total, and not a percentage.

   AND THE CARD MAKES NO CLAIM THE STRIP DID NOT. It is built from the same
   ballot() answer, so a reader outside Utah gets the resolver's own sentence
   about that rather than a count of somebody else's ballot, and a Utah reader
   whose county we cannot place gets zero questions and the room to read why.

   ── WHAT IT REFUSES TO DO ────────────────────────────────────────────────
   Outside Utah it prints no judge. Statewide retention — Supreme Court and
   Court of Appeals — resolves from a STATE, which is a claim the resolver's own
   output supports. District and juvenile retention resolves from the county the
   location owner publishes, through the eight geographical divisions of Utah
   Code § 78A-1-102, and prints the judges of THAT division and no other: a
   Davis County voter does not see a Box Elder judge. A county the resolver
   cannot place, and the justice courts, report WHICH MAP OR ROSTER IS MISSING
   rather than offering the nearest judge on file. That is the same honesty the
   U.S. House row already practices for a voter in Ohio, applied to a Utah voter
   in a county we cannot place.

   ── DOOR 1: the archive listing ──────────────────────────────────────────
   Chamber-and-state shaped, exactly like archive-browse.js: "Utah · Supreme
   Court", alphabetical, no party chip, no composite, no seat claim. It renders
   for a reader in Ohio unchanged, because a roster slice is a true statement
   about the archive no matter where the reader is standing — and it is the
   answer to "the ballot can't help me here, is there anything to read".

   It renders at /courts, in region B, under the reader's own questions and
   under its own label. It renders nowhere on the homepage at all — a listing
   that makes no claim about the reader has no business on the page whose whole
   job is two claims about them.

   States. Does not gate. This module appends; it never blocks a click, never
   rewrites another module's DOM, and is safe to no-op.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BAND_ID = 'jr-band';
  var ARCH_ID = 'jr-arch';
  var LINE_ID = 'jr-line';
  var LANE_ID = 'judicial-lane';
  var MOUNT_ID = 'ballot-workspace';

  // Reader-facing copy. "Also on your ballot" is the only ballot claim in this
  // file and it is made only inside the Utah + located branch.
  var KICKER = 'Also on your ballot · judicial retention';
  var LEAD = 'Utah voters decide whether judges stay in office. The question is yes or no, ' +
    'there is no opponent, and there is no party on the line.';
  var YN = 'This is the ballot’s own question. PolitiDex takes no position on it and publishes ' +
    'no rating of a judge.';
  var ARCH_KICKER = 'Archive · Utah courts · not a ballot';
  var ARCH_LEAD = 'Judicial retention records in the archive, by court.';
  // Held apart from the lead, in a note, so the one sentence on this surface
  // that mentions the reader's ballot is a DISCLAIMER and is structurally
  // marked as one. A claim and a denial that read alike are how a listing turns
  // into a seat assignment.
  var ARCH_NOTE = 'A listing here is not a claim that these questions are on your ballot.';

  // The entire Door 2 footprint. Deliberately one sentence: it tells a reader
  // that the thing missing from the builder is not missing from the site, and
  // then gets out of the way of the picks.
  var LINE_TEXT = 'Judicial retention is separate from this ballot builder.';
  var LINE_CTA = 'See the judicial questions ↓';

  // ── THE ROOM, AND THE CARD THAT OPENS IT ────────────────────────────────
  // The two mounts courts.html declares, and the one this module builds in the
  // lane on every other document. CARD_ID is created; the two CT_ ids are NOT
  // — see the header.
  var CARD_ID = 'jr-card';
  var CT_BAND_ID = 'courts-ballot';
  var CT_ARCH_ID = 'courts-archive';
  var COURTS_HREF = '/courts';
  var LOC_HREF = '/#who-represents-me';

  // The whole homepage footprint, and it is three lines and a link. "Judges on
  // your ballot" is a ballot claim, so it is a TITLE and the COUNT underneath it
  // is what carries the claim's scope: the number is the resolver's own
  // b.rows.length, the location it was resolved for is named next to it, and a
  // reader who has set no location is told that rather than shown a zero. A zero
  // and an unknown are different answers and a card that printed "0" for both
  // would be reporting a finding it does not have.
  var CARD_EYEBROW = '⚖️ The third branch';
  var CARD_TITLE = 'Judges on your ballot';
  var CARD_UNSET = 'Set location to see retention questions.';
  var CARD_CTA = 'Open courts →';

  // Region A on /courts is a LABELLED region, so it has to say something: an
  // empty box under the heading "On your ballot" reads as "no questions", which
  // is a claim. The sentence it says instead is ballot().note — the resolver's
  // own — so this file still holds no vocabulary of its own for the state it is
  // describing.
  var CT_UNSET_KICKER = 'Judicial retention · nothing claimed yet';
  var CT_UNSET_LINK = 'Set where you vote';
  var CT_UNSET_TAIL = ' and your own questions appear here. Region B below is the archive ' +
    'and reads the same for everybody.';

  function fn(x) { return typeof x === 'function'; }
  function J() { return window.PDXJudicial || null; }
  // ONE FLAG, NO PATH SNIFF. courts.html sets window.__PDX_COURTS_DOC before
  // any module can look for it, for the same reason me.html sets __PDX_ME_DOC:
  // /courts, /courts/ and a preview server's /courts.html are three spellings
  // of one document that a location.pathname test gets differently.
  function isCourtsDoc() { try { return window.__PDX_COURTS_DOC === true; } catch (e) { return false; } }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function reps() {
    try { return fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { return null; }
  }
  function plink(pid, label) {
    var L = window.PDXPersonLink;
    if (L && fn(L.anchor)) return L.anchor(pid, label, { cls: 'jr-plink' });
    return '<span class="jr-plink">' + esc(label) + '</span>';
  }

  // ── Door 2 markup ───────────────────────────────────────────────────────

  // The unit label is load-bearing on a ballot that now carries five courts:
  // two statewide and, for a placed voter, the trial-court seats of exactly one
  // judicial district. "Statewide" and "Second Judicial District" next to the
  // court name is what tells a reader why THIS judge is on THEIR ballot, and it
  // is read from the row rather than recomputed here.
  function rowHtml(row) {
    var jp = row.jpec || {};
    return '<li class="jr-row">' +
      '<span class="jr-office">' + esc(row.courtShort) +
        (row.unitLabel ? '<i class="jr-unit">' + esc(row.unitLabel) + '</i>' : '') + '</span>' +
      '<span class="jr-q">' + esc(row.question) + '</span>' +
      '<span class="jr-who">' + plink(row.pid, row.name) +
        (row.role ? '<span class="jr-role"> · ' + esc(row.role) + '</span>' : '') + '</span>' +
      '<span class="jr-yn"><i class="jr-box">Retain</i><i class="jr-box">Do not retain</i></span>' +
      '<span class="jr-jpec">' + esc(jp.label || '') + '</span>' +
      (row.when ? '<span class="jr-when">' + esc(row.when) + '</span>' : '') +
      // Where two official sources disagree about which court a seat sits on,
      // the row says so on the row. A conflict a reader cannot see is a
      // conflict the page resolved on their behalf.
      (row.conflict ? '<span class="jr-conflict">' + esc(row.conflict) + '</span>' : '') +
      '</li>';
  }

  function bandHtml() {
    var Jj = J();
    if (!Jj || !fn(Jj.ballot)) return '';
    var b = Jj.ballot(reps());
    if (!b.located) return '';

    var head = '<p class="jr-kicker">' + esc(b.utah ? KICKER : 'Judicial retention · not on this ballot') + '</p>';

    if (!b.utah) {
      // No Utah judge can reach this branch: the rows are built inside the
      // Utah branch of ballot() and this one returns before any of them.
      return head +
        '<p class="jr-lead">' + esc(b.note) + '</p>' +
        '<p class="jr-note">The archive listing of Utah courts is further down the page, and it ' +
        'makes no claim about your ballot.</p>';
    }

    var out = head + '<p class="jr-lead">' + esc(LEAD) + '</p>';
    // Which geography the rows below were resolved from, stated before them.
    // A trial-court question is on this ballot because of the county, so the
    // county and the district it maps to are named where the reader can check
    // them against their own address.
    if (b.district && b.districtLabel) {
      out += '<p class="jr-where">' + esc((b.county ? b.county + ' · ' : '') + b.districtLabel) +
        '</p>';
    }
    if (b.note) out += '<p class="jr-warn">' + esc(b.note) + '</p>';

    if (b.rows.length) {
      out += '<ul class="jr-rows">';
      b.rows.forEach(function (r) { out += rowHtml(r); });
      out += '</ul>';
      out += '<p class="jr-note">' + esc(YN) + '</p>';
    } else {
      out += '<p class="jr-empty">No judicial retention question is on file for your ballot yet.</p>';
    }

    // The per-court status list, INCLUDING the courts with nothing in them.
    // A court that is missing from this list reads as a court with no question;
    // a court that is present and says which map is missing reads as what it
    // is, which is the whole difference between a blank and a lie.
    out += '<ul class="jr-courts">';
    b.courts.forEach(function (c) {
      out += '<li class="jr-court jr-court--' + esc(c.status) + '">' +
        '<span class="jr-court-l">' + esc(c.label) +
          (c.unitLabel ? '<i class="jr-unit">' + esc(c.unitLabel) + '</i>' : '') + '</span>' +
        '<span class="jr-court-n">' + esc(c.note) + '</span>' +
        '</li>';
    });
    out += '</ul>';

    if (b.missing.length) {
      out += '<p class="jr-missing"><b>Maps not on file:</b> ' +
        esc(b.missing.join(' · ')) + '</p>';
    }
    return out;
  }

  // ── Door 1 markup ───────────────────────────────────────────────────────

  function archHtml() {
    var Jj = J();
    if (!Jj || !fn(Jj.archive)) return '';
    var groups = Jj.archive();
    if (!groups.length) return '';
    var out = '<p class="jr-kicker">' + esc(ARCH_KICKER) + '</p>' +
      '<p class="jr-lead">' + esc(ARCH_LEAD) + '</p>' +
      '<p class="jr-note">' + esc(ARCH_NOTE) + '</p>';
    groups.forEach(function (g) {
      out += '<div class="jr-group">' +
        '<h4 class="jr-group-h">' + esc(g.label) +
        (g.term ? '<span class="jr-term"> · ' + esc(String(g.term)) + '-year term</span>' : '') +
        '</h4>';
      if (!g.rows.length) {
        out += '<p class="jr-empty">' + esc(g.note) + '</p>';
      } else {
        out += '<ul class="jr-list">';
        g.rows.forEach(function (r) {
          var tail = [];
          if (r.role) tail.push(r.role);
          if (r.area) tail.push(r.area);
          if (!r.seated) tail.push('Senate confirmation not on file');
          if (r.former) tail.push('no longer on the court');
          out += '<li class="jr-li">' + plink(r.pid, r.name) +
            (tail.length ? '<span class="jr-tail"> · ' + esc(tail.join(' · ')) + '</span>' : '') +
            '</li>';
        });
        out += '</ul>';
      }
      out += '</div>';
    });
    out += '<p class="jr-note">' + esc(Jj.WALL) + '</p>';
    return out;
  }

  // ── The homepage card ───────────────────────────────────────────────────
  // Reads the SAME ballot() answer the strip read, and reports one thing off it.
  // Every branch here is a branch of the resolver's, not of this file's: not
  // located, located-and-not-Utah, and located-in-Utah-with-N-questions. There
  // is no fourth state for a card to invent.
  function cardHtml() {
    var Jj = J();
    if (!Jj || !fn(Jj.ballot)) return '';
    var b = Jj.ballot(reps());

    var line;
    if (!b.located) {
      line = CARD_UNSET;
    } else if (!b.utah) {
      // The resolver's own sentence about a state it holds no records for. A
      // count here would be a count of somebody else's ballot.
      line = b.note;
    } else {
      // The location the number was resolved FOR, named next to the number.
      // County when we placed one, state otherwise — the same order the band's
      // own .jr-where line uses.
      var where = b.county || b.state || 'your location';
      var n = b.rows.length;
      line = n
        ? (n + (n === 1 ? ' retention question' : ' retention questions') +
           ' resolved for ' + where + '.')
        : ('No retention question is resolved for ' + where + ' yet.');
    }

    return '<p class="jr-kicker">' + esc(CARD_EYEBROW) + '</p>' +
      '<p class="jr-card-t">' + esc(CARD_TITLE) + '</p>' +
      '<p class="jr-card-l">' + esc(line) + '</p>' +
      '<p class="jr-card-go"><a class="jr-card-b" href="' + COURTS_HREF + '">' +
        esc(CARD_CTA) + '</a></p>';
  }

  // ── /courts region A ────────────────────────────────────────────────────
  // bandHtml() unchanged when it has an answer — that is the point of the move,
  // and it is why region A and the old homepage strip are the same bytes for the
  // same location. The only thing added is what to print when it has none.
  function courtsBandHtml() {
    var h = bandHtml();
    if (h) return h;
    var Jj = J();
    var b = (Jj && fn(Jj.ballot)) ? Jj.ballot(reps()) : null;
    var note = (b && b.note) ? b.note : '';
    if (!note) return '';
    return '<p class="jr-kicker">' + esc(CT_UNSET_KICKER) + '</p>' +
      '<p class="jr-lead">' + esc(note) + '</p>' +
      '<p class="jr-note"><a class="jr-plink" href="' + LOC_HREF + '">' +
        esc(CT_UNSET_LINK) + '</a>' + esc(CT_UNSET_TAIL) + '</p>';
  }

  // ── Door 2: the one line ────────────────────────────────────────────────

  function lineHtml() {
    return '<span class="jr-line-t">' + esc(LINE_TEXT) + '</span>' +
      '<button type="button" class="jr-line-b" data-jr-jump="1">' + esc(LINE_CTA) + '</button>';
  }

  // Scroll, not navigate: the lane is on this page, so a jump that changed the
  // URL would put a back-button step between the reader and their half-built
  // ballot. Falls back to no-op rather than guessing at another target.
  function jump() {
    var lane = document.getElementById(LANE_ID);
    if (!lane || !fn(lane.scrollIntoView)) return;
    try { lane.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { try { lane.scrollIntoView(); } catch (_) {} }
  }

  // ── Mounts ──────────────────────────────────────────────────────────────
  // The line goes INTO #ballot-workspace and NEXT TO #bw-body, never inside
  // it. See the header: sync() owns that element's innerHTML outright.
  function lineSlot() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return null;
    var el = document.getElementById(LINE_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = LINE_ID;
    el.className = 'jr-line';
    el.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== el) {
        if (t.getAttribute && t.getAttribute('data-jr-jump')) { jump(); return; }
        t = t.parentNode;
      }
    });
    try { mount.appendChild(el); } catch (e) { return null; }
    return el;
  }

  // Both judicial surfaces live in one lane, and the lane's POSITION is static
  // markup in index.html — deliberately, so no module can decide at runtime to
  // put judges back above the workspace. If the section is missing (a stripped
  // page, a partial), we create it after the sections it must follow rather
  // than fall back to a host inside the pick flow; the whole point of this file
  // changing was that the pick flow is not where this belongs.
  function lane() {
    var el = document.getElementById(LANE_ID);
    if (el) return el;
    var after = document.getElementById('relevant-section') ||
                document.getElementById('my-politicians') ||
                document.getElementById(MOUNT_ID);
    if (!after || !after.parentNode) return null;
    el = document.createElement('section');
    el.id = LANE_ID;
    try {
      if (after.nextSibling) after.parentNode.insertBefore(el, after.nextSibling);
      else after.parentNode.appendChild(el);
    } catch (e) { return null; }
    return el;
  }

  function laneSlot(id, cls) {
    var host = lane();
    if (!host) return null;
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = cls;
    try { host.appendChild(el); } catch (e) { return null; }
    return el;
  }
  function bandSlot() { return laneSlot(BAND_ID, 'jr-band'); }
  function archSlot() { return laneSlot(ARCH_ID, 'jr-band jr-band--arch'); }
  function cardSlot() { return laneSlot(CARD_ID, 'jr-band jr-band--card'); }

  // ── THE ROOM: /courts ───────────────────────────────────────────────────
  // Two writes into two mounts the document declared. NOTHING IS CREATED HERE:
  // a missing mount is a stripped or partial document, and the correct answer to
  // it is silence rather than a band appended wherever a host happens to be —
  // the two static region labels are the only thing that tells a reader which of
  // these two lists is a claim about them.
  function paintCourts() {
    var band = document.getElementById(CT_BAND_ID);
    if (band) band.innerHTML = courtsBandHtml();
    var arch = document.getElementById(CT_ARCH_ID);
    if (arch) arch.innerHTML = archHtml();
  }

  // ── THE DOOR: every other document ──────────────────────────────────────
  // The lane gets the card and nothing else. bandSlot() and archSlot() are not
  // called on this path, so no roster and no archive can reach a homepage: the
  // ids they would mount under are never created, which is stronger than
  // creating them empty.
  function paintDoor() {
    var card = cardSlot();
    var ch = '';
    if (card) {
      ch = cardHtml();
      card.innerHTML = ch;
      try {
        if (ch) card.removeAttribute('hidden');
        else card.setAttribute('hidden', 'hidden');
      } catch (e) {}
    }

    // The line is only worth a reader's attention if the lane has something in
    // it. An empty lane with a signpost pointing at it is worse than silence.
    var line = lineSlot();
    if (line) {
      var show = !!ch;
      line.innerHTML = show ? lineHtml() : '';
      try {
        if (show) line.removeAttribute('hidden');
        else line.setAttribute('hidden', 'hidden');
      } catch (e) {}
    }
  }

  function paint() {
    if (isCourtsDoc()) { paintCourts(); return; }
    paintDoor();
  }

  function sync() { try { paint(); } catch (e) {} }

  // ── Boot ────────────────────────────────────────────────────────────────
  // Wrap rather than poll, the same four hooks the rest of Door 2 uses: a
  // location being set, the team-position refresh that follows it, a pick
  // landing (which repaints the workspace and would otherwise leave the band
  // stale beside a fresh rail) and the race sheet's own refresh. The settle
  // timers cover the deferred-script order we do not control.
  function wrap(name, flag) {
    var f = window[name];
    if (!fn(f) || f[flag]) return;
    var wrapped = function () {
      var r = f.apply(this, arguments);
      setTimeout(sync, 0);
      return r;
    };
    wrapped[flag] = true;
    try { window[name] = wrapped; } catch (e) {}
  }

  function boot() {
    wrap('pdxFindMyReps', '__jrReps');
    wrap('_updateTeamPositionsForLocation', '__jrLoc');
    wrap('ballotPickCard', '__jrPick');
    wrap('_pdxRaceSheetRefresh', '__jrSheet');
    sync();
    [400, 1200, 3000].forEach(function (ms) { setTimeout(sync, ms); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PDXJudicialBallot = {
    sync: sync,
    jump: jump,
    _band: bandHtml,
    _arch: archHtml,
    _line: lineHtml,
    _card: cardHtml,
    _courtsBand: courtsBandHtml,
    _boot: boot,
    isCourtsDoc: isCourtsDoc,
    BAND_ID: BAND_ID,
    ARCH_ID: ARCH_ID,
    LINE_ID: LINE_ID,
    LANE_ID: LANE_ID,
    CARD_ID: CARD_ID,
    CT_BAND_ID: CT_BAND_ID,
    CT_ARCH_ID: CT_ARCH_ID,
    COURTS_HREF: COURTS_HREF,
    LINE_TEXT: LINE_TEXT,
    LINE_CTA: LINE_CTA,
    CARD_TITLE: CARD_TITLE,
    CARD_UNSET: CARD_UNSET,
    CARD_CTA: CARD_CTA
  };
})();
