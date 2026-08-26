/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Coverage inventory  ·  window.PDXInventory
   ────────────────────────────────────────────────────────────────────────────
   ONE LINE OF COUNTS, BESIDE THE FINDINGS. What we hold on this record, what
   we have tested, what we are still missing, and when it was last added to.
   Nothing else. It rides under the person file's record strip, under the formal
   index head, and inside the Direction Match card.

   WHAT IT IS NOT, AND WHY THE RULE IS ABSOLUTE.
   · NOT a grade. There is no tier, no adjective, no letter, no colour ramp and
     no "data quality" verdict anywhere in this module. A reader can read the
     counts and decide for themselves how much they trust a four-act file — that
     judgement is theirs, and packaging it as a score we assign would make our
     own coverage look like a finding about the politician.
   · NOT a percentage. There is no `%` character in anything this module emits,
     and no derived ratio either. The profile carries exactly one percentage
     (Direction Match) and this line must never read as a second one.
   · NOT a ratio over the issue vocabulary. consistency.js's formal index
     already refuses "N of M issue keys" for the reason that decides it here
     too: the denominator would be all 118 ISSUE_MAP keys, most of which will
     never apply to any one official, so the fraction would measure the size of
     our vocabulary rather than the depth of our file. Counts have no
     denominator, so they cannot lie about one.
   · NOT a second engine. Every number below is read off a surface that already
     computed and already prints it:
        formal acts / issues   ← PDXConsistency.formalPatternIndex.shape()
        word held / tested     ← PDXWordAction.read().coverage
        open gaps              ← PDXGaps.count()
        last added             ← PDXVotingRecord.memberRecords() item dates
     If one of them is cold, that clause is dropped — never estimated.

   EMPTY IS SOMEBODY ELSE'S SENTENCE. With nothing held, nothing tested and
   nothing askable, lineHtml() returns '' and the surface keeps whatever honest
   refusal language it already had ("We do not yet hold documented word for this
   record…"). A counts line reading "0 · 0 · 0" would be furniture standing where
   a plain admission belongs.

   API:
     PDXInventory.read(pid [, p])            → {formal, word, gaps, updated, held}
     PDXInventory.clauses(pid [, p])         → string[]  (in print order)
     PDXInventory.text(pid [, p] [, opts])   → 'N formal acts across M issues · …'
     PDXInventory.lineHtml(pid [, p] [, opts]) → one <p>, or '' when nothing is held
        opts.omit   — ['formal'|'word'|'gaps'|'updated'] clauses the host already
                      states in its own words, so no surface prints a fact twice
        opts.cls    — extra class on the line
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXInventory) return;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function plural(n, one, many) { return n === 1 ? one : (many || (one + 's')); }

  // Styles are injected rather than shipped as a stylesheet: index.html's
  // render-blocking stylesheet budget is full (see scripts/test-index-scripts.mjs)
  // and one line of counts is not worth a seventh blocking request.
  function ensureStyles() {
    try {
      if (!document.head || document.getElementById('pdx-inventory-css')) return;
      var css =
        '.pdxinv{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.72rem;' +
          'letter-spacing:0.03em;line-height:1.5;color:#93b4e6;margin:0.4rem 0 0;' +
          'display:flex;flex-wrap:wrap;align-items:baseline;gap:0.1rem 0.42rem;}' +
        '.pdxinv-c{white-space:nowrap;}' +
        '.pdxinv-sep{color:#5c728f;}' +
        '.pdxinv b{color:#e8f0ff;font-weight:800;}' +
        '.pdxinv-gap{cursor:pointer;background:none;border:0;padding:0;font:inherit;color:#cfa6f8;' +
          'text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;}' +
        '.pdxinv-gap:hover,.pdxinv-gap:focus-visible{color:#e8d5ff;}' +
        '.pdxinv-when{color:#7f95b5;font-weight:700;}';
      var el = document.createElement('style');
      el.id = 'pdx-inventory-css';
      el.textContent = css;
      document.head.appendChild(el);
    } catch (e) {}
  }

  // The politician record, when a caller has one and when it does not. Several
  // mount points (the record strip, the formal index) are handed only a pid, and
  // the word ledger needs the profile object — so resolving it here keeps every
  // surface's call site to one argument instead of teaching each of them the
  // roster lookup separately.
  function personOf(pid, p) {
    if (p) return p;
    try {
      var P = window.PDXPerson;
      if (P && typeof P.record === 'function') {
        var r = P.record(pid);
        if (r) return r;
      }
    } catch (e) {}
    try { if (window.PROFILES && window.PROFILES[pid]) return window.PROFILES[pid]; } catch (e) {}
    try { if (window.CMP_DATA && window.CMP_DATA[pid]) return window.CMP_DATA[pid]; } catch (e) {}
    return null;
  }

  // ── The four sources, each guarded, each optional ──────────────────────────
  function formalOf(pid) {
    try {
      var C = window.PDXConsistency;
      var fpi = C && C.formalPatternIndex;
      var s = (fpi && typeof fpi.shape === 'function') ? fpi.shape(pid) : null;
      if (!s) return null;
      var issues = +s.issues || 0, acts = +s.judged || 0;
      // NO ZERO-ACT CLAUSE. `judged` is 0 both when the record genuinely holds
      // nothing judged on this file and — for the whole window before the
      // roll-call read lands, and forever in any environment where it never does
      // — when we simply have not read it yet. Those are the same number and
      // very different facts, and "0 formal acts across 2 issues" reads as the
      // first while usually being the second: a finding of nothing, assembled out
      // of our own unfinished fetch. So the clause exists only when there is
      // something to count. Saying nothing here is not a smaller claim than
      // saying zero; it is the only honest one, and the gaps section is where
      // "no formal read" is stated in words that name whose gap it is.
      if (!acts) return null;
      return { issues: issues, acts: acts };
    } catch (e) { return null; }
  }

  function wordOf(pid, p) {
    try {
      var WA = window.PDXWordAction;
      if (!WA || typeof WA.read !== 'function' || !p) return null;
      var r = WA.read(pid, p);
      var c = r && r.coverage;
      if (!c) return null;
      // Same rule on this side. While the formal record is still warming, every
      // tested count is 0 because nothing has been tested YET, so "0 of 33 stated
      // positions tested" would report a floor failure that has not happened. In
      // that state the clause reports only what is held, which is the half we
      // actually know offline and mid-load alike.
      return {
        held: +c.word || 0,
        tested: +c.tested || 0,
        untested: +c.untested || 0,
        warming: !!c.warming
      };
    } catch (e) { return null; }
  }

  function gapsOf(pid, p) {
    try {
      var G = window.PDXGaps;
      if (!G || typeof G.count !== 'function') return null;
      var n = +G.count(pid, p) || 0;
      return n > 0 ? n : 0;
    } catch (e) { return null; }
  }

  // The freshness clause is the newest item date we hold, not "now". A page
  // rendered today does not mean the record was added to today, and printing the
  // clock would make every file look freshly maintained.
  function updatedOf(pid) {
    try {
      var VR = window.PDXVotingRecord;
      var recs = (VR && typeof VR.memberRecords === 'function') ? VR.memberRecords(pid) : null;
      if (!recs || !recs.length) return null;
      var best = null;
      recs.forEach(function (it) {
        var d = it && it.date;
        if (!d) return;
        var t = new Date(d);
        if (isNaN(t.getTime())) return;
        if (!best || t > best) best = t;
      });
      if (!best) return null;
      return { iso: best.toISOString().slice(0, 10), label: MONTHS[best.getUTCMonth()] + ' ' + best.getUTCFullYear() };
    } catch (e) { return null; }
  }

  function read(pid, p) {
    if (!pid) return { formal: null, word: null, gaps: null, updated: null, held: false };
    p = personOf(pid, p);
    var out = {
      pid: String(pid),
      formal: formalOf(pid),
      word: wordOf(pid, p),
      gaps: gapsOf(pid, p),
      updated: updatedOf(pid),
      held: false
    };
    out.held = !!(out.formal || (out.word && out.word.held));
    return out;
  }

  // ── The clauses ────────────────────────────────────────────────────────────
  // Each is a count with its noun attached, in the order a reader asks for them:
  // what the record did, what we hold them saying, what we are still missing,
  // when it last grew. `omit` drops a clause the host surface already states, so
  // the same fact is never printed twice on one screen.
  function clauses(pid, p, opts) {
    var o = opts || {};
    var skip = {};
    (o.omit || []).forEach(function (k) { skip[k] = 1; });
    var iv = (o.read && o.read.pid === String(pid)) ? o.read : read(pid, p);
    var out = [];

    if (!skip.formal && iv.formal) {
      out.push({
        key: 'formal',
        text: iv.formal.acts + ' formal ' + plural(iv.formal.acts, 'act') +
          ' across ' + iv.formal.issues + ' ' + plural(iv.formal.issues, 'issue'),
        html: '<b>' + iv.formal.acts + '</b> formal ' + plural(iv.formal.acts, 'act') +
          ' across <b>' + iv.formal.issues + '</b> ' + plural(iv.formal.issues, 'issue')
      });
    }
    if (!skip.word && iv.word) {
      if (iv.word.held && iv.word.warming) {
        // Held, but not yet testable — the record read has not landed. Counts
        // only, and no claim about testing either way.
        out.push({
          key: 'word',
          text: iv.word.held + ' stated ' + plural(iv.word.held, 'position') + ' on file',
          html: '<b>' + iv.word.held + '</b> stated ' + plural(iv.word.held, 'position') + ' on file'
        });
      } else if (iv.word.held) {
        var t = iv.word.tested + ' of ' + iv.word.held + ' stated ' +
          plural(iv.word.held, 'position') + ' tested';
        out.push({
          key: 'word', text: t,
          html: '<b>' + iv.word.tested + '</b> of <b>' + iv.word.held + '</b> stated ' +
            plural(iv.word.held, 'position') + ' tested'
        });
      } else {
        // A held count of zero is still inventory — it is the "missing" half, and
        // it is the most useful thing this line can say on a record with acts and
        // no word on file.
        out.push({ key: 'word', text: 'no stated positions on file yet',
                   html: 'no stated positions on file yet' });
      }
    }
    if (!skip.gaps && iv.gaps) {
      out.push({
        key: 'gaps',
        text: iv.gaps + ' open ' + plural(iv.gaps, 'gap'),
        html: '<button type="button" class="pdxinv-gap" data-pdxinv-gaps="' + esc(String(pid)) + '"' +
          ' onclick="window._pdxInventoryGaps&&window._pdxInventoryGaps(this)">' +
          '<b>' + iv.gaps + '</b> open ' + plural(iv.gaps, 'gap') + '</button>'
      });
    }
    if (!skip.updated && iv.updated) {
      out.push({
        key: 'updated', text: 'updated ' + iv.updated.label,
        html: '<span class="pdxinv-when">updated ' + esc(iv.updated.label) + '</span>'
      });
    }
    return out;
  }

  function text(pid, p, opts) {
    return clauses(pid, p, opts).map(function (c) { return c.text; }).join(' · ');
  }

  function lineHtml(pid, p, opts) {
    try {
      var o = opts || {};
      var iv = read(pid, p);
      // NOTHING HELD → NOTHING PRINTED. The surface's own refusal sentence is the
      // honest answer, and it is already there.
      if (!iv.held) return '';
      var cs = clauses(pid, p, { omit: o.omit, read: iv });
      if (!cs.length) return '';
      ensureStyles();
      var body = cs.map(function (c, i) {
        return (i ? '<span class="pdxinv-sep" aria-hidden="true">·</span>' : '') +
          '<span class="pdxinv-c">' + c.html + '</span>';
      }).join('');
      return '<p class="pdxinv' + (o.cls ? ' ' + esc(o.cls) : '') + '"' +
        ' data-pdxinv="' + esc(String(pid)) + '"' +
        ' aria-label="What we hold on this record">' + body + '</p>';
    } catch (e) { return ''; }
  }

  // The gaps count is a door, not a verdict: it opens the "What the record can't
  // test yet" surface on this same profile.
  window._pdxInventoryGaps = function (btn) {
    try {
      var pid = btn && btn.getAttribute('data-pdxinv-gaps');
      if (!pid) return;
      var G = window.PDXGaps;
      if (G && typeof G.jump === 'function') { G.jump(pid); return; }
      if (typeof window._pdxNavJump === 'function') { window._pdxNavJump('pdxsec-gaps'); return; }
    } catch (e) {}
  };

  window.PDXInventory = {
    read: read,
    clauses: clauses,
    text: text,
    lineHtml: lineHtml
  };
})();
