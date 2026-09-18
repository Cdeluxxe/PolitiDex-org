/* ═══════════════════════════════════════════════════════════════════════════
   stance-sides.js — ONE FUNCTION ANSWERS "WHICH SIDES DOES THIS PERSON HOLD?"
   ───────────────────────────────────────────────────────────────────────────
   WHAT THIS FIXES, AND IT WAS A SILENT ONE. Three surfaces printed the reader's
   own positions and three surfaces asked a different question to get them:

     /my-stances  stance-studio.js  → PDXStances.all(), an ARRAY of records
     /me          me-desk.js        → PDXYourFile.answered(), a MAP under a
                                      SECOND localStorage key (pdx_your_file_v1)
     /ballot      race-sheet.js     → window._alignIssues, the engine's Set

   A reader who set three positions in the studio therefore had three sides on
   /my-stances, three on /ballot — and NONE on /me, which printed "Nothing on
   file yet." under a heading that said "Your positions". Every one of those
   three readers was internally correct. The defect was that there were three.

   SO THERE IS ONE, AND IT LIVES HERE. list() is the only answer to "which
   sides does this person hold", and the studio's save path, /me's paint and
   /ballot's rank axis all ask it. A fourth surface that needs the same list
   asks the same function; it does not write a fourth reader.

   WHAT THIS MODULE IS NOT.

     · NOT A STORE. Not one byte, not one key, not one write. It owns no state
       and it cannot: every position it reports was written by somebody else —
       PDXStances into pdx_my_stances_v1, or your-file.js into pdx_your_file_v1
       — and everything below is a read. There is no third storage key because
       there is no storage here at all.

     · NOT A SCORE. No percentage, no denominator, no party, no match, no
       Direction Match. It returns a list, and its length is a length.

     · NOT AN INVENTOR OF POSITIONS. Nothing here defaults, guesses or infers a
       side. A key with no record is absent from the list, which is the honest
       representation of "no position on this".

   ── THE TRAP THIS FILE EXISTS TO WRITE DOWN ────────────────────────────────
   PDXStances.all() RETURNS AN ARRAY. Not a map. A caller that reaches for
   Object.keys(PDXStances.all()) gets back ["0","1","2"] — three strings, none
   of which is an issue key, every one of which fails the ISSUE_MAP membership
   test — so the list comes back EMPTY and nothing throws. The surface then
   decides, in perfect good faith, that a reader with three positions has none.
   That is the exact shape of the /me defect, and it is why the walk below is a
   plain indexed for-loop over `rows.length` with this paragraph above it.
   scripts/test-stance-sides.mjs mutates that loop into an Object.keys read and
   asserts the suite fails, so the trap cannot be re-entered quietly.

   ── WHY A SIGNED-IN READER NEVER SEES "NOTHING" ────────────────────────────
   PDXStances reads through PDXStore, which is LOCAL-FIRST: the local snapshot
   is returned synchronously and the account pull merges into it afterwards,
   announcing itself with 'pdx-stances-change'. So a member who just wrote a
   position locally sees it on the very next paint, before any network has
   answered, and a member arriving on a new device sees their file the moment
   the pull lands and re-paints. There is no window in which this function
   reports an empty list while the local store holds sides — the one failure
   mode it would take to produce one is asking the server first, and nothing
   here asks a server anything.

   ── THE SECOND STORE IS READ DIRECTLY, AND HERE IS WHY IT HAS TO BE ────────
   your-file.js owns pdx_your_file_v1: a DIFFERENT, older store, written by the
   editor painted into region b of /me. It is not a new key and nothing here
   writes it — but it holds real sides, and a list that ignored it would break
   /me in the mirror image of the bug this file fixes.

   The tempting shortcut was to let it arrive through the alignment signature,
   since your-file.js projects every sided answer into window._alignIssues from
   its parse-time adopt(). THAT WOULD HAVE SHIPPED THE DEFECT BACKWARDS.
   projectOne() reaches the signature through window.alignSetIntensity, which
   is alignment-tool.js's, and alignment-tool.js IS NOT ON /me — that document
   carries no engine at all, deliberately. So on the one document where those
   answers are the reader's whole file, the projection is a no-op and the
   signature is empty. Every existing Your File reader would have arrived at
   "Nothing on file yet." over their own answers.

   So the store is asked through its owner's published reads — answered() and
   position(k), never its key, never its JSON — and 'unsure' is dropped, because
   your-file.js's own LEVEL table has no level for it and documents it as
   asserting no side.

   ── THE SIGNATURE, AND WHY IT IS A MERGE AND NOT A FALLBACK ────────────────
   One path is left that can put a side on the reader's file without going
   through either store: the Alignment Tool itself. Its picks land in
   window._alignIssues plus window._alignIntensity. Those keys are read here and
   MERGED — added only where the two stores have nothing for them — because a
   reader who set a direction there holds that side, and a list that dropped it
   would be lying by omission the moment they also used the studio once.

   ── PRECEDENCE, WHICH IS A CHOICE AND NOT A DERIVATION ─────────────────────
   Three sources, and an issue can appear in more than one. First source wins,
   in the order walked below: the stance studio, then Your File, then the
   signature. The studio is first because it is the document the product calls
   the stance studio and the only one of the three that also stores a priority
   and a note against the same issue, so preferring it keeps a row whole rather
   than splitting a position from its weight. Nothing here compares timestamps
   across two stores that were never written against one clock.

   The direction comes from the engine's OWN declared contract, not from a
   guess here: alignment-tool.js defines ALIGN_DEFAULT_LEVEL = 'support' and
   documents it as "implied by a bare selection; never stored", so membership
   with no overlay means support, an explicit 'oppose' means oppose, and
   'neutral' means mixed. Reading it any other way would be this file inventing
   a position, which is the one thing it is not allowed to do.

   Public API: window.PDXStanceSides (see the assignment at the bottom).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXStanceSides) return;   // idempotent — a double script tag is one reader

  function fn(v) { return typeof v === 'function'; }

  // The vocabulary, read and never copied. A key the register does not hold is
  // not a side this person can hold: it is a stale record, a typo, or a family
  // removed by a later deploy, and printing it would put a chip on screen that
  // no other surface can address.
  function known(k) {
    try { var M = window.ISSUE_MAP; return !!(k && M && typeof M === 'object' && M[k]); }
    catch (e) { return false; }
  }

  var SIDES = { support: 1, oppose: 1, mixed: 1 };
  var LABEL = { support: 'Support', oppose: 'Oppose', mixed: 'Mixed' };
  var PRIOS = { high: 1, medium: 1, low: 1 };

  // ── THE ONE LIST ──────────────────────────────────────────────────────────
  // Every side on this person's file, once each, in the stance store's own
  // order (PDXStances sorts high priority first, then most recently touched),
  // then Your File's answers, then signature-only keys — first source wins per
  // issue, for the reason written in the header.
  function list() {
    var out = [];
    var seen = {};

    // 1 · THE STORE. An ARRAY of records — see the header. The loop is indexed
    // over rows.length on purpose; do not reach for Object.keys here.
    try {
      var P = window.PDXStances;
      if (P && fn(P.all)) {
        var rows = P.all() || [];
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (!r || !r.issueKey || seen[r.issueKey]) continue;
          if (!known(r.issueKey) || !SIDES[r.position]) continue;
          seen[r.issueKey] = 1;
          out.push({
            key: r.issueKey,
            position: r.position,
            priority: PRIOS[r.priority] ? r.priority : 'medium'
          });
        }
      }
    } catch (e) {}

    // 2 · YOUR FILE, THE SECOND STORE — asked through its owner's own reads.
    // See the header: on /me this is the ONLY source that can answer, because
    // the engine the signature comes from is not on that document.
    try {
      var Y = window.PDXYourFile;
      if (Y && fn(Y.answered) && fn(Y.position)) {
        var ks = Y.answered() || [];
        for (var j = 0; j < ks.length; j++) {
          var yk = ks[j];
          if (!yk || seen[yk] || !known(yk)) continue;
          var yp = '';
          try { yp = String(Y.position(yk) || ''); } catch (e1) { yp = ''; }
          // 'unsure' is an answer, and the answer is "no side". It is not a
          // position and must not become one.
          if (!SIDES[yp]) continue;
          seen[yk] = 1;
          out.push({ key: yk, position: yp, priority: 'medium' });
        }
      }
    } catch (eY) {}

    // 3 · THE SIGNATURE, MERGED. Only keys neither store had anything for.
    try {
      var set = window._alignIssues;
      var lv = window._alignIntensity || {};
      if (set && fn(set.forEach)) {
        set.forEach(function (k) {
          if (!k || seen[k] || !known(k)) return;
          seen[k] = 1;
          out.push({ key: k, position: levelToSide(lv[k]), priority: 'medium' });
        });
      }
    } catch (e2) {}

    return out;
  }

  // The engine's five levels collapsed onto the three sides a person can hold.
  // A bare selection carries no level and means support — alignment-tool.js's
  // own ALIGN_DEFAULT_LEVEL, quoted rather than re-decided.
  function levelToSide(level) {
    var s = String(level || '');
    if (s === 'oppose' || s === 'strongly_oppose') return 'oppose';
    if (s === 'neutral') return 'mixed';
    return 'support';
  }

  function keys() { return list().map(function (r) { return r.key; }); }
  function count() { return list().length; }
  function position(k) {
    var l = list();
    for (var i = 0; i < l.length; i++) if (l[i].key === k) return l[i].position;
    return '';
  }
  function has(k) { return !!position(k); }
  // The side's own word, so "Support" is spelled once for every surface that
  // prints it. A side this table cannot name returns '' and the caller prints
  // the issue alone — "housing · oppose_maybe" is a leak, not vocabulary.
  function label(pos) { return LABEL[pos] || ''; }

  // The count as a sentence. A LENGTH, never a ratio: no denominator, no
  // percentage, no grade. Shared so /my-stances' door, the studio's done beat
  // and any later caller cannot phrase the same fact three ways.
  function countLine(n) {
    var v = (typeof n === 'number') ? n : count();
    return String(v) + (v === 1 ? ' position' : ' positions') + ' on file';
  }

  window.PDXStanceSides = {
    list: list,
    keys: keys,
    count: count,
    position: position,
    has: has,
    label: label,
    countLine: countLine,
    _levelToSide: levelToSide
  };
})();
