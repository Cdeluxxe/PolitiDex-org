/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Coverage honesty  ·  window.PDXCoverage
   ────────────────────────────────────────────────────────────────────────────
   Protect credibility at scale. As the roster grows into the thousands, many
   officials will have thin or not-yet-researched records. Silence there reads as
   "this app is empty/broken" or, worse, as an implied "this person has no
   record." Both are corrosive. This module turns silence into an honest, factual
   signal: "not yet documented" — never a fabricated blank.

   It derives a coverage level for any politician id from data ALREADY on the
   client (no new data, no schema): stated stances (window.ISSUE_STANCE_DATA),
   curated accountability items (window.ACCT_SPOTLIGHT, via window.ACCT_ALIAS),
   and tracked promises (window.PROFILES / CMP_DATA). Everything is defensive —
   any missing source just lowers the count, never throws.

   API:
     PDXCoverage.assess(pid)      → { key, records, stances, spotlight, promises }
                                     key ∈ 'rich' | 'partial' | 'thin' | 'none'
     PDXCoverage.badgeHTML(pid)   → tiny "still documenting" chip for thin/none
                                     (empty string for rich/partial — no clutter)
     PDXCoverage.note(pid, name)  → one honest sentence for a thin/none area
     PDXCoverage.calloutHTML(pid, name) → a small framed callout for empty states
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXCoverage) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function alias(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function countArr(v) { return Array.isArray(v) ? v.length : 0; }

  function polRec(id) {
    var p = null;
    try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
    if (!p) { try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) p = CMP_DATA[id]; } catch (e) {} }
    return p;
  }

  // Count every kind of documented record we hold for this person, client-side.
  function assess(pid) {
    if (!pid) return { key: 'none', records: 0, stances: 0, spotlight: 0, promises: 0 };
    var al = alias(pid);
    var stances = 0, spotlight = 0, promises = 0;
    try {
      var SD = window.ISSUE_STANCE_DATA || {};
      stances = countArr(SD[pid]) || countArr(SD[al]);
    } catch (e) {}
    try {
      var AS = window.ACCT_SPOTLIGHT || {};
      spotlight = countArr(AS[pid]) || countArr(AS[al]);
    } catch (e) {}
    try {
      var d = polRec(pid) || polRec(al);
      if (d) promises = countArr(d.promises);
    } catch (e) {}
    var records = stances + spotlight + promises;
    var key = records === 0 ? 'none' : records <= 2 ? 'thin' : records <= 5 ? 'partial' : 'rich';
    return { key: key, records: records, stances: stances, spotlight: spotlight, promises: promises };
  }

  // Tiny chip for search rows / cards — only where coverage is thin or absent, so
  // the reader learns "we know this person, the record is still being built"
  // instead of seeing nothing. Rich/partial return '' (their data speaks).
  function badgeHTML(pid) {
    var c = assess(pid);
    if (c.key === 'rich' || c.key === 'partial') return '';
    var label = c.key === 'none' ? 'Not yet documented' : 'Still documenting';
    return '<span class="pdx-cov-badge pdx-cov-' + c.key + '" title="' +
      esc('Coverage: ' + (c.key === 'none' ? 'no record on file yet' : c.records + ' record' + (c.records === 1 ? '' : 's') + ' so far — more being added')) +
      '">◷ ' + label + '</span>';
  }

  function note(pid, name) {
    var c = assess(pid);
    var who = name ? esc(name) : 'This official';
    if (c.key === 'none') {
      return who + ' isn’t documented on PolitiDex yet. Rather than hide the gap, we mark it: ' +
        'their record is on the research queue, and positions appear here as they’re verified and sourced.';
    }
    if (c.key === 'thin') {
      return 'Coverage of ' + who + ' is still thin — ' + c.records + ' sourced record' +
        (c.records === 1 ? '' : 's') + ' so far. We show what’s verified and keep adding the rest, rather than padding the profile.';
    }
    return '';
  }

  function calloutHTML(pid, name) {
    var c = assess(pid);
    if (c.key === 'rich' || c.key === 'partial') return '';
    var msg = note(pid, name);
    if (!msg) return '';
    return '<div class="pdx-cov-callout pdx-cov-' + c.key + '">' +
      '<span class="pdx-cov-ico" aria-hidden="true">🌱</span>' +
      '<div class="pdx-cov-body"><div class="pdx-cov-title">' +
        (c.key === 'none' ? 'Not yet documented' : 'Coverage still growing') + '</div>' +
        '<p class="pdx-cov-text">' + msg + '</p></div>' +
    '</div>';
  }

  window.PDXCoverage = {
    assess: assess,
    badgeHTML: badgeHTML,
    note: note,
    calloutHTML: calloutHTML
  };
})();
