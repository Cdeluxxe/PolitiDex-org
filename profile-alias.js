/* ═══════════════════════════════════════════════════════════════════════════
   profile-alias.js — the retired-key bridge, for documents that carry no
   profile-evidence.js
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS BROKEN. /voice printed "No sitting member on hand for this seat" on
   the Utah State House card for a reader whose Who Represents Me band, on the
   front page, named the member by name. Lapoint read HD-68 with no member;
   index.html read HD-68 as Scott Chew. Same reader, same seat, same resolver,
   two answers — and the empty one is the sentence that means "nobody holds
   this", so the hallway said a seat was vacant that is not.

   It was not the seat list. pdxRepsForMe() is the one seat list and both
   surfaces read it. What differed was the ROSTER the resolver's own gate could
   key. On a lean document the only people index is the live Firestore one
   (window.PROFILES), and for a handful of officeholders the live document is
   filed under the slug of their display name rather than under the roster id
   the seat resolves to: `scott_chew` holds the document, `chew_h68` holds the
   record. _pdxRosterKeeps() asked window.PROFILES for `chew_h68`, got nothing,
   and concluded the member had left the roster — so the resolver dropped a pid
   it had correctly resolved, and the card printed the empty sentence.

   The repo has ruled on this: PDX_PROFILE_ALIAS is its standing assertion that
   the id on the left names the SAME officeholder as the id on the right — one
   Chew, one file, at /p/chew_h68 (profile-evidence.js, person-file's canonId,
   the /p/ arrival path, data-hygiene's _hyCanonId, test-chew-identity.mjs). The
   ruling was simply not readable on /voice, because the file that declares it is
   68 KB of Evidence Locker machinery and voice.html deliberately loads none of
   it (no app.css, no compare-hub.js, no ballot-breakdown.js, no cmp-data.js).

   WHAT THIS FILE IS. That one table, and nothing else, small enough to put on a
   lean document: 2 KB in place of 68 KB. It declares no resolver, reads no
   record, composes no label and names no seat. Every consumer of it is
   elsewhere and unchanged — window.PDXProfilePid (profile-evidence.js) on the
   documents that have it, and voter-hub-location.js's roster gate, which now
   asks the table which OTHER keys a roster row for a pid may be filed under
   before it concludes a member has left office.

   ONE LITERAL, COPIED ONCE, PINNED BYTE FOR BYTE. The table below is copied
   VERBATIM out of profile-evidence.js — same lines, same indentation, same
   trailing commas — and scripts/test-voice-house-member.mjs fails if the two
   stop being byte-identical. That is the same discipline index.html's head
   prefetch already keeps for its own PROFILE_ALIASES mirror of this table
   (scripts/test-person-file-perf.mjs), and it is why nothing here can drift into
   a second opinion about who is one person. profile-evidence.js remains the
   source: it is the file with the reasoning, the entries are added there, and
   this copy is re-derived from it rather than edited by hand.

   AND THE ASSIGNMENT IS GUARDED, IN BOTH DIRECTIONS. Both this file and
   profile-evidence.js write `window.PDX_PROFILE_ALIAS || {…}`, so on a document
   that carries both — index.html, person.html, issue.html, evidence.html —
   whichever runs first wins and the second is a no-op. There is one table in the
   window on every document, whatever the script order.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // COPIED VERBATIM FROM profile-evidence.js LINES 351–415.
    window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {
      // curated keys with no roster record of their own
      kivory:    'ivory_h39',
      wharper:   'harper_s16',
      seliason:  'eliason_h45',
      klisonbee: 'lisonbee_h14',
      dmccay:    'mccay_s11',
      jteuscher: 'teuscher_h44',
      // short browse / catalog pids whose ACCT_ALIAS entry targets one of those
      ken_ivory: 'ivory_h39',
      eliason:   'eliason_h45',
      teuscher:  'teuscher_h44',
      lisonbee:  'lisonbee_h14',
      mccay:     'mccay_s11',
      // Stance-block keys. Each is a slug of the roster record's own display name
      // — the documented stance-key convention (db/vr-pid-aliases.json), where 24
      // of the 25 Utah "surface splits" turned out to be ONE record whose curated
      // block is keyed on the name slug, not two identities. So these are reverse
      // bridges, exactly like the ACCT ones above, and not merges:
      // _resolveStanceList(rosterId) already returns the block filed under the key
      // on its left. Without them a Stance Library row, a comparison-board dot and
      // an issue-view chip all opened nothing.
      // CANONICAL: defay_h15 — Utah House District 15, Layton and Davis County,
      // and the roster hole sw.js v232 and v233 both recorded rather than filled.
      // `ariel_defay` is the slug of that record's own display name; ACCT_ALIAS
      // has held the same pair since the July 2026 surface-split sweep, so this
      // is not a new claim about who is one person — it is the same ruling made
      // readable to the reverse read voter-hub-location.js's roster gate does,
      // which is the read that decides whether /voice can NAME the member of a
      // seat it has already resolved. Without it a lean document whose only
      // people index files the full document under `ariel_defay` asked for
      // `defay_h15`, got nothing, and either un-named HD-15 or described it —
      // "The member who holds this seat is on file" over a person one key away.
      ariel_defay:      'defay_h15',
      bridger_bolinder: 'bolinder_h68',
      casey_snider:     'snider_h5',
      cory_maloy:       'cory_maloy_h52',
      curt_bramble:     'cbramble',
      don_ipson:        'dipson',
      jerry_stevenson:  'jstevenson',
      jill_koford:      'koford_h10',
      luz_escamilla:    'lescamilla',
      matthew_gwynn:    'gwynn_h6',
      nate_blouin:      'blouin_s13',
      phil_lyman:       'lyman',
      // CANONICAL: chew_h68. It is the roster record for Utah House District 68
      // (termStart 2015-01) and it holds the 90-act formal file; `scott_chew` is
      // the slug of that record's own display name and has no roster record of
      // its own. A stray PROFILES document under `scott_chew` is the same
      // officeholder, not a second one, so it must never open as its own file —
      // see the ordering note on PDXProfilePid below. Vote rows are NOT merged:
      // no voting-record rows were ever filed under `scott_chew`, so
      // PDX_PID_ALIASES / db/vr-pid-aliases.json stay out of this.
      scott_chew:       'chew_h68',
      scott_sandall:    'ssandall',
      stephen_l_whyte:  'whyte_h63',
      // sadams keeps its own 7-card block, which _resolveStanceList prefers; this
      // bridge fixes the dead click and lands on the right person. The 3 cards
      // filed under stuart_adams stay shadowed — collapsing them is a content
      // decision, tracked separately.
      stuart_adams:     'sadams',
      tiara_auxier:     'auxier_h4',
      todd_weiler:      'tweiler',
      troy_shelley:     'shelley_h66',
    };
})();
