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
   It owns presentation and the lookup's global actions — window.pdxFindMyReps,
   and the seats-card controls documented over cardData() below. It owns no
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
  // The one location setter, at the top of this band (index.html).
  var LOCBAR_ID = 'wrm-locbar';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function jsq(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // Scroll one element into view, whichever of the two APIs the engine has.
  function bring(el) {
    if (!el || !el.scrollIntoView) return false;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { el.scrollIntoView(true); }
    return true;
  }

  // ── IS THE PICKER ON THIS DOCUMENT? ────────────────────────────────────────
  // It is not, any more. #change-location-form moved to /find, which means both
  // openers below are NAVIGATIONS now rather than a modal appearing over this
  // band — voter-hub-location.js takes the reader to the picker's own document
  // when the markup is absent, which is the whole point of the move: a location
  // tap costs the finder instead of 1.6 MB of front page.
  //
  // WHICH MAKES THE SCROLL-THEN-OPEN WRONG, AND ONLY IN THIS CASE. The comment
  // under pdxSetLocation is still exactly right when the picker is here: a modal
  // over an unscrolled page leaves the reader, on dismissal, beside a button that
  // looks like it did nothing. But scrolling to a bar and then leaving the
  // document 260 ms later is a lurch followed by a navigation — the reader gets
  // the animation for a surface they never see. So when the picker is elsewhere
  // the openers are called immediately and nothing is scrolled.
  //
  // IT IS A FEATURE TEST, NOT A PAGE TEST, and stays correct in both directions:
  // the day the picker comes back to this document, or a second document grows
  // the band without the form, this asks the DOM rather than a list of paths.
  function pickerIsHere() {
    try { return !!document.getElementById('change-location-form'); } catch (e) { return false; }
  }

  // Open whichever picker the app offers, now or after the scroll settles.
  function openPicker(fn) {
    if (!pickerIsHere()) { try { fn(); } catch (e) {} return; }
    setTimeout(function () { try { fn(); } catch (e) {} }, 260);
  }

  // ══ THE DOOR THE READER CAME THROUGH IS THE DOOR THEY COME BACK TO ════
  // Both openers below end on /find, because that is where the picker lives.
  // Left to voter-hub-location.js they get there via PDXReturn.finderHref(here()),
  // and here() on this document is '/' — so a reader who pressed "Change on
  // map" from inside Who-Represents-Me came back to the TOP of the front page
  // with the arrival chrome running, several thousand pixels above the band they
  // asked their question in. They set a district and were shown a homepage.
  //
  // SO THIS WALKS TO THE FINDER ITSELF, AND SENDS NO next. That is the whole
  // mechanism: PDXReturn.settled() already falls back to '/' + FRAGMENT, which
  // is this section's own anchor, and a missing intent is how you ask for it.
  // Naming the destination here instead would duplicate a rule that module owns.
  //
  // AND IT IS FIXED AT THE KICKOFF RATHER THAN INSIDE PDXReturn, because next=/
  // is not wrong for everybody who sends it: the welcome flow and Start Here
  // both pass it and genuinely do want the front page's onboarding when they
  // come back. Only this band wants the band.
  function goFinder() {
    var to = '/find';
    try {
      var R = window.PDXReturn;
      if (R && R.FINDER) to = R.FINDER;
    } catch (e) { to = '/find'; }
    try { window.location.assign(to); } catch (e) {}
  }

  // ── The one action every entry point calls ─────────────────────────────────
  // Nav pill, homepage CTA and the Team Builder's step ① all route here, so the
  // lookup behaves identically wherever it was started from: land on the front
  // door, and — only if there is no location yet — open the picker the rest of
  // the app already uses. It never invents its own picker and never writes a
  // location; it hands off to whichever of the two existing openers is present.
  window.pdxFindMyReps = function () {
    // WHERE THIS LANDS DEPENDS ON WHAT IS MISSING, because the two readers who
    // press it want opposite things. With no location the answer is the setter:
    // scrolling to the top of the band would put the section heading on screen
    // and the one control that can help below the fold. With a location the
    // answer is the seats — the reader already told us where they are and is
    // asking who holds the seats, not to be shown the address form again.
    var sec = document.getElementById(SECTION_ID);
    if (window._hasUserLocation) {
      if (!bring(document.getElementById(BODY_ID))) bring(sec);
      return;
    }
    if (!pickerIsHere()) { goFinder(); return; }
    if (!bring(document.getElementById(LOCBAR_ID))) bring(sec);
    openPicker(function () {
      var open = window.openLocationModal || window.toggleChangeLocation;
      if (typeof open === 'function') open();
    });
  };

  // ── ONE SETTER, AND THIS IS THE DOOR TO IT ─────────────────────────────────
  // The page used to carry three location cards: this band's, the Voter Hub's,
  // and the one the "Relevant to Me" empty state painted — each with its own
  // Detect and its own map button, each able to be the one the reader last
  // touched. There is one now, at the top of this band, and every other control
  // on the page that used to open a picker of its own comes through here
  // instead: scroll to the setter, then open the picker it offers.
  //
  // WHY SCROLL FIRST AND OPEN SECOND. A modal that appears over a page the
  // reader did not scroll leaves them, on dismissal, exactly where they were —
  // which is next to a "set your location" button that now looks like it did
  // nothing. Landing on the setter means the surface that owns the answer is
  // what is behind the picker and what is there when it closes.
  //
  // mode 'form' asks for the typed-address panel, 'map' for the district map,
  // and no argument takes whichever the app offers by default.
  window.pdxSetLocation = function (mode) {
    // The picker is on another document, so the mode is moot: /find opens on its
    // map with the address box above it, which is both doors at once. What
    // matters is that the reader is returned HERE, and that is what goFinder
    // buys over letting the openers compose next=/ for us.
    if (!pickerIsHere()) { goFinder(); return; }
    var bar = document.getElementById(LOCBAR_ID);
    if (!bring(bar)) bring(document.getElementById(SECTION_ID));
    openPicker(function () {
      if (mode === 'map' && typeof window.toggleChangeLocation === 'function') {
        window.toggleChangeLocation();
        return;
      }
      if (mode === 'form' && typeof window.openLocationModal === 'function') {
        window.openLocationModal({ forceForm: true });
        return;
      }
      var open = window.openLocationModal || window.toggleChangeLocation;
      if (typeof open === 'function') open();
    });
  };

  // ── The display record behind a resolved pid ───────────────────────────────
  // ONE PERSON, TWO SPELLINGS, AND ONLY ONE OF THEM IS IN CMP_DATA.
  //
  // This row used to ask window._pdxPersonById() and nothing else, which reads
  // exactly one map: the bundled CMP_DATA. That map is keyed by the CANONICAL
  // pid, and the resolver upstream of here does not promise one — a roster row
  // that arrived from a live PROFILES payload carries whatever document id that
  // payload was filed under. PDX_PROFILE_ALIAS exists because this repo has
  // already ruled on those pairs: `scott_chew` is the retired Firestore key of
  // the record filed under `chew_h68`, Utah House District 68.
  //
  // So a Vernal reader whose State House row resolved the retired spelling got a
  // row painted as resolved, correctly linked to Chew's file, headed with the raw
  // id as the name. Not a coverage lie — the pid gate above is right, and a name
  // we have not loaded is a loading problem — but we HAVE that name, under the
  // other spelling, and /voice prints it.
  //
  // THE FIX IS NOT A SECOND ALIAS TABLE HERE. window.pdxRosterRec() is the
  // resolver's own alias-aware join, and /voice's personOf() asks it first for
  // this exact reason. This asks it in the same order, so the two surfaces can
  // only ever print the same name for the same seat: the join, then the bundled
  // reader, then the raw maps for a boot where neither landed. A record without
  // a name is kept as a fallback rather than returned, because a later lane may
  // hold the named one and the last thing a row wants is the first thin hit.
  function named(r) { return !!(r && r.name); }
  function personOf(pid) {
    if (!pid) return null;
    var first = null, r = null;
    try { r = (typeof window.pdxRosterRec === 'function') ? (window.pdxRosterRec(pid) || null) : null; }
    catch (e) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    try { r = (typeof window._pdxPersonById === 'function') ? (window._pdxPersonById(pid) || null) : null; }
    catch (e2) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    try { r = (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e3) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    try { r = (window.PROFILES && window.PROFILES[pid]) || null; } catch (e4) { r = null; }
    if (named(r)) return r;
    if (r && !first) first = r;
    return first;
  }

  // ── THE PID THAT MAY SIT ON THIS SEAT ──────────────────────────────────────
  // district-voice.js's seatPidFor() is the ONE walk from a resolved level to the
  // pid its card is allowed to name, and /voice's seat list goes through the same
  // function — so the band and the hallway cannot disagree about who the reader's
  // senator is in one visit. It drops a pid whose own record claims another
  // district, prefers the chamber-and-number-keyed district table where the
  // resolver's pid is unverifiable or too thin to name, and hands back the
  // resolver's own answer everywhere else.
  //
  // WHERE THE HALLWAY IS NOT ON THE DOCUMENT, THE PID AS PUBLISHED STANDS.
  // index.html carries district-voice.js, but a missing module is a loading fact
  // and never a vacancy — the same reading this file already applies to a roster
  // that has not arrived. Both readers of a seat pid in this file ask THIS: the
  // row, and the shareable seats card, which prints a district label beside a
  // name and would otherwise carry the same wrong member into somebody's
  // messages.
  function seatPid(lv, reps) {
    if (!lv) return null;
    try {
      if (window.PDXVoice && typeof window.PDXVoice.seatPidFor === 'function') {
        return window.PDXVoice.seatPidFor(lv, reps && reps.state) || null;
      }
    } catch (e) { return lv.pid || null; }
    return lv.pid || null;
  }

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
  //
  // WHAT COUNTS AS RESOLVED IS THE PID, AND ONLY THE PID
  // ────────────────────────────────────────────────────
  // This row used to blank on `!person` — on the light roster failing to return a
  // DISPLAY record — which is a completely different fact from the seat resolver
  // failing to name a holder. A Layton reader met the consequence: both U.S.
  // Senate rows and the Governor row printed "NO RECORD ON FILE YET / we'd rather
  // leave this blank than name the wrong person" while Mike Lee, John Curtis and
  // Spencer Cox each had a full file one tap away at /p/lee, /p/curtis and
  // /p/cox. That sentence is an admission about OUR coverage; printing it over
  // somebody we hold a file for is simply a false statement about the app.
  //
  // So the gate is `lv.pid`. A pid means a person and a record address, and the
  // row is painted as resolved — with the display record where the roster has one
  // and with the id itself where it has not yet merged, because a name we have not
  // loaded is a loading problem and never a coverage claim. The blank copy is
  // reachable only where the resolver returned nothing at all.
  //
  // AND THE PID MUST BELONG TO THE NUMBER THIS ROW PRINTS. `lv.pid` on sight is
  // how the senate row came to read "Jerry Stevenson" under a District 7
  // heading: inside Utah the resolver's first source for a legislative pid is
  // the curated county slate, the Davis slate carries SD-6 and HD-15, and
  // Layton is SD-7 / HD-16. So the pid comes through seatPid() below, and the
  // gate is still a pid — just a pid that is allowed to sit on the seat the row
  // is headed with.
  function row(lv, reps) {
    var pid = seatPid(lv, reps);
    var person = personOf(pid);
    var color = lv.color || '#60a5fa';

    if (!pid) {
      // ── THREE DIFFERENT GAPS, AND THEY ARE NOT THE SAME ADMISSION ──────────
      // This branch used to have two. A statewide row blank meant "we hold no
      // record for the person in it"; anything else meant "we could not place
      // your seat". There is a third, and it is the common one in Utah:
      //
      //     THE DISTRICT IS RESOLVED AND THE SEAT-HOLDER IS NOT.
      //
      // A reader who pins State House 4 in the finder has that number in their
      // record, printed in their Voting Districts strip, printed on the trigger
      // card, and printed at the top of this very row by lv.distLabel — and the
      // row underneath it then said "Not resolved for your area yet. We'd rather
      // leave this blank than guess at your seat." Two statements about the same
      // seat, three lines apart, and the louder one was false: nothing was
      // guessed and the area resolved fine. What is missing is a person, which
      // is a fact about OUR roster and not about their address.
      //
      // Told the truth, the row also stops sending the reader back to the
      // finder to fix something the finder already did.
      var located = !lv.statewide && lv.district != null && String(lv.district) !== '';
      var headline = lv.statewide
        ? 'No record on file yet'
        : (located ? 'District ' + esc(lv.district) + ' \u2014 no member on file yet'
                   : 'Not resolved for your area yet');
      // A FOURTH DISTINCTION, AND IT IS ABOUT OUR MAP RATHER THAN THEIR ADDRESS.
      // lv.mapped says whether this seat's geography is one we draw for the
      // reader's state at all: the U.S. House is mapped in every state now, the
      // two legislative chambers in Utah only. So an unresolved seat splits in
      // two. A MAPPED one is a seat the finder can fill in from district lines we
      // already have, and telling the reader to leave it blank would be advice
      // against our own coverage. An UNMAPPED one is our gap, and it keeps the
      // admission it has always carried. The headline is deliberately the same
      // sentence in both cases: neither of them has a district, and neither of
      // them may read as though it does.
      var mapped = !!lv.mapped;
      var sub = lv.statewide
        ? 'We&rsquo;d rather leave this blank than name the wrong person.'
        : (located
            ? 'Your district is set. We just don&rsquo;t hold a file for whoever sits in this seat yet &mdash; nothing to fix on your end.'
            : (mapped
                ? 'We have the district lines for this seat &mdash; set your address in the district finder and it fills in. Nothing is guessed in the meantime.'
                : 'We&rsquo;d rather leave this blank than guess at your seat.'));
      var cls = 'wrm-row wrm-row--unresolved' + (located ? ' wrm-row--nomember' : '');
      return '<div class="' + cls + '" data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + '66;">' +
        '<span class="wrm-avatar wrm-avatar--empty"' +
          (located ? ' style="border-color:' + color + '66;"' : '') +
          ' aria-hidden="true">' + (located ? '📍' : '🏛') + '</span>' +
        '<span class="wrm-rowtext">' +
          '<span class="wrm-rowlevel" style="color:' + color + 'cc;">' + esc(lv.distLabel) + '</span>' +
          '<span class="wrm-rowname wrm-rowname--muted">' + headline + '</span>' +
          '<span class="wrm-rowsub">' + sub + '</span>' +
        '</span>' +
      '</div>' + seatCompare(lv) + districtRoom(lv, reps);
    }

    var name = (person && person.name) || pid;
    var photo = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(pid) || '') : '';
    var party = partyMark(person && person.party);
    var pidJs = jsq(pid);
    var go = 'window.showProfile&&window.showProfile(\'' + pidJs + '\')';
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
    var plAttrs = (PL && typeof PL.attrs === 'function') ? PL.attrs(pid) : '';
    var rowOpen = plAttrs
      ? '<a class="wrm-row" ' + plAttrs + ' data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + ';"' +
          ' title="See ' + esc(name) + '&rsquo;s full record">'
      : '<div class="wrm-row" role="button" tabindex="0" data-rk="' + esc(rkOf(lv)) + '" style="border-left-color:' + color + ';"' +
          ' onclick="' + go + '"' +
          ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + go + '}"' +
          ' title="See ' + esc(name) + '&rsquo;s full record">';

    return rowOpen +
      avatar +
      '<span class="wrm-rowtext">' +
        '<span class="wrm-rowlevel" style="color:' + color + ';">' + esc(lv.distLabel) + '</span>' +
        '<span class="wrm-rowname">' + esc(name) + party + '</span>' +
        '<span class="wrm-rowsub">' + esc((person && person.office) || lv.tierLabel) + '</span>' +
      '</span>' +
      '<span class="wrm-rowgo" style="color:' + color + ';">See their record ›</span>' +
    (plAttrs ? '</a>' : '</div>') + seatCompare(lv) + districtRoom(lv, reps);
  }

  // ── "District Voice" — the room for this district ──────────────────────────
  // MOUNT (a) of two. A SIBLING of the row for the same reason seatCompare() is
  // one: the row is itself the link to the officeholder's record, and a second
  // interactive element cannot be nested inside it.
  //
  // What it is NOT, and this is the whole point of putting it here rather than on
  // a person file: it is not a comment thread on the member named in the row
  // above. The room is keyed on (district, issue) and never on a pid, so it
  // survives the seat changing hands, and the row's own party letter, score and
  // Direction Match do not cross into it.
  //
  // Rendered by window.PDXDistrictRoom.seatMountHtml(), which answers '' for any
  // seat that composes no district key — a statewide row, an unmapped state, a
  // row the resolver could not place — so this file never paints an entry to a
  // room that does not exist, and it degrades to exactly today's markup when
  // district-room.js has not loaded.
  function districtRoom(lv, reps) {
    var DR = window.PDXDistrictRoom;
    if (!DR || typeof DR.seatMountHtml !== 'function') return '';
    try { return DR.seatMountHtml(lv, reps && reps.state) || ''; } catch (e) { return ''; }
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

  // ── YOUR FILE · the reader's own half of the comparison ────────────────────
  // Everything else in this row is a record to go and read. This one is the
  // reader's own eight positions, and it belongs here for the reason the row
  // exists at all: "compare them on an issue" needs a THEM and an ME, and until
  // now the band only ever offered the them.
  //
  // WHY IT HAD TO BE ADDED HERE AND NOT JUST IN THE COLD BLOCK. The band's other
  // "Your file" control lives in .wrm-cold, which `.wrm[data-located] .wrm-cold`
  // hides the moment a location resolves — so every returning visitor, i.e.
  // everyone who has ever used this band, had no way to reach their file at all.
  // The resolved action row is the one that is on screen for them.
  //
  // A REAL ANCHOR TO /me, WHICH IS NOW THE FILE'S ADDRESS. It used to be
  // <a href="#your-file" data-pdxyf-open="1"> — a hash that opened an overlay on
  // whatever document the reader was standing on, which meant the file had no
  // address of its own and this band shared it with an account menu that pointed
  // somewhere else entirely. /me is one document, one editor, and a link a reader
  // can copy, bookmark and press Back out of.
  //
  // THE ATTRIBUTE IS GONE FOR A MECHANICAL REASON, not just tidiness.
  // data-pdxyf-open is your-file.js's capturing open hook, and on a non-/me
  // document that hook now answers by redirecting to /me and returning false —
  // deliberately not claiming the click, because the navigation is already under
  // way. An anchor still carrying the attribute would therefore fire the
  // module's location.replace AND its own href: two navigations for one tap.
  function yourFileButton(hasWs) {
    return '<a class="wrm-next-btn' + (hasWs ? ' wrm-next-btn--sub' : '') + '"' +
      ' href="/me"' +
      ' title="Your positions on the issues \u2014 used to compare formal records. Not a vote, and not a district poll.">' +
      '\u{1F5C2}\uFE0F Your file</a>';
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

  // ══════════════════════════════════════════════════════════════════════════
  // THE SEATS CARD  ·  one object a reader can actually send someone
  // ──────────────────────────────────────────────────────────────────────────
  // Everything else this band produces is a destination: a row that opens a
  // profile, a button that scrolls to a compare, a link to /me. None of it
  // survives leaving the page. A reader who has just learned the six people with
  // power over them and wants to tell somebody has, until now, had exactly one
  // move available — screenshot the band — and a screenshot carries no address
  // back to the app and no way for the person receiving it to ask the same
  // question about themselves.
  //
  // So the band mints ONE card. It is a text block, not a composer and not a
  // board: the reader's state, the seats this record actually resolved, the
  // sitting names we hold, and two addresses — the finder, so the recipient can
  // ask the same question, and the district room, so the sender can go back to
  // theirs. It is the object people text.
  //
  // WHY A TEXT BLOCK AND NOT AN IMAGE. The brief allowed either. An image is the
  // richer artifact and it is also a canvas pipeline with its own failure modes
  // (a zero-byte PNG that shares "successfully" — see PDXShareLinks.blobOk, which
  // exists because that has happened here), a font-loading race, and a payload no
  // screen reader and no SMS preview can read. A text block is selectable,
  // quotable, pastes into any app, degrades to nothing worse than itself, and is
  // the form the thing is actually sent in. The card can grow an image later
  // without any of the below changing shape.
  //
  // WHAT IT MAY NOT DO
  // ──────────────────
  //   · It resolves nothing. Same window.pdxRepsForMe() read as the rows beside
  //     it, so the card and the band cannot name different people — the exact
  //     rule that made this band read one resolver in the first place.
  //   · It stores nothing. No new location key, no new preference, no counter.
  //   · It lists only seats that RESOLVED. A seat with no holder is not printed
  //     as a blank line, because a blank line in a text block someone forwards
  //     reads as a formatting bug rather than as an admission. The admission is
  //     made in words, underneath, and it says which KIND of gap it is — the
  //     same three-state grammar row() and scopeNote() already use.
  //   · It claims no score, no verdict, no percentage and no party frame, for the
  //     same reason nothing else in this file does.
  //
  // THE ADDRESSES ARE ABSOLUTE, APEX AND HTTPS, and they are literals here rather
  // than location.origin. Every other share builder in the app anchors on
  // origin() — correct, because those links open a record on whatever host the
  // reader is standing on. This card is different: it leaves the app entirely and
  // is pasted somewhere with no referrer and no session, so the host has to be
  // the public one. A card minted on a preview deploy or on localhost that
  // carried that host would send the recipient somewhere they cannot reach.
  var CARD_ORIGIN = 'https://politidex.fyi';
  var CARD_FIND = CARD_ORIGIN + '/find';
  var CARD_VOICE = CARD_ORIGIN + '/voice';

  // Is this seat one whose lines we can draw at all? The level says so itself
  // now (`mapped`), and the two resolver-wide flags are the fallback for a caller
  // — or a fixture — from before levels carried it. The distinction is the whole
  // point of the words under the card: "we do not draw your state's legislative
  // lines" and "you have not pinned your district" are different sentences, and
  // only one of them is something the reader can fix.
  function mappedOf(lv, reps) {
    if (!lv || lv.statewide) return true;
    if (typeof lv.mapped === 'boolean') return lv.mapped;
    return (lv.key === 'house') ? !!(reps && reps.congressMapped) : !!(reps && reps.districtsResolvable);
  }

  // ── The card, as data ─────────────────────────────────────────────────────
  // Returns null for every reader who must not get one: no resolver, no saved
  // location, the National standing, or a record that resolved no seat at all.
  // That last case is the one worth naming: a card reading "my seats" with no
  // seats on it is not a modest card, it is a claim the app failed to make good
  // on, and the honest answer is to offer no control rather than an empty object.
  //
  // Every seat line is built from lv.distLabel — the SAME string row() prints in
  // .wrm-rowlevel — so "the card matches the band" is a property of the data
  // rather than of two copies of a format agreeing by luck.
  // `reps` is passed in by every caller inside a paint, because sync() has
  // already done that walk and the resolver is not free — three unthreaded calls
  // per repaint (the row list, the button's existence test, the panel) is three
  // answers to a question with one answer. It is optional so the public
  // PDXWhoRepresentsMe.card() and the three window.pdxSeatsCard* handlers, which
  // run on a tap rather than inside a paint, can just ask.
  function cardData(reps) {
    if (!reps) {
      try { reps = (typeof window.pdxRepsForMe === 'function') ? window.pdxRepsForMe() : null; }
      catch (e) { reps = null; }
    }
    if (!reps || !reps.located || reps.national) return null;
    var levels = (reps.levels || []);

    var seats = [], unnamed = 0;
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      if (!lv || !lv.resolved || !lv.pid) continue;
      // THE SAME WALK THE ROWS USE, for the same reason and with one extra one:
      // this card is a thing a reader FORWARDS. A wrong name on it outlives the
      // visit. Where the walk drops a pid and nothing can replace it the seat
      // stays on the card with its true district label and no name, and the
      // unnamed count below says so.
      var cpid = seatPid(lv, reps);
      var person = cpid ? personOf(cpid) : null;
      var nm = (person && person.name) ? String(person.name) : '';
      if (!nm) unnamed++;
      seats.push({ key: lv.key, label: String(lv.distLabel || lv.label || ''), name: nm });
    }
    if (!seats.length) return null;

    var area = String(reps.area || '');
    var st = String(reps.state || '').trim();
    // THE STATE IS NAMED, even when the area already reads like an address. The
    // area is whatever the reader's record resolved to — "Bountiful, Davis
    // County", or a bare city — and none of those forms is guaranteed to carry
    // the state. On a card that is a real gap: "State Senate · District 23" is
    // an ambiguous line in forty-nine other places, and the recipient has no
    // page around it to disambiguate from. Appended rather than substituted, and
    // only when the area does not already say it, so a reader whose area IS the
    // state does not get it twice.
    var where = (area && st && area.indexOf(st) === -1) ? (area + ', ' + st) : (area || st || '');

    // ── The blanks, in words ─────────────────────────────────────────────────
    // One sentence per KIND of gap, and only for gaps this reader actually has.
    // None of them names a chamber that is not on the card: a card that omits a
    // seat and then prints its name in the apology has put the seat back, and a
    // reader forwarding it cannot tell which half to believe.
    var notes = [];
    var houseGap = null, legUnmapped = 0, legUnpinned = 0, swGap = 0;
    for (var j = 0; j < levels.length; j++) {
      var l = levels[j];
      if (!l || l.resolved) continue;
      if (l.statewide) { swGap++; continue; }
      // The LEVEL is kept rather than a flag, because the sentence below has to
      // ask it whether its lines are drawable and a stand-in object carrying only
      // the key would be asking the resolver-wide fallback instead of the answer
      // this seat came back with.
      if (l.key === 'house') { houseGap = l; continue; }
      if (mappedOf(l, reps)) legUnpinned++; else legUnmapped++;
    }
    if (unnamed) {
      notes.push(unnamed === 1
        ? 'One seat resolved to a member PolitiDex could not name when this card was made.'
        : unnamed + ' seats resolved to members PolitiDex could not name when this card was made.');
    }
    if (houseGap) {
      notes.push(mappedOf(houseGap, reps)
        ? 'My U.S. House district is not pinned in this record, so that seat is not on this card.'
        : 'My U.S. House district could not be drawn from this record, so that seat is not on this card.');
    }
    if (legUnmapped) {
      notes.push('PolitiDex draws state legislative lines in Utah only, so ' +
        (st ? st + '’s' : 'my state’s') + ' legislative seats are not on this card.');
    }
    if (legUnpinned) {
      notes.push('My state legislative districts are not pinned in this record, so ' +
        (legUnpinned === 1 ? 'that seat is' : 'those seats are') + ' not on this card.');
    }
    if (swGap) {
      notes.push(swGap === 1
        ? 'One of my statewide seats has no file on hand, so it is not on this card.'
        : swGap + ' of my statewide seats have no file on hand, so they are not on this card.');
    }

    // ── The text, which IS the artifact ──────────────────────────────────────
    // Built line by line rather than from a template so the blank-line rules are
    // explicit: exactly one blank line between the four blocks, and no trailing
    // whitespace, because this string is pasted into apps that render it raw.
    var L = [];
    L.push('My seats' + (where ? ' · ' + where : ''));
    L.push('');
    for (var k = 0; k < seats.length; k++) {
      L.push(seats[k].name ? (seats[k].label + ' — ' + seats[k].name) : seats[k].label);
    }
    if (notes.length) { L.push(''); for (var n = 0; n < notes.length; n++) L.push(notes[n]); }
    L.push('');
    L.push('Look up your own: ' + CARD_FIND);
    // /voice is the reader's own district room, and it is only an address for
    // somebody we have placed — which, at this point in the function, is every
    // reader who gets a card. It is stated as a condition anyway rather than
    // assumed, because the day this card is offered to an unplaced reader the
    // rule that /voice needs a location should still be written down here.
    if (reps.located) L.push('My district’s room: ' + CARD_VOICE);

    return {
      state: st, area: area, where: where,
      seats: seats, notes: notes, unnamed: unnamed,
      url: CARD_FIND, voiceUrl: reps.located ? CARD_VOICE : '',
      title: 'My seats · PolitiDex',
      text: L.join('\n')
    };
  }

  // ── Minting is the event ─────────────────────────────────────────────────
  // The thing worth counting is that a reader produced a card, not that they
  // pressed copy twice and share once afterwards. So one CustomEvent fires when
  // a card is BUILT, and it is deduped on the card's own text: re-opening the
  // same panel, or a repaint of the band with the panel open, is the same card
  // and not a second one. Change the location and the text changes and it mints
  // again, which is correct — that is a different card.
  //
  // The detail carries counts and the state, never a pid and never a name. A
  // listener that wanted to know WHO is in somebody's card can read the card;
  // an event bus does not need it.
  var _minted = '';
  function mint(card) {
    if (!card || card.text === _minted) return card;
    _minted = card.text;
    try {
      document.dispatchEvent(new CustomEvent('pdx:seats:card', {
        detail: {
          state: card.state, seats: card.seats.length,
          named: card.seats.length - card.unnamed, notes: card.notes.length
        }
      }));
    } catch (e) {}
    return card;
  }

  // ── Copy, the way the rest of the app copies ──────────────────────────────
  // Clipboard first, a hidden textarea second, and a boolean either way: the
  // caller's job is to say "this browser would not take it", never to throw on
  // the reader's tap.
  function copyText(str) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        return Promise.resolve(navigator.clipboard.writeText(str)).then(
          function () { return true; }, function () { return legacyCopy(str); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(str));
  }
  function legacyCopy(str) {
    try {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', 'readonly');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var done = document.execCommand ? document.execCommand('copy') : false;
      document.body.removeChild(ta);
      return !!done;
    } catch (e) { return false; }
  }

  function cardFlash(msg) {
    try {
      var el = document.getElementById('wrm-cardsaid');
      if (!el) return;
      el.textContent = msg;
      setTimeout(function () {
        var e2 = document.getElementById('wrm-cardsaid');
        if (e2 && e2.textContent === msg) e2.textContent = '';
      }, 2600);
    } catch (e) {}
  }

  // ── The panel ─────────────────────────────────────────────────────────────
  // Rendered INSIDE the band's own paint rather than as an overlay, because the
  // card is a thing the reader reads and selects before sending it, and an
  // overlay over a list of six seats hides the answer it is quoting. It is also
  // why the open flag is module state that sync() consults: the band repaints on
  // every location change and on the roster's arrival, and a panel that vanished
  // on a repaint would look like the app had eaten the card.
  //
  // The share control is only printed where navigator.share exists. A button
  // that opens nothing is worse than an absent button, and unlike
  // PDXShareAnywhere this control has no fixed-size hydration problem to solve:
  // it is painted once, on demand, after the reader asked for it.
  var _open = false;

  function nativeHere() {
    try { return typeof navigator.share === 'function'; } catch (e) { return false; }
  }

  function cardPanel(reps) {
    if (!_open) return '';
    var card = cardData(reps);
    if (!card) return '';
    mint(card);
    return '<div class="wrm-card" id="wrm-card" role="group" aria-label="My seats — a card you can send">' +
      '<div class="wrm-cardhd">' +
        '<span class="wrm-cardkicker">A card you can send</span>' +
        '<button type="button" class="wrm-cardx" onclick="window.pdxSeatsCardClose()"' +
          ' aria-label="Close the card">×</button>' +
      '</div>' +
      '<pre class="wrm-cardtext" id="wrm-cardtext">' + esc(card.text) + '</pre>' +
      '<div class="wrm-cardacts">' +
        (nativeHere()
          ? '<button type="button" class="wrm-cardbtn wrm-cardbtn--lead"' +
              ' onclick="window.pdxSeatsCardSend()">↱ Send it</button>'
          : '') +
        '<button type="button" class="wrm-cardbtn" onclick="window.pdxSeatsCardCopy()">' +
          '\u{1F4CB} Copy the card</button>' +
        '<button type="button" class="wrm-cardbtn" onclick="window.pdxSeatsCardCopyLink()">' +
          '\u{1F517} Copy the link</button>' +
      '</div>' +
      '<p class="wrm-cardsaid" id="wrm-cardsaid" role="status"></p>' +
      '<p class="wrm-cardnote">This is your own record, read back to you — the same six seats as above, ' +
        'nothing about how you would vote, and no positions from your file. Anyone who opens the link ' +
        'looks up their own seats, not yours.</p>' +
    '</div>';
  }

  // The one control on the band.
  function seatsCardButton(hasWs, reps) {
    if (!cardData(reps)) return '';
    return '<button type="button" class="wrm-next-btn' + (hasWs ? ' wrm-next-btn--sub' : '') + '"' +
      ' onclick="window.pdxSeatsCardOpen()"' +
      ' title="One card naming the seats this record resolved and the members in them. No positions, ' +
      'and nothing about how you would vote.">' +
      '\u{1F4E4} Share my seats</button>';
  }

  window.pdxSeatsCardOpen = function () {
    if (!cardData()) return false;
    _open = true;
    sync();
    try {
      var el = document.getElementById('wrm-card');
      if (el) bring(el);
    } catch (e) {}
    return true;
  };
  window.pdxSeatsCardClose = function () {
    _open = false;
    sync();
    return true;
  };
  window.pdxSeatsCardCopy = function () {
    var card = cardData();
    if (!card) return Promise.resolve(false);
    return copyText(card.text).then(function (done) {
      cardFlash(done
        ? 'Copied. Paste it anywhere.'
        : 'This browser would not take it to the clipboard — select the card above and copy it.');
      return done;
    });
  };
  window.pdxSeatsCardCopyLink = function () {
    var card = cardData();
    if (!card) return Promise.resolve(false);
    return copyText(card.url).then(function (done) {
      cardFlash(done ? 'Link copied: ' + card.url : 'The link is ' + card.url);
      return done;
    });
  };
  // Native share, through the app's one owner of navigator.share. PDXShareLinks
  // .native() resolves — never rejects — to one of five outcomes, so a refused
  // or failed sheet falls back to the clipboard and a DISMISSED one does nothing
  // at all: a reader who changed their mind did not ask for their card to be
  // copied behind their back.
  window.pdxSeatsCardSend = function () {
    var card = cardData();
    if (!card) return Promise.resolve({ ok: false, outcome: 'invalid' });
    var SL = null;
    try { SL = window.PDXShareLinks; } catch (e) { SL = null; }
    if (!SL || typeof SL.native !== 'function') return window.pdxSeatsCardCopy();
    return SL.native({ title: card.title, text: card.text, url: card.url }).then(function (res) {
      if (res && res.ok) { cardFlash('Sent.'); return res; }
      if (res && res.outcome === 'cancelled') return res;
      return window.pdxSeatsCardCopy();
    });
  };

  // ── Styles, injected here rather than added to index.html ─────────────────
  // Five documents carry byte-range copies of index.html blocks, pinned by LINE
  // NUMBER in four test files. Adding rules to the homepage's <style> — which
  // sits at line ~5900, above every one of those ranges — moves all of them, so
  // a three-rule stylesheet for a panel this file paints and nothing else reads
  // would cost a renumber across nine files. It belongs with its markup anyway:
  // the panel does not exist until this module runs.
  (function () {
    try {
      if (!document.createElement || document.getElementById('pdx-wrm-card-css')) return;
      var el = document.createElement('style');
      el.id = 'pdx-wrm-card-css';
      el.textContent =
        '.wrm-card{margin-top:0.6rem;padding:0.7rem 0.75rem;border-radius:12px;' +
          'border:1px solid rgba(96,165,250,0.32);background:rgba(15,23,42,0.62);}' +
        '.wrm-cardhd{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
        '.wrm-cardkicker{font-family:\'Barlow\',sans-serif;font-size:0.63rem;letter-spacing:0.16em;' +
          'text-transform:uppercase;color:#93b4de;font-weight:700;}' +
        '.wrm-cardx{background:none;border:0;color:#8ea6c4;cursor:pointer;font-size:1.05rem;' +
          'line-height:1;min-width:32px;min-height:32px;}' +
        '.wrm-cardx:hover{color:#e6edf7;}' +
        '.wrm-cardtext{margin:0.5rem 0 0;padding:0.6rem 0.65rem;border-radius:9px;' +
          'background:rgba(2,6,23,0.6);border:1px solid rgba(148,163,184,0.18);' +
          'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:0.72rem;' +
          'line-height:1.55;color:#dce7f5;white-space:pre-wrap;word-break:break-word;' +
          'user-select:all;-webkit-user-select:all;}' +
        '.wrm-cardacts{display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.55rem;}' +
        '.wrm-cardbtn{flex:1 1 8.5rem;display:inline-flex;align-items:center;justify-content:center;' +
          'gap:0.3rem;min-height:44px;padding:0.45rem 0.6rem;border-radius:9px;cursor:pointer;' +
          'font-family:\'Barlow\',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;' +
          'color:#b9cce4;background:rgba(148,163,184,0.09);border:1px solid rgba(148,163,184,0.26);}' +
        '.wrm-cardbtn:hover{color:#fff;background:rgba(96,165,250,0.16);border-color:rgba(96,165,250,0.5);}' +
        '.wrm-cardbtn--lead{color:#eaf3ff;background:rgba(59,130,246,0.18);' +
          'border-color:rgba(96,165,250,0.52);}' +
        '.wrm-cardsaid{margin:0.4rem 0 0;min-height:1em;font-family:\'Barlow\',sans-serif;' +
          'font-size:0.7rem;color:#8fd6a8;}' +
        '.wrm-cardnote{margin:0.45rem 0 0;font-family:\'Barlow\',sans-serif;font-size:0.68rem;' +
          'line-height:1.5;color:#93a6be;}' +
        '@media (max-width:480px){.wrm-cardbtn{flex:1 1 100%;}}';
      (document.head || document.documentElement).appendChild(el);
    } catch (e) {}
  })();

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
  function nextActions(cov, reps) {
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
          '\u2b50 Work your ballot <em>(optional)</em></button>' +
        localButton(cov) +
        yourFileButton(hasWs) +
        seatsCardButton(hasWs, reps) +
      '</div>' +
      cardPanel(reps) +
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
    // The U.S. House row is the one district seat this note can now offer a way
    // out of, so it is only addressed while it is actually blank.
    var houseBlank = reps.levels.some(function (l) { return l.key === 'house' && !l.resolved; });
    return '<p class="wrm-scopenote">' +
      (swFilled
        ? 'Your <strong>statewide seats</strong> are resolved &mdash; those are elected by all of ' + st +
          ', so your state is all we need. '
        : '') +
      // THE NOTE NARROWED WHEN THE MAP WIDENED. It used to group the U.S. House
      // in with the two legislative chambers as seats that "need district lines,
      // and PolitiDex only maps districts in Utah" — which was true when the
      // only congressional layer on the site was Utah's. The congressional map is
      // national now, so that sentence would understate our own coverage to a
      // reader whose U.S. House seat this band can answer. What is still Utah-only
      // is the STATE legislative geometry, so that is what the sentence says.
      (houseBlank
        ? 'Your <strong>U.S. House</strong> seat is resolved from district lines, and we have them '
          + 'for ' + st + ' &mdash; set your address in the district finder and that row fills in. '
        : '') +
      'Your <strong>State Senate and State House</strong> seats need state legislative district ' +
      'lines, and PolitiDex only maps state legislative districts in Utah so far. Those rows are ' +
      'left blank on purpose: we would rather show you nothing than show you someone else&rsquo;s ' +
      'district.' +
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

    var rows = reps.levels.map(function (lv) { return row(lv, reps); }).join('');
    var area = reps.area ? esc(reps.area) : '';
    var resolved = reps.levels.filter(function (l) { return l.resolved; }).length;
    // The seats whose DISTRICT we have and whose HOLDER we do not — the third
    // kind of gap row() now states. Counted here because the headline is where
    // "3 of 6" was doing the same conflation the rows were: a reader who had just
    // pinned three districts in the finder read a number that said nothing had
    // been placed. The districts were placed; the roster is what is short.
    var located = reps.levels.filter(function (l) {
      return !l.statewide && !l.resolved && l.district != null && String(l.district) !== '';
    }).length;

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
          '<span class="wrm-resultcount">' + resolved + ' of ' + reps.levels.length + ' seats resolved' +
            (located
              ? ' <span class="wrm-resultlocated">\u00b7 ' + located +
                (located === 1 ? ' district located, member not on file' : ' districts located, members not on file') +
                '</span>'
              : '') +
          '</span>' +
        '</div>' +
        // The whole election path in six words, above the rows it describes.
        // Every seat below carries the same three-part strip, so this line is a
        // legend for the list rather than a slogan.
        '<p class="wrm-spine">Your seats \u2192 compare the field \u2192 pick for your ballot.</p>' +
        '<div class="wrm-rows">' + rows + '</div>' +
        (reps.redrawn
          ? '<p class="wrm-redrawn">Your U.S. House district was redrawn for 2026. The name above is who represents you <strong>right now</strong>; the Voter Hub shows the district you&rsquo;ll actually vote in.</p>'
          : '') +
        scopeNote(reps) +
        nextActions(localCoverage(), reps) +
      '</div>';
    sec.setAttribute('data-located', '1');
  }

  // focus() with no argument is the old behaviour: scroll here, and open the
  // location modal if we still do not know where the reader is. With a race key
  // it also marks the seat that was asked for — the honest landing for a shared
  // race link whose sheet could not mount.
  window.PDXWhoRepresentsMe = {
    sync: sync,
    // The seats card, as data. Published so a test — and only a test — can read
    // the exact artifact the panel prints without driving a clipboard, and so a
    // future surface that wants to quote the card reads this rather than
    // re-deriving it from the levels and drifting.
    card: function () { return cardData(null); },
    _cardOpen: function () { return _open; },
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
  //
  // …AND ONE REPAINT THAT IS NOT ON A CLOCK. The statewide rows resolve from the
  // roster, and the roster is a deferred script: a cold phone can paint this band
  // before window.CMP_DATA has a single row in it, which is "3 of 6 seats
  // resolved" with both Senate rows and the Governor row blank over three people
  // we hold full files for. The three timeouts below were the only thing standing
  // between that paint and the truth, and a timeout is a guess about a network.
  // pdxRosterReady() is the resolver's own announcement that its input landed —
  // one owner, one moment, and it fires immediately if the roster was already
  // there, so the warm path costs one extra sync() and the cold path stops being
  // wrong. The count and every row are recomputed from the resolver, so nothing
  // here has to know WHICH seats were blank.
  function boot() {
    sync();
    [600, 1800, 4000].forEach(function (ms) { setTimeout(sync, ms); });
    try {
      if (typeof window.pdxRosterReady === 'function') window.pdxRosterReady(sync);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
