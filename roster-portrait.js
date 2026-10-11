/* ═══════════════════════════════════════════════════════════════════════════
   roster-portrait.js — ONE PORTRAIT PER PERSON, AND THIS IS HOW IT IS READ
   ───────────────────────────────────────────────────────────────────────────
   A person's face is the `photo` field on their roster record, and nowhere else:
     1. PROFILES[pid].photo   the live Firestore roster, where the document
                              carries one (firebase-boot.js publishes it, with
                              PDX_PHOTO_FIX already applied);
     2. CMP_DATA[pid].photo   the bundled roster row in cmp-data.js.
   The live value outranks the bundled one because that is the roster's own merge
   order (Object.assign({}, PROFILES[id], full)) — the same two tiers, in the same
   order, that open window._getPhotoUrl (ballot-breakdown.js). This file adds no
   tier, no table and no address.

   WHO READS IT. The person file's letterhead (profiles-full.js) on a document
   with no _getPhotoUrl, which is person.html; district-board.js's band 1 on
   every board. The homepage record card reads the same field through
   _getPhotoUrl. Before scripts/sweep-roster-portraits.mjs the bundled field was
   empty on every row and the card painted from a map of its own, so /p/khanna
   printed 🏭 under a face the homepage had already shown.

   NO PORTRAIT IS AN ANSWER: ''. Every caller paints the row's own mark (its
   `icon`, 🏛 when the row has none) for it, never a placeholder URL.

   A NON-OFFICIAL PORTRAIT SAYS SO: pdxPortraitDisclosure(pid) is the one line
   the person file and the share card print under a face that came from the
   person's own campaign site or Facebook Page, and '' for every other face.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof window.pdxPortrait === 'function') return;

  function field(rec) {
    var v = rec && rec.photo;
    v = v == null ? '' : String(v).trim();
    return v;
  }

  function pdxPortrait(pid) {
    if (!pid) return '';
    var id = String(pid);
    try {
      var live = window.PROFILES && window.PROFILES[id];
      var a = field(live);
      if (a) return a;
    } catch (e) {}
    try {
      var row = window.CMP_DATA && window.CMP_DATA[id];
      var b = field(row);
      if (b) return b;
    } catch (e) {}
    return '';
  }

  // The mark a record paints when it has no face: the row's own icon, live
  // record first, as profiles-full.js's .ph-fallback prints it.
  function pdxPortraitMark(pid) {
    var id = String(pid || '');
    try {
      var live = window.PROFILES && window.PROFILES[id];
      if (live && live.icon) return String(live.icon);
    } catch (e) {}
    try {
      var row = window.CMP_DATA && window.CMP_DATA[id];
      if (row && row.icon) return String(row.icon);
    } catch (e) {}
    return '🏛';
  }

  // THE ONE DISCLOSURE. A portrait that is not official says where it came from.
  // A face from the person's own campaign site (Person photos waves 1b-1d) is
  // marked `photoSource: "campaign"` on its roster row; the profile photo of the
  // person's own Facebook Page (wave 1d) is marked `photoSource: "facebook"`.
  // Wherever that face is the one painted, the person file and the share card
  // print its line under it; an official portrait carries no mark and prints
  // nothing. It is a sentence, never a score or a confidence figure. The line
  // follows the painted face: a live photo that replaced the bundled one is not
  // that photo, so it carries no line.
  var SOURCE_LINE = {
    campaign: 'Campaign photo · not an official portrait.',
    facebook: 'Facebook photo · not an official portrait.'
  };
  function pdxPortraitDisclosure(pid) {
    var u = pdxPortrait(pid);
    if (!u) return '';
    try {
      var row = window.CMP_DATA && window.CMP_DATA[String(pid)];
      var src = row && row.photoSource;
      if (src && Object.prototype.hasOwnProperty.call(SOURCE_LINE, src) && field(row) === u) return SOURCE_LINE[src];
    } catch (e) {}
    return '';
  }

  window.pdxPortrait = pdxPortrait;
  window.pdxPortraitMark = pdxPortraitMark;
  window.pdxPortraitDisclosure = pdxPortraitDisclosure;
})();
