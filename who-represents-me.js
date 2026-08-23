/* ═══════════════════════════════════════════════════════════════════════════
   who-represents-me.js — the homepage front door for representative lookup
   ────────────────────────────────────────────────────────────────────────────
   Finding the people with power over you is the single most useful thing this
   site does for someone who has never been here before, and until now it was
   the reward at the end of a flow named after something else. The lookup lived
   inside the Team Builder: a visitor had to already believe PolitiDex could
   answer "who represents me" before they would go somewhere labelled "build
   your voting team" to find out. Most never did.

   This module owns the answer as a service in its own right, at the top of the
   homepage, stated in the visitor's own words. It does NOT replace the Team
   Builder — it puts the story back in the order a person actually lives it:

        ① Find who represents you
        ② Inspect their records
        ③ Optionally build your team

   WHAT IT OWNS AND WHAT IT DOESN'T
   ─────────────────────────────────
   It owns presentation and one global action (window.pdxFindMyReps). It owns no
   data and resolves nothing itself: districts and officeholders come from
   window.pdxRepsForMe() in voter-hub-location.js, which is the same resolution
   the Voter Hub's "Who Represents You Now" strip reads. Two surfaces answering
   the same question from one resolver is the whole point — a homepage that
   named a different member than the Hub would be worse than no homepage entry
   at all.

   It also states no verdict, no score and no percentage. Every row is a name, an
   office and a district, and every claim about a record is made on the profile
   the row opens, under that surface's existing formal/public lane rules. Nothing
   here blends lanes or characterises anyone, so there is nothing here to get
   wrong about a record.

   HONESTY ABOUT COVERAGE
   ──────────────────────
   A level PolitiDex has not resolved for this area is rendered as an explicit
   "not resolved yet" row rather than dropped. Dropping it would leave a list of
   two that reads as complete. Local offices (mayor, council, school board,
   county) are never claimed here at all — they resolve through the Relevant-to-Me
   ballot, and the footer links out to it rather than implying coverage, and only
   where that ballot can actually answer for this visitor.

   WHY THE ANSWER IS TWO-SPEED, AND WHY THAT IS SAID OUT LOUD
   ──────────────────────────────────────────────────────────
   The resolver returns two classes of seat. The statewide ones — both U.S. Senate
   seats and the Governor — are elected by the whole state and therefore resolve
   from the visitor's state alone, in all fifty of them. The district ones — U.S.
   House, State Senate, State House — need district lines, and PolitiDex maps
   districts in Utah only.

   That asymmetry used to be invisible and catastrophic. The band read the curated
   Utah ballot for every visitor, and that ballot never fails — it falls back to a
   default Utah area. So a voter in Columbus was shown Celeste Maloy for "U.S.
   House · District 2", a Utah state senator for "State Senate · District 6" and a
   Utah state representative for "State House · District 15", headed "Your
   representatives · Columbus" and footed "3 of 3 seats resolved". Every row was a
   real person, correctly labelled, and none of them represented the reader.

   Now the district rows go blank outside Utah, the statewide rows fill in, the
   count runs over the seats actually shown, and scopeNote() says which seats need
   district lines and which do not — so a blank reads as a boundary we respect
   rather than as a site that knows nothing about the reader's state.

   The cold-state markup — headline, supporting line and the primary CTA — is
   STATIC in index.html, not painted here. The entry point has to exist at first
   paint even if this file never loads, because an entry point that depends on a
   deferred script is exactly the kind of thing that quietly stops being an entry
   point. This module only adds the warm state on top of it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SECTION_ID = 'who-represents-me';
  var BODY_ID = 'wrm-reps';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // ── The one action every entry point calls ─────────────────────────────────
  // Nav pill, homepage CTA and the Team Builder's step ① all route here, so the
  // lookup behaves identically wherever it was started from: land on the front
  // door, and — only if there is no location yet — open the picker the rest of
  // the app already uses. It never invents its own picker and never writes a
  // location; it hands off to whichever of the two existing openers is present.
  window.pdxFindMyReps = function () {
    var sec = document.getElementById(SECTION_ID);
    if (sec && sec.scrollIntoView) {
      try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { sec.scrollIntoView(true); }
    }
    if (window._hasUserLocation) return;
    setTimeout(function () {
      var open = window.openLocationModal || window.toggleChangeLocation;
      if (typeof open === 'function') { try { open(); } catch (e) {} }
    }, 260);
  };

  // ── One representative row ─────────────────────────────────────────────────
  // Resolved: photo, name, party letter, office, district — and the whole row is
  // the control that opens their record, because "see their record" is the next
  // step the section promised. Unresolved: the same row shape, muted, saying so
  // in plain words. The party letter is an identifier printed beside a name, the
  // way a ballot prints it; nothing on this surface groups, scores or ranks by
  // it, and no copy here frames a record in terms of it.
  //
  // An unresolved row says which KIND of gap it is, because the two are not the
  // same admission. A statewide seat is always locatable — every state has two
  // senators and a governor — so a blank one means PolitiDex holds no record for
  // the person in it. A district seat blank means the seat could not be placed at
  // all. Reading "not resolved for your area" against a U.S. Senate row would be
  // simply untrue: the area is the state, and we have it.
  function row(lv) {
    var person = (lv.pid && typeof window._pdxPersonById === 'function')
      ? window._pdxPersonById(lv.pid) : null;
    var color = lv.color || '#60a5fa';

    if (!person) {
      var headline = lv.statewide ? 'No record on file yet' : 'Not resolved for your area yet';
      var sub = lv.statewide
        ? 'We&rsquo;d rather leave this blank than name the wrong person.'
        : 'We&rsquo;d rather leave this blank than guess at your seat.';
      return '<div class="wrm-row wrm-row--unresolved" style="border-left-color:' + color + '66;">' +
        '<span class="wrm-avatar wrm-avatar--empty" aria-hidden="true">🏛</span>' +
        '<span class="wrm-rowtext">' +
          '<span class="wrm-rowlevel" style="color:' + color + 'cc;">' + esc(lv.distLabel) + '</span>' +
          '<span class="wrm-rowname wrm-rowname--muted">' + headline + '</span>' +
          '<span class="wrm-rowsub">' + sub + '</span>' +
        '</span>' +
      '</div>' + seatCompare(lv);
    }

    var photo = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(lv.pid) || '') : '';
    var party = partyMark(person.party);
    var pid = jsq(lv.pid);
    var go = 'window.showProfile&&window.showProfile(\'' + pid + '\')';
    var avatar = photo
      ? '<span class="wrm-avatar" style="border-color:' + color + ';"><img src="' + esc(photo) + '" alt="" loading="lazy"></span>'
      : '<span class="wrm-avatar wrm-avatar--empty" style="border-color:' + color + '99;" aria-hidden="true">🏛</span>';

    return '<div class="wrm-row" role="button" tabindex="0" style="border-left-color:' + color + ';"' +
        ' onclick="' + go + '"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + go + '}"' +
        ' title="See ' + esc(person.name) + '&rsquo;s full record">' +
      avatar +
      '<span class="wrm-rowtext">' +
        '<span class="wrm-rowlevel" style="color:' + color + ';">' + esc(lv.distLabel) + '</span>' +
        '<span class="wrm-rowname">' + esc(person.name) + party + '</span>' +
        '<span class="wrm-rowsub">' + esc(person.office || lv.tierLabel) + '</span>' +
      '</span>' +
      '<span class="wrm-rowgo" style="color:' + color + ';">See their record ›</span>' +
    '</div>' + seatCompare(lv);
  }

  // ── "Compare field for this seat" ──────────────────────────────────────────
  // The row answers "who holds this seat". This answers the question a voter
  // asks next and could not ask here before: "and who else is running for it?"
  // It is a SIBLING of the row rather than a control inside it, because the row
  // is already a role="button" and nesting an interactive element inside one is
  // both invalid and unreachable by keyboard. .wrm-rows is a flex column, so a
  // sibling simply becomes the next item in the list.
  //
  // Rendered from window.pdxRaceSheetEntry, which returns '' for any seat the
  // sheet cannot enumerate a field for — so this file never paints a button that
  // leads nowhere, and it degrades to exactly today's markup if race-sheet.js
  // has not loaded. It states no verdict and no number, which keeps this file's
  // standing promise (see the header) intact.
  //
  // The strip itself comes from window.pdxSeatStrip, which owns the whole seat
  // contract — team slot, compare control, and the one stance line for a visitor
  // with no positions — so this file, the Voter Hub strip and any future seat
  // list cannot drift apart on it. Falls back to the bare entry button if only
  // the older helper is present, and to nothing at all if neither is.
  function seatCompare(lv) {
    if (!lv) return '';
    var html = '';
    if (typeof window.pdxSeatStrip === 'function') html = window.pdxSeatStrip(lv.key, { compact: true });
    else if (typeof window.pdxRaceSheetEntry === 'function') html = window.pdxRaceSheetEntry(lv.key, { compact: true });
    if (!html) return '';
    return '<div class="wrm-seatcompare">' + html + '</div>';
  }

  function partyMark(p) {
    if (!p) return '';
    var s = String(p).trim().toLowerCase();
    var m = null;
    if (s === 'r' || s === 'gop' || s.indexOf('republican') !== -1) m = { l: 'R', c: '#f87171' };
    else if (s === 'd' || s.indexOf('democrat') !== -1) m = { l: 'D', c: '#60a5fa' };
    else if (s === 'f' || s.indexOf('forward') !== -1) m = { l: 'F', c: '#22d3ee' };
    else if (s === 'l' || s.indexOf('libertarian') !== -1) m = { l: 'L', c: '#fbbf24' };
    else if (s === 'g' || s.indexOf('green') !== -1) m = { l: 'G', c: '#4ade80' };
    else if (s === 'i' || s.indexOf('independent') !== -1 || s.indexOf('unaffiliated') !== -1) m = { l: 'I', c: '#a78bfa' };
    if (!m) return '';
    return ' <span class="wrm-party" style="color:' + m.c + ';">(' + m.l + ')</span>';
  }

  // ── After the lookup: the three next steps, in the stated order ────────────
  // Records first, because that is what the supporting line promised. Team
  // building is present and clearly optional, which is the reorder this whole
  // pass is about — it is a step the visitor may take, not the price of entry.
  //
  // The local-officials handoff is conditional. Local seats are curated for the
  // same areas the district seats are, so offering it to a visitor whose district
  // seats came back blank sends them to a surface that cannot answer for them
  // either — a dead end dressed as a next step. Where it cannot be honoured it is
  // not offered.
  function nextActions(localOk) {
    return '<div class="wrm-next">' +
      '<div class="wrm-nextlabel">What now?</div>' +
      '<div class="wrm-nextrow">' +
        '<button type="button" class="wrm-next-btn wrm-next-btn--lead"' +
          ' onclick="var e=document.getElementById(\'issue-compare\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});">' +
          '⚖️ Compare them on an issue</button>' +
        '<button type="button" class="wrm-next-btn"' +
          ' onclick="var e=document.getElementById(\'my-politicians\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});">' +
          '⭐ Build my voting team <em>(optional)</em></button>' +
        (localOk
          ? '<button type="button" class="wrm-next-btn"' +
            ' onclick="window.jumpToRelevantAccordion&&window.jumpToRelevantAccordion(\'local\')">' +
            '🏙️ My local officials</button>'
          : '') +
      '</div>' +
      '<button type="button" class="wrm-changeloc"' +
        ' onclick="(window.openLocationModal||window.toggleChangeLocation||function(){})()">' +
        '📍 Change my location</button>' +
    '</div>';
  }

  // ── Saying what the blanks are ─────────────────────────────────────────────
  // Two very different things produce an unresolved row, and a reader cannot tell
  // them apart from the row itself:
  //
  //   · a seat PolitiDex holds no record for — nothing to say about that person
  //   · a seat PolitiDex cannot LOCATE, because the districts it maps are Utah's
  //
  // The second one is the whole reason a visitor outside Utah sees three blanks,
  // and leaving it unexplained reads as "this site has nothing on my state" when
  // the truth is narrower and much better: it has both senators and the governor,
  // and it declines to guess at the rest. So it is stated, next to the blanks it
  // explains. It is not an apology and it is not a coverage boast — it names which
  // seats resolve from a state and which need district lines we do not draw.
  function scopeNote(reps) {
    if (reps.districtsResolvable) return '';
    var blanks = reps.levels.filter(function (l) { return !l.statewide && !l.resolved; }).length;
    if (!blanks) return '';
    var st = reps.state ? esc(reps.state) : 'your state';
    var swFilled = reps.levels.filter(function (l) { return l.statewide && l.resolved; }).length;
    return '<p class="wrm-scopenote">' +
      (swFilled
        ? 'Your <strong>statewide seats</strong> are resolved &mdash; those are elected by all of ' + st +
          ', so your state is all we need. '
        : '') +
      'Your <strong>U.S. House, State Senate and State House</strong> seats need district lines, and ' +
      'PolitiDex only maps districts in Utah so far. Those rows are left blank on purpose: we would ' +
      'rather show you nothing than show you someone else&rsquo;s district.' +
    '</p>';
  }

  // ── Paint ──────────────────────────────────────────────────────────────────
  // Fails closed in both directions: no section, no resolver, or no location and
  // the warm block is emptied and the section drops back to the static cold
  // state that shipped in the HTML. There is no partial state where the visitor
  // sees rep rows and no way to have got them.
  function sync() {
    var sec = document.getElementById(SECTION_ID);
    var host = document.getElementById(BODY_ID);
    if (!sec || !host) return;

    var reps = (typeof window.pdxRepsForMe === 'function') ? window.pdxRepsForMe() : null;
    if (!reps || !reps.located || reps.national) {
      sec.removeAttribute('data-located');
      host.innerHTML = '';
      return;
    }

    var rows = reps.levels.map(row).join('');
    var area = reps.area ? esc(reps.area) : '';
    var resolved = reps.levels.filter(function (l) { return l.resolved; }).length;

    // The count is stated plainly rather than implied by the row list, so a
    // partial answer reads as partial. It counts over the levels ACTUALLY SHOWN —
    // six seats, not the three the band used to know how to look for — so a
    // visitor outside Utah reads "3 of 6" and a visitor in Utah reads "6 of 6".
    // The line below it names what is out of scope, and scopeNote() names why the
    // blanks are blank.
    host.innerHTML =
      '<div class="wrm-result">' +
        '<div class="wrm-resulthd">' +
          '<span class="wrm-resultkicker">Your representatives' + (area ? ' · ' + area : '') + '</span>' +
          '<span class="wrm-resultcount">' + resolved + ' of ' + reps.levels.length + ' seats resolved</span>' +
        '</div>' +
        // The whole election path in six words, above the rows it describes.
        // Every seat below carries the same three-part strip, so this line is a
        // legend for the list rather than a slogan.
        '<p class="wrm-spine">Your seats \u2192 compare the field \u2192 pick for your team.</p>' +
        '<div class="wrm-rows">' + rows + '</div>' +
        (reps.redrawn
          ? '<p class="wrm-redrawn">Your U.S. House district was redrawn for 2026. The name above is who represents you <strong>right now</strong>; the Voter Hub shows the district you&rsquo;ll actually vote in.</p>'
          : '') +
        scopeNote(reps) +
        nextActions(!!reps.districtsResolvable) +
      '</div>';
    sec.setAttribute('data-located', '1');
  }

  window.PDXWhoRepresentsMe = { sync: sync, focus: function () { window.pdxFindMyReps(); } };

  // The Voter Hub calls sync() directly from _vhSyncBanner on every location
  // change; these are only for the first paint and for anything that sets a
  // location before this file has loaded.
  function boot() {
    sync();
    [600, 1800, 4000].forEach(function (ms) { setTimeout(sync, ms); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
