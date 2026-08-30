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
   county) are never claimed as ROWS here at all — they resolve through the
   Relevant-to-Me ballot. The handoff to that ballot is offered only where
   window.pdxLocalSeatsForMe() reports actual seats for this visitor's area, and
   where it reports none the band says so in a sentence instead of staying quiet
   or offering a button that cannot be honoured.

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
      return '<div class="wrm-row wrm-row--unresolved" data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + '66;">' +
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

    // THE WHOLE ROW IS THE LINK, and that is safe here in a way it is not on the
    // homepage card: this row has never contained an interactive element. The
    // "Compare field for this seat" control is a deliberate SIBLING of the row
    // rather than a child, for exactly the nesting reason documented under
    // seatCompare() below — which is what now lets the row become an <a> instead
    // of a role="button" div carrying two hand-rolled event attributes.
    //
    // What the reader gains: the seat row can be middle-clicked, opened in a new
    // tab, and copied as an address; the address of their own representative's
    // record is in the page rather than inside an onclick. What they keep: a plain
    // click still opens the in-app file, now through person-link.js's delegated
    // listener, and Enter works because it is a link rather than because of an
    // onkeydown handler that had to reimplement it.
    //
    // Falls back to the previous role="button" markup when person-link.js has not
    // loaded, so a seat row is never left without a way to open.
    var PL = window.PDXPersonLink;
    var plAttrs = (PL && typeof PL.attrs === 'function') ? PL.attrs(lv.pid) : '';
    var rowOpen = plAttrs
      ? '<a class="wrm-row" ' + plAttrs + ' data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + ';"' +
          ' title="See ' + esc(person.name) + '&rsquo;s full record">'
      : '<div class="wrm-row" role="button" tabindex="0" data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + ';"' +
          ' onclick="' + go + '"' +
          ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + go + '}"' +
          ' title="See ' + esc(person.name) + '&rsquo;s full record">';

    return rowOpen +
      avatar +
      '<span class="wrm-rowtext">' +
        '<span class="wrm-rowlevel" style="color:' + color + ';">' + esc(lv.distLabel) + '</span>' +
        '<span class="wrm-rowname">' + esc(person.name) + party + '</span>' +
        '<span class="wrm-rowsub">' + esc(person.office || lv.tierLabel) + '</span>' +
      '</span>' +
      '<span class="wrm-rowgo" style="color:' + color + ';">See their record ›</span>' +
    (plAttrs ? '</a>' : '</div>') + seatCompare(lv);
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
  // The race key this seat maps onto, taken from the race sheet's own alias table
  // rather than a second copy of it here. Used only as a target for the shared-
  // link fallback: a reader whose shared race could not mount lands on their own
  // seat list with the seat they were sent marked, instead of on a generic page.
  function rkOf(lv) {
    try {
      var sm = (window.PDXRaceSheet && window.PDXRaceSheet._seat) ? window.PDXRaceSheet._seat(lv.key) : null;
      return (sm && sm.key) || '';
    } catch (e) { return ''; }
  }

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

  // ── The local-officials handoff, gated on an ANSWER not an inference ───────
  // This button used to be gated on reps.districtsResolvable, which is true for
  // the whole of Utah. Local seats are not curated for the whole of Utah, so a
  // visitor in an area with no local roster was offered the button anyway, and
  // the jump it fired found no local group to open — landing them in the ballot
  // section whose first groups are President and Cabinet. Asking for your mayor
  // and being shown the federal cabinet is the worst kind of wrong answer,
  // because every name on it is real.
  //
  // So the gate is now window.pdxLocalSeatsForMe(), which counts the visitor's
  // actual local seats from the same membership test the ballot renders with, and
  // has three states rather than two:
  //
  //   not resolved  → no location yet. Offer nothing, say nothing.
  //   resolved, 0   → located, and we hold no local roster here. SAY SO.
  //   resolved, N   → located, N seats. Offer the button, and name the count so
  //                   the promise is checkable before it is tapped.
  //
  // The middle state is the point of this pass. Silence there reads as "this site
  // has no local layer"; a button there reads as a promise and breaks. A sentence
  // is the only honest option.
  function localCoverage() {
    try {
      if (typeof window.pdxLocalSeatsForMe !== 'function') return null;
      return window.pdxLocalSeatsForMe();
    } catch (e) { return null; }
  }

  function localButton(cov) {
    if (!cov || !cov.resolved || !cov.ok) return '';
    var n = (cov.pids && cov.pids.length) || 0;
    var sub = (typeof window.pdxBallotWorkspaceOpen === 'function') ? ' wrm-next-btn--sub' : '';
    return '<button type="button" class="wrm-next-btn' + sub + '"' +
      ' onclick="window.jumpToRelevantAccordion&&window.jumpToRelevantAccordion(\'local\')">' +
      '🏙️ My local officials <em>(' + n + ')</em></button>';
  }

  function localGapNote(cov) {
    if (!cov || !cov.resolved || cov.ok) return '';
    var where = cov.area ? esc(cov.area) : 'your area';
    return '<p class="wrm-localgap">' +
      '<strong>Local offices aren&rsquo;t mapped for ' + where + ' yet.</strong> ' +
      'Mayor, city council, school board and county seats are curated area by area, and this one ' +
      'isn&rsquo;t done. We would rather tell you that than hand you a list of people who don&rsquo;t ' +
      'represent you.' +
    '</p>';
  }

  // ── After the lookup: ONE lead, and the rest demoted ───────────────────────
  // This used to be a "What now?" label over three equal-weight buttons —
  // compare on an issue, build a team (optional), my local officials — plus a
  // change-location control, sitting under a list that had already offered a
  // compare control on every single row. Four peers at the end of a list of six
  // seats is not guidance; it is the reader being handed the product's own org
  // chart and asked to route themselves, and it is a large part of why Door 2
  // read as a brochure wrapped around a list.
  //
  // What changed is the HIERARCHY, not the inventory. There is now exactly one
  // lead action and it is the next step of the actual loop: continue into the
  // ballot workspace, where these same seats carry the field, the pick and a
  // running count. Everything that was here before is still here, one weight
  // down, because each of those three is a real destination and two of them are
  // load-bearing promises:
  //
  //   · "Compare them on an issue" is what the band's own supporting line
  //     promised, and it must keep preceding team-building — accountability
  //     before list-building is the order this band was reordered into.
  //   · "Build my voting team" stays marked optional. A visitor who came to look
  //     up their representatives is not required to build anything, and a band
  //     that hides the optionality funnels instead of offering.
  //   · "My local officials (N)" is the destination the scope note above depends
  //     on, and the count is what makes the promise checkable BEFORE the tap.
  //     Removing it turned that note into a dead end.
  //
  // The lead degrades to the team-builder jump when ballot-workspace.js has not
  // loaded, so the way forward never depends on a deferred file.
  function nextActions(cov) {
    // With the workspace loaded there is a lead and the older three sit under it.
    // Without it there is no lead to invent — the row falls back to EXACTLY the
    // shape that shipped before, compare-first, rather than promoting one of the
    // three into a slot it was never written for.
    var hasWs = (typeof window.pdxBallotWorkspaceOpen === 'function');
    var subCls = hasWs ? ' wrm-next-btn--sub' : '';
    var lead = hasWs
      ? '<div class="wrm-nextrow">' +
          '<button type="button" class="wrm-next-btn wrm-next-btn--lead"' +
            ' onclick="window.pdxBallotWorkspaceOpen(\'senate\')">' +
            '\u{1F5F3} Work my ballot \u2014 seat by seat</button>' +
        '</div>' +
        '<p class="wrm-nexthint">Every seat above has a <b>Work this seat</b> control \u2014 or take them ' +
          'in order, one at a time, and your picks save as you go.</p>'
      : '';
    return '<div class="wrm-next">' +
      lead +
      '<div class="wrm-nextrow' + (hasWs ? ' wrm-nextrow--sub' : '') + '">' +
        '<button type="button" class="wrm-next-btn' + (hasWs ? subCls : ' wrm-next-btn--lead') + '"' +
          ' onclick="var e=document.getElementById(\'issue-compare\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});">' +
          '\u2696\ufe0f Compare them on an issue</button>' +
        '<button type="button" class="wrm-next-btn' + subCls + '"' +
          ' onclick="var e=document.getElementById(\'my-politicians\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});">' +
          '\u2b50 Build my voting team <em>(optional)</em></button>' +
        localButton(cov) +
      '</div>' +
      localGapNote(cov) +
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
        nextActions(localCoverage()) +
      '</div>';
    sec.setAttribute('data-located', '1');
  }

  // focus() with no argument is the old behaviour: scroll here, and open the
  // location modal if we still do not know where the reader is. With a race key
  // it also marks the seat that was asked for — the honest landing for a shared
  // race link whose sheet could not mount.
  window.PDXWhoRepresentsMe = {
    sync: sync,
    focus: function (seatKey) {
      window.pdxFindMyReps();
      var rk = String(seatKey || '').replace(/[^a-z0-9_]/gi, '');
      if (!rk) return;
      setTimeout(function () {
        try {
          var el = document.querySelector('.wrm-row[data-rk="' + rk + '"]');
          if (!el) return;
          el.classList.add('wrm-row--focus');
          if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
      }, 180);
    }
  };

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
