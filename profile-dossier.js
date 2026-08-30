/* ============================================================================
   profile-dossier.js  ·  the join layer that makes a profile read as one dossier
   ----------------------------------------------------------------------------
   window.PDXDossier

   THE PROBLEM THIS SOLVES.

   A politician profile grew seven surfaces that each told a slice of the same
   story and none of them told it together: Stance at a Glance, the Voting
   Record / Official Record, the Evidence Locker banner, Say-vs-Do receipts, the
   Spotlight block, Connecting the Dots, and the primary Word vs Action score.
   Read top to bottom they felt like seven features sharing a page — each with
   its own eyebrow, its own count, its own claim on the reader's attention. The
   reader was left to do the joining.

   This module is the join, made once, in one place. Every profile surface that
   wants to speak about an issue asks PDXDossier for the same five-link chain:

       ① WORD        what they are documented as saying   (tiered, sourced)
       ② ACTION      the formal acts on that same issue   (NAMED, not counted)
       ③ EVIDENCE    the receipts that back it            (locker + on-record)
       ④ ISSUE       where it lands in issues/spotlights  (tappable)
       ⑤ OUTCOME     what it means for Word vs Action     (shared vocabulary)

   FIVE RULES, IN FORCE EVERYWHERE IN HERE.

   1. DERIVE, NEVER ASSERT. Every figure is read back through the SAME accessor
      the full section uses — _issueEvidenceMap for on-record receipts,
      _pdxEvidenceDepthForPerson for locker depth, _pdxRecordIssueItems for
      votes, PDXWordAction for word and outcome. A summary that computes its own
      numbers is a summary that will eventually disagree with the section it
      summarises.

   2. ONE PRIMARY SCORE. This file emits no percentage, ever. Not a share, not a
      sub-score, not a "consistency index". The outcome link states the shared
      verdict and points at ⚖️ Word vs Action, which is the only number.

   3. NO NEW DATA. There is no dossier dataset. If an accessor is missing or its
      library has not loaded, the link says so and the row still renders — a
      thin-but-honest chain beats a fabricated one.

   4. LINKS, NOT COPIES. Steps ③ and ④ are entry points into the Evidence Locker
      and the Spotlight, not reproductions of them. Depth lives in the section;
      the chain only has to get you there with the right filter applied.

   5. ADDITIVE AND SELF-GATING. Every renderer returns '' rather than an empty
      frame. A profile with no testable word shows no chain at all.

   WHY IT LIVES OUTSIDE profile-connect.js. Connecting the Dots is one CONSUMER
   of the chain, not its owner. The compact Spotlight rail is another, and the
   receipt chip is reused wherever an issue is named. Keeping the join here is
   what stops the next surface from inventing a sixth version of the same story.
   ========================================================================== */
(function () {
  'use strict';
  if (window.PDXDossier) return; // idempotent — never redefine

  function esc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function jsStr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  // The issue colour, from the one module that decides it. Same helper, same
  // strength and same failure behaviour as the bill letterhead's chip: the tint is
  // keyed on the ISSUE and nothing else, so a Health Care row on a dossier is the
  // same blue as Health Care on a bill, on /issue/healthcare and on the Digital
  // Library's filter row.
  //   NOT A SECOND VERDICT. This row already carries the verdict vocabulary on
  // --pdxdo-col (the tier spine and the outcome word). The issue colour goes on the
  // issue chip only, where it says "this row is the healthcare row" — never on the
  // verdict, which would make two different meanings one colour.
  function issueTint(key) {
    try {
      var IC = window.PDXIssueColors;
      if (!IC || typeof IC.styleFor !== 'function') return '';
      var st = IC.styleFor(key);
      return st ? ' data-ic="on" style="' + esc(st) + '"' : '';
    } catch (e) { return ''; }
  }
  function fn(name) { return typeof window[name] === 'function' ? window[name] : null; }
  // Gated on `dots` — the one method this layer calls — rather than on the model
  // in general. A gate that tests a method it never uses either rejects a working
  // model or admits a broken one, and both failures are silent here.
  function WA() { return (window.PDXWordAction && typeof window.PDXWordAction.dots === 'function') ? window.PDXWordAction : null; }

  // The five link names, in order, as ONE vocabulary. Every consumer — the
  // Connecting the Dots rows, its navigation chain, the Spotlight digest —
  // labels the same stage with the same words, which is most of what makes the
  // page read as one document instead of several.
  var LINKS = [
    { key: 'word',     n: '1', ico: '🗣️', label: 'They said',    ask: 'What is on the record from them?' },
    { key: 'action',   n: '2', ico: '🏛️', label: 'They did',     ask: 'What did they formally do about it?' },
    { key: 'evidence', n: '3', ico: '🧾', label: 'The receipts', ask: 'What documents that?' },
    { key: 'issue',    n: '4', ico: '🔦', label: 'The issue',    ask: 'Where does it land?' },
    { key: 'outcome',  n: '5', ico: '⚖️', label: 'So',           ask: 'What does it mean for their score?' }
  ];

  // One issue, one name. The hops are deliberately the union of what the two
  // sections either side of this layer use: the page-wide `_issueLabel` hook
  // first, then ISSUE_MAP's own label with its leading glyph stripped — exactly
  // what word-action.js's issueLabel() resolves. Reading a different vocabulary
  // here is the whole rivalry bug in miniature: link ④ would say "israel
  // support" while the Word vs Action section two inches below said "Support for
  // Israel", and a reader would have no way to know they were the same issue.
  function issueLabel(k) {
    try { var f = fn('_issueLabel'); if (f) { var l = f(k); if (l) return l; } } catch (e) {}
    try {
      var e = (window.ISSUE_MAP || {})[k];
      if (e && e.label) return String(e.label).replace(/^[^\w]+\s*/, '');
    } catch (e2) {}
    return String(k || '').replace(/_/g, ' ');
  }

  // ── ③ THE RECEIPT LAYER ────────────────────────────────────────────────────
  // Evidence stops being an isolated vault the moment every issue can name what
  // backs it. Two independent sources, never summed:
  //   • the Evidence Locker's own depth index (curated library, loads async)
  //   • the profile's on-record spotlight items + promise ledger (synchronous)
  // Both are read through the accessors their own sections use, so a chip can
  // never quote a number the Locker or the stance popover would contradict.
  function receiptsFor(pid, p, issueKey) {
    var out = {
      issueKey: issueKey || '',
      locker: null, level: '', tier: '', bars: '',   // null = library not loaded yet
      onRecord: [], videos: 0, sourced: 0,
      promises: [], kept: 0, broken: 0, pending: 0,
      supporting: 0, cutting: 0,
      any: false
    };
    if (!issueKey) return out;
    try {
      var depth = fn('_pdxEvidenceDepthForPerson');
      var d = depth ? depth(pid) : null;
      var hit = d && d[issueKey];
      if (hit) { out.locker = hit.count || 0; out.level = hit.level || ''; out.tier = hit.tier || ''; out.bars = hit.bars || ''; }
      else if (d) { out.locker = 0; }
    } catch (e) {}
    try {
      var mapFn = fn('_issueEvidenceMap');
      var b = mapFn ? (mapFn(pid, p) || {})[issueKey] : null;
      if (b) {
        out.onRecord = b.spotlight || [];
        out.promises = b.promises || [];
        var c = b.counts || {};
        out.kept = c.promisesKept || 0;
        out.broken = c.promisesBroken || 0;
        out.pending = c.promisesPending || 0;
        out.supporting = c.spotlightPositive || 0;
        out.cutting = c.spotlightNegative || 0;
        out.onRecord.forEach(function (it) {
          var m = it && it.media;
          if (m && (m.video || m.youtube || m.clip || /video|youtu/i.test(String(m.type || m.kind || m.url || '')))) out.videos++;
          if (it && it.source && (it.source.url || it.source.label)) out.sourced++;
        });
      }
    } catch (e) {}
    out.any = !!(out.locker || out.onRecord.length || out.promises.length);
    return out;
  }

  // A compact, reusable receipt chip row. Deliberately the SAME markup wherever
  // an issue is named, so "what backs this" looks identical on a chain row, a
  // spotlight digest line and anywhere a later surface wants it.
  function receiptChipHtml(pid, issueKey, r) {
    r = r || receiptsFor(pid, null, issueKey);
    var chips = [];
    if (r.locker) {
      chips.push('<button type="button" class="pdxdo-chip pdxdo-chip-ev"' +
        ' onclick="window.PDXDossier&&window.PDXDossier.openLocker(\'' + jsStr(pid) + '\',\'' + jsStr(issueKey) + '\')"' +
        ' aria-label="' + esc((r.tier || 'Documented') + ' evidence — ' + r.locker + ' items in the Evidence Locker on ' + issueLabel(issueKey)) + '">' +
        '📂 ' + (r.bars ? '<span class="pdxdo-bars">' + esc(r.bars) + '</span> ' : '') +
        esc(r.locker + ' in the Locker') + '</button>');
    }
    if (r.onRecord.length) {
      chips.push('<span class="pdxdo-chip pdxdo-chip-rec">🧾 ' + r.onRecord.length + ' on record' +
        (r.videos ? ' <span class="pdxdo-chip-sub">· ' + r.videos + ' 📹</span>' : '') +
        (r.sourced ? ' <span class="pdxdo-chip-sub">· ' + r.sourced + ' cited</span>' : '') + '</span>');
    }
    if (r.kept || r.broken || r.pending) {
      chips.push('<span class="pdxdo-chip pdxdo-chip-pr">🤝 ' +
        [ r.kept ? r.kept + ' kept' : '', r.broken ? r.broken + ' broken' : '', r.pending ? r.pending + ' pending' : '' ]
          .filter(Boolean).join(' · ') + '</span>');
    }
    if (!chips.length) return '';
    return '<span class="pdxdo-chips">' + chips.join('') + '</span>';
  }

  // ── ④ THE ISSUE / SPOTLIGHT LAYER ──────────────────────────────────────────
  // Issue → Spotlight, using the registry's own reverse index. A Spotlight is
  // where an issue is argued out in public; naming it turns the Spotlight block
  // from a standalone feature into the destination of a chain the reader is
  // already following.
  function spotlightsFor(issueKey) {
    if (!issueKey) return [];
    try {
      var api = window.PDXSpotlight;
      if (!api || typeof api.forIssueKey !== 'function') return [];
      return (api.forIssueKey(issueKey) || []).slice(0, 2).map(function (sp) {
        return { slug: sp.slug, title: sp.title || sp.slug };
      });
    } catch (e) { return []; }
  }

  function openSpotlight(slug) {
    try {
      if (typeof window.closeModal === 'function') { try { window.closeModal(); } catch (e) {} }
      setTimeout(function () {
        try { if (window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') window.PDXSpotlight.open(slug); } catch (e) {}
      }, 40);
    } catch (e) {}
  }

  function openLocker(pid, issueKey) {
    try {
      var f = fn('_pdxOpenEvidenceLocker');
      if (f) f({ pol: pid || '', issue: issueKey || '' });
    } catch (e) {}
  }

  // ── THE CHAIN ──────────────────────────────────────────────────────────────
  // PDXWordAction owns links ① ② ⑤ and is the only thing allowed to decide what
  // counts as word, what tests it, and what the outcome is. This adds ③ and ④
  // on top of its rows — never reinterpreting them, never reordering them, so
  // the chain's order is still contradiction-first because that is the order the
  // score itself puts them in.
  function chain(pid, p, opts) {
    opts = opts || {};
    var wa = WA();
    if (!wa || typeof wa.dots !== 'function') return [];
    var rows = [];
    try { rows = wa.dots(pid, p, { limit: opts.limit || 3 }) || []; } catch (e) { rows = []; }
    return rows.map(function (d) {
      var rec = receiptsFor(pid, p, d.issueKey);
      return {
        issueKey: d.issueKey,
        title: d.title,
        tier: d.tier,
        word: d.word,
        sources: d.sources || [],
        actions: d.actions || [],
        receipts: rec,
        spotlights: spotlightsFor(d.issueKey),
        outcome: d.outcome,
        verdict: d.verdict
      };
    });
  }

  function stepHtml(link, valueHtml, extraCls) {
    return '' +
      '<div class="pdxdo-step pdxdo-step-' + link.key + (extraCls ? ' ' + extraCls : '') + '">' +
        '<span class="pdxdo-step-n" aria-hidden="true">' + link.n + '</span>' +
        '<span class="pdxdo-step-k">' + link.ico + ' ' + esc(link.label) + '</span>' +
        '<span class="pdxdo-step-v">' + valueHtml + '</span>' +
      '</div>';
  }

  function L(key) { for (var i = 0; i < LINKS.length; i++) if (LINKS[i].key === key) return LINKS[i]; return LINKS[0]; }

  function rowHtml(d, pid) {
    var v = d.verdict;
    var col = (v && v.color) || '#9fb4d4';
    var quote = d.word ? String(d.word) : '';
    if (quote.length > 200) quote = quote.slice(0, 197).replace(/\s+\S*$/, '') + '…';
    var src = (d.sources && d.sources[0]) || null;
    var r = d.receipts;

    // ① word
    var wordV = (quote ? esc(quote) : esc('They campaign on ' + d.title + '.')) +
      (src && src.url
        ? ' <a class="pdxdo-src" href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.label || 'source') + ' ↗</a>'
        : (src && src.label ? ' <span class="pdxdo-src">' + esc(src.label) + '</span>' : ''));

    // ② action
    var actV = d.actions.length
      ? d.actions.map(function (a) { return '<span class="pdxdo-act">' + esc(a.text) + '</span>'; }).join('')
      : '<span class="pdxdo-none">No formal action on this issue is on record yet.</span>';

    // ③ evidence — chips into the Locker + the on-record receipts, or an honest
    // "nothing filed yet" that still points at where it would appear.
    var chips = receiptChipHtml(pid, d.issueKey, r);
    var evV = chips
      ? chips + (r.supporting || r.cutting
          ? '<span class="pdxdo-imp">' +
              (r.supporting ? '<span class="pdxdo-imp-up">▲ ' + r.supporting + ' backs it</span>' : '') +
              (r.cutting ? '<span class="pdxdo-imp-dn">▼ ' + r.cutting + ' cuts against it</span>' : '') +
            '</span>'
          : '')
      : '<span class="pdxdo-none">Nothing filed against this issue in the Evidence Locker yet.</span>';

    // ④ issue / spotlight
    var issueV = '<span class="pdxdo-chip pdxdo-chip-iss"' + issueTint(d.issueKey) + '>' + esc(issueLabel(d.issueKey)) + '</span>';
    if (d.spotlights.length) {
      issueV += d.spotlights.map(function (sp) {
        return '<button type="button" class="pdxdo-chip pdxdo-chip-sl"' +
          ' onclick="window.PDXDossier&&window.PDXDossier.openSpotlight(\'' + jsStr(sp.slug) + '\')"' +
          ' aria-label="' + esc('Open the Issue Spotlight: ' + sp.title) + '">🔦 ' + esc(sp.title) + '</button>';
      }).join('');
    } else {
      issueV += '<span class="pdxdo-none">No Issue Spotlight covers this one yet.</span>';
    }

    // ⑤ outcome — the shared verdict vocabulary and a pointer at the ONE score.
    // No percentage is emitted here, by design. The judged count is named in the
    // lane's own noun: a president signs and issues, they do not vote, so
    // "3 judged votes" was a category error on every executive profile.
    var _dossExec = false;
    try {
      _dossExec = !!(window.PDXExecRecord && typeof window.PDXExecRecord.eligible === 'function'
        && window.PDXExecRecord.eligible(pid));
    } catch (e) { _dossExec = false; }
    var _judgedNoun = _dossExec ? 'executive action' : 'vote';
    var outV = '<span class="pdxdo-verd" style="color:' + col + ';">' +
        (v ? esc(v.ico + ' ' + v.label) : 'Not yet testable') + '</span>' +
      (typeof d.outcome.judged === 'number' && d.outcome.judged > 0
        ? '<span class="pdxdo-judged">' + d.outcome.judged + ' judged ' + _judgedNoun +
          (d.outcome.judged === 1 ? '' : 's') + '</span>' : '') +
      '<button type="button" class="pdxdo-toscore"' +
        ' onclick="window._pdxNavJump&&window._pdxNavJump(\'pdxsec-wordaction\',null)">' +
        'counted in ⚖️ Word vs Action →</button>';

    return '' +
      '<li class="pdxdo-row" style="--pdxdo-col:' + col + ';" data-pdxdo-issue="' + esc(d.issueKey) + '">' +
        '<div class="pdxdo-row-head">' +
          '<span class="pdxdo-row-tier">' + d.tier.ico + ' ' + esc(d.tier.label) + '</span>' +
          '<span class="pdxdo-row-title">' + esc(d.title) + '</span>' +
        '</div>' +
        stepHtml(L('word'), wordV) +
        stepHtml(L('action'), actV, d.actions.length ? '' : 'pdxdo-thin') +
        stepHtml(L('evidence'), evV, r.any ? '' : 'pdxdo-thin') +
        stepHtml(L('issue'), issueV) +
        stepHtml(L('outcome'), outV) +
      '</li>';
  }

  // The rows, as markup. rowHtml takes the politician id only so the Evidence
  // Locker chip can deep-link to pol+issue; nothing else about a row depends on
  // who it belongs to.
  function chainHtml(pid, p, opts) {
    try {
      var rows = chain(pid, p, opts);
      if (!rows.length) return '';
      return '<ol class="pdxdo-chain">' + rows.map(function (d) { return rowHtml(d, pid); }).join('') + '</ol>';
    } catch (e) { return ''; }
  }

  // The legend that names the chain once, so the five step labels on every row
  // below read as one repeated structure rather than five arbitrary sub-heads.
  function legendHtml() {
    return '<ol class="pdxdo-legend" aria-label="How each row below is built">' +
      LINKS.map(function (l) {
        return '<li class="pdxdo-legend-i"><span class="pdxdo-legend-n">' + l.n + '</span>' +
          '<span class="pdxdo-legend-l">' + l.ico + ' ' + esc(l.label) + '</span></li>';
      }).join('<li class="pdxdo-legend-arrow" aria-hidden="true">→</li>') +
      '</ol>';
  }

  // ── COMPACT SPOTLIGHT RAIL ─────────────────────────────────────────────────
  // Replaces up to three full-width callout cards that used to sit between the
  // hero and the accountability spine. One line, chips, same destinations. The
  // entry point survives; the real estate does not.
  function railHtml(pid, sps) {
    try {
      if (!sps || !sps.length) return '';
      var n = sps.length;
      return '' +
        '<div class="pdxis-rail" role="group" aria-label="Issue Spotlights featuring this official">' +
          '<span class="pdxis-rail-k"><span aria-hidden="true">🔦</span> Featured in ' + n +
            ' Issue Spotlight' + (n === 1 ? '' : 's') + '</span>' +
          '<span class="pdxis-rail-c">' +
            sps.map(function (sp) {
              return '<button type="button" class="pdxis-rail-b" data-spotlight="' + esc(sp.slug) + '">' +
                esc(sp.title) + '<span class="pdxis-rail-go" aria-hidden="true">→</span></button>';
            }).join('') +
          '</span>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── COMPACT SPOTLIGHT DIGEST ───────────────────────────────────────────────
  // A two-line ledger row per spotlight item: impact glyph, headline, date,
  // issue, and the same receipt chips the chain uses. Tapping scrolls to the
  // item's own full card (opening any drawer it is behind), so compressing the
  // block costs no depth at all.
  //   items: [{ headline, date, impact, issueKey, badge, anchor }]
  function digestHtml(pid, items, opts) {
    try {
      opts = opts || {};
      if (!items || !items.length) return '';
      var rows = items.map(function (it) {
        var imp = it.impact === 'positive' ? 'up' : (it.impact === 'negative' ? 'dn' : 'na');
        var sym = imp === 'up' ? '▲' : (imp === 'dn' ? '▼' : '•');
        var jump = it.anchor
          ? ' onclick="window._pdxNavJump&&window._pdxNavJump(\'' + jsStr(it.anchor) + '\',null)"'
          : '';
        var chips = it.issueKey ? receiptChipHtml(pid, it.issueKey, receiptsFor(pid, opts.p || null, it.issueKey)) : '';
        return '' +
          '<li class="pdxdo-dg pdxdo-dg-' + imp + '">' +
            '<' + (it.anchor ? 'button type="button"' : 'div') + ' class="pdxdo-dg-b"' + jump +
              (it.anchor ? ' aria-label="' + esc('Read the full item: ' + (it.headline || '')) + '"' : '') + '>' +
              '<span class="pdxdo-dg-sym" aria-hidden="true">' + sym + '</span>' +
              '<span class="pdxdo-dg-main">' +
                '<span class="pdxdo-dg-h">' + esc(it.headline || '') + '</span>' +
                '<span class="pdxdo-dg-m">' +
                  (it.badge ? '<span class="pdxdo-dg-badge">' + esc(it.badge) + '</span>' : '') +
                  (it.date ? '<span class="pdxdo-dg-d">' + esc(it.date) + '</span>' : '') +
                  (it.issueKey ? '<span class="pdxdo-dg-iss"' + issueTint(it.issueKey) + '>' + esc(issueLabel(it.issueKey)) + '</span>' : '') +
                '</span>' +
                (chips ? '<span class="pdxdo-dg-chips">' + chips + '</span>' : '') +
              '</span>' +
              (it.anchor ? '<span class="pdxdo-dg-go" aria-hidden="true">↓</span>' : '') +
            '</' + (it.anchor ? 'button' : 'div') + '>' +
          '</li>';
      }).join('');
      return '<ul class="pdxdo-digest">' + rows + '</ul>';
    } catch (e) { return ''; }
  }

  window.PDXDossier = {
    LINKS: LINKS,
    // Pure reads — no DOM, no fetch.
    receiptsFor: receiptsFor,
    spotlightsFor: spotlightsFor,
    chain: chain,
    // Renderers. All return '' rather than an empty frame.
    receiptChipHtml: receiptChipHtml,
    chainHtml: chainHtml,
    legendHtml: legendHtml,
    railHtml: railHtml,
    digestHtml: digestHtml,
    // Navigation into the sections the chain names.
    openSpotlight: openSpotlight,
    openLocker: openLocker
  };
})();
