/* ═══════════════════════════════════════════════════════════════════════════
   related-issues.js — linked issue pairs on a person file  ·  window.PDXRelatedIssues
   ────────────────────────────────────────────────────────────────────────────
   Some issues are linked: a position on one bears on the other. Water
   Conservation sits next to Data Centers & Water, and Protect Public Lands sits
   next to Energy & Resource Development. A reader looking at one issue drawer at
   a time cannot see whether a politician's two positions run the same way or
   opposite ways.

   This module prints those pairs side by side, and nothing else:

       Water Conservation: supports · Data Centers & Water: opposes
       Protect Public Lands: supports · Energy & Resource Development: supports

   THE RULES IT KEEPS

   · ONLY THE PAIRS BELOW. Batch 1 is Water / Land / Energy. The list is closed;
     a pair is never derived from keywords, categories or co-occurrence.

   · ONLY A PUBLISHED DIRECTION, ON BOTH SIDES. A direction is the person's
     documented position on the key, read from window._polPositionMap — the one
     stance map every drawer and both scoring lanes already read. Only "support"
     and "oppose" count. A mixed position, a missing card, or a record-only
     reading on either side means that pair is not printed. With no complete
     pair the section is omitted entirely: no heading, no empty state.

   · NO VERDICT. No score, grade, percentage, count or "contradiction" badge.
     Two directions, side by side. Whether they align or conflict is carried as a
     data attribute for styling and tests, and is never printed as a word.

   · IT READS, IT DOES NOT WRITE. Nothing here touches Direction Match, issue
     drawers, effect lines, or any other section.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRelatedIssues) return;

  // Batch 1: Water / Land / Energy. Order here is print order.
  var PAIRS = [
    { a: { key: 'water',          label: 'Water Conservation' },
      b: { key: 'datacenter_water', label: 'Data Centers & Water' } },
    { a: { key: 'lands_preserve', label: 'Protect Public Lands' },
      b: { key: 'lands_energy',   label: 'Energy & Resource Development' } },
    { a: { key: 'lands_preserve', label: 'Protect Public Lands' },
      b: { key: 'energy_production', label: 'Expand Domestic Energy Production' } },
    { a: { key: 'water',          label: 'Water Conservation' },
      b: { key: 'energy_production', label: 'Expand Domestic Energy Production' } }
  ];

  var WORD = { support: 'supports', oppose: 'opposes' };

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function positionMap(pid, p) {
    try {
      if (typeof window._polPositionMap !== 'function') return {};
      return window._polPositionMap(pid, p) || {};
    } catch (e) { return {}; }
  }

  // 'support' | 'oppose' | null. Anything else is not a published direction.
  function directionOf(pm, key) {
    var e = pm && Object.prototype.hasOwnProperty.call(pm, key) ? pm[key] : null;
    var s = e ? String(e.stance || '').toLowerCase().trim() : '';
    return (s === 'support' || s === 'oppose') ? s : null;
  }

  // Every pair this person has a published direction on, both sides.
  function pairsFor(pid, p) {
    var pm = positionMap(pid, p);
    var out = [];
    PAIRS.forEach(function (pr) {
      var da = directionOf(pm, pr.a.key), db = directionOf(pm, pr.b.key);
      if (!da || !db) return;
      out.push({
        a: { key: pr.a.key, label: pr.a.label, dir: da, word: WORD[da] },
        b: { key: pr.b.key, label: pr.b.label, dir: db, word: WORD[db] },
        relation: da === db ? 'align' : 'conflict'
      });
    });
    return out;
  }

  function lineText(r) {
    return r.a.label + ': ' + r.a.word + ' · ' + r.b.label + ': ' + r.b.word;
  }

  function lineHtml(r) {
    return '<li class="pdxri-pair" data-pdxri-a="' + esc(r.a.key) + '" data-pdxri-b="' + esc(r.b.key) +
        '" data-pdxri-rel="' + r.relation + '">' +
      '<span class="pdxri-side"><span class="pdxri-issue">' + esc(r.a.label) + ':</span> ' +
        '<span class="pdxri-dir s-' + r.a.dir + '">' + r.a.word + '</span></span>' +
      '<span class="pdxri-sep" aria-hidden="true"> · </span>' +
      '<span class="pdxri-side"><span class="pdxri-issue">' + esc(r.b.label) + ':</span> ' +
        '<span class="pdxri-dir s-' + r.b.dir + '">' + r.b.word + '</span></span>' +
    '</li>';
  }

  // The whole section, or '' when there is no complete pair.
  function sectionHtml(pid, p) {
    var rows = pairsFor(pid, p);
    if (!rows.length) return '';
    return '<div id="pdxsec-related-issues" class="modal-section pdxri" data-pid="' + esc(pid) + '">' +
      '<div class="modal-section-title">Related issues</div>' +
      '<ul class="pdxri-list">' + rows.map(lineHtml).join('') + '</ul>' +
    '</div>';
  }

  window.PDXRelatedIssues = {
    PAIRS: PAIRS,
    pairsFor: pairsFor,
    lineText: lineText,
    sectionHtml: sectionHtml
  };
})();
