/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Biggest Controversies  ·  window._renderControversies
   ────────────────────────────────────────────────────────────────────────────
   A visually distinct, neutral, sourced "flashpoints" block on every politician
   profile. For each official it surfaces the 2–4 most notable or divisive items
   already on record — a say-vs-do gap, a broken promise, or a flagged event —
   each with a plain-language summary, a Say-vs-Do verdict where one applies, a
   link to the primary source, and one-tap jumps to the related Issue Spotlight,
   voting record, and full receipt.

   NO NEW DATA. Every entry is assembled, entirely client-side, from layers the
   app already ships:

     • window.PDXReceipts  the Say-vs-Do receipt engine (say-vs-do.js). Its
                           collect() returns ranked, sourced, verdict-stamped
                           accountability items keyed to a politician. This is
                           the primary source of controversies — the contested
                           record with an explicit verdict.
     • p.promises          tracked promises. A promise marked "broken" (or a
                           narrowed "partial"/"compromise") that carries a source
                           IS a say-vs-do gap; we frame it as one.
     • p.sections          curated "alert" sections already authored on some
                           profiles — surfaced here as a flagged flashpoint.

   The tone is deliberately neutral: inclusion reflects a documented say-vs-do
   gap or public attention, not a judgment, and every card points to its source.

   Exposes:
     window._renderControversies(id, p) → section HTML, or '' when nothing
                                           checkable is on record (self-gating).
     window._pdxControversyCount(id, p) → how many items would render (for the
                                           profile nav rail pill).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window._renderControversies) return; // idempotent

  var MAX_ITEMS = 4;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }
  function clip(s, n) {
    s = String(s == null ? '' : s).trim();
    if (s.length <= n) return s;
    return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  }

  // Resolve an ISSUE_MAP label into { icon, label } (matches say-vs-do.js).
  function issueMeta(key) {
    if (!key) return null;
    try {
      var im = window.ISSUE_MAP || {};
      var def = im[key];
      if (!def || !def.label) return null;
      var m = String(def.label).match(/^\s*(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
      return m ? { icon: m[1], label: m[2] || def.label } : { icon: '🎯', label: def.label };
    } catch (e) { return null; }
  }

  // ── gather receipts for one politician (the contested, verdict-stamped record)
  function receiptsFor(id) {
    var R = window.PDXReceipts;
    if (!R || typeof R.collect !== 'function') return [];
    var all;
    try { all = R.collect() || []; } catch (e) { return []; }
    var mine = all.filter(function (r) { return r && r.pid === id; });
    if (!mine.length) {
      // fall back to alias-matched receipts via the engine's own resolver
      try {
        var best = (typeof R.forPolitician === 'function') ? R.forPolitician(id) : null;
        if (best) mine = all.filter(function (r) { return r.pid === best.pid; });
      } catch (e) {}
    }
    // A "controversy" is the divisive record: contradictions and red flags —
    // not the "words matched actions" positives (those aren't controversies).
    return mine.filter(function (r) {
      return r.verdict && r.verdict.key !== 'consistent';
    });
  }

  // ── normalize the different layers into one card shape ──────────────────────
  function fromReceipt(r) {
    return {
      kind: 'receipt',
      receipt: r,
      pid: r.pid,
      title: r.headline,
      summary: r.facts || r.why || '',
      said: r.said || null,
      verdict: r.verdict ? { ico: r.verdict.ico, label: r.verdict.label, cls: r.verdict.cls } : null,
      issueKey: r.issueKey || '',
      issue: r.issue || issueMeta(r.issueKey),
      date: r.date || '',
      source: r.source || null,
      score: (r.score || 0) + 1000 // receipts always outrank derived items
    };
  }

  function yearOf(date) {
    var m = String(date || '').match(/(19|20)\d{2}/g);
    return m ? parseInt(m[m.length - 1], 10) : 0;
  }

  function fromPromise(id, pr) {
    var broken = pr.verdict === 'broken';
    var narrowed = pr.verdict === 'partial' || pr.verdict === 'compromise';
    var verdict = broken
      ? { ico: '⚠', label: 'Promise Broken', cls: 'v-contradicts' }
      : { ico: '◐', label: 'Promise Only Partly Kept', cls: 'v-flag' };
    var src = (Array.isArray(pr.sources) && pr.sources[0]) ? pr.sources[0] : null;
    return {
      kind: 'promise',
      pid: id,
      title: pr.title,
      summary: pr.detail || '',
      said: null,
      verdict: verdict,
      issueKey: pr.issueKey || '',
      issue: issueMeta(pr.issueKey),
      date: pr.date || '',
      source: src,
      score: (broken ? 500 : 300) + Math.max(0, yearOf(pr.date) - 2000)
    };
  }

  function fromSection(sec) {
    var body = '';
    if (typeof sec.text === 'string') body = sec.text;
    else if (Array.isArray(sec.content) && sec.content[0]) {
      body = [sec.content[0].heading, sec.content[0].text].filter(Boolean).join(' — ');
    }
    return {
      kind: 'section',
      title: sec.label || sec.title || 'Flagged on record',
      summary: body,
      said: null,
      verdict: { ico: '⚑', label: 'Flagged Event', cls: 'v-flag' },
      issueKey: '',
      issue: null,
      date: '',
      source: null,
      score: 200
    };
  }

  // A stable-ish signature so a receipt and a broken promise about the same thing
  // don't both appear (prefer the receipt — it carries a verdict + source).
  function sig(item) {
    return (item.issueKey || '') + '|' + String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 40);
  }

  function gather(id, p) {
    var items = [];
    receiptsFor(id).forEach(function (r) { items.push(fromReceipt(r)); });

    if (p && Array.isArray(p.promises)) {
      p.promises.forEach(function (pr) {
        if (!pr || !pr.title) return;
        if (pr.verdict !== 'broken' && pr.verdict !== 'partial' && pr.verdict !== 'compromise') return;
        if (!Array.isArray(pr.sources) || !pr.sources.length) return; // must be checkable
        items.push(fromPromise(id, pr));
      });
    }

    if (p && Array.isArray(p.sections)) {
      p.sections.forEach(function (sec) {
        if (sec && sec.type === 'alert') items.push(fromSection(sec));
      });
    }

    // Dedupe by signature (first-seen wins → receipts, which sort highest).
    items.sort(function (a, b) { return b.score - a.score; });
    var seen = {}, out = [];
    items.forEach(function (it) {
      var k = sig(it);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out.slice(0, MAX_ITEMS);
  }

  window._pdxControversyCount = function (id, p) {
    try { return gather(id, p).length; } catch (e) { return 0; }
  };

  // ── card + action rail ──────────────────────────────────────────────────────
  function actionsHTML(id, it) {
    var acts = [];
    // Full receipt (opens the sourced say-vs-do lightbox).
    if (it.kind === 'receipt') {
      acts.push('<button type="button" class="pdx-ctv-act" ' +
        'onclick="event.stopPropagation();if(window.PDXReceipts)window.PDXReceipts.open(&quot;' +
        escAttr(id) + '&quot;,&quot;' + escAttr(it.issueKey) + '&quot;);">' +
        '<span aria-hidden="true">🧾</span> Full receipt</button>');
    }
    // Related Issue Spotlight (the issue-first ranked view).
    if (it.issueKey) {
      var topic = (it.issue && it.issue.label) ? it.issue.label : 'this issue';
      acts.push('<button type="button" class="pdx-ctv-act" ' +
        'onclick="event.stopPropagation();if(window.PDXIssueView&&window.PDXIssueView.open)window.PDXIssueView.open(&quot;' +
        escAttr(it.issueKey) + '&quot;);" title="' + escAttr('See where everyone stands on ' + topic) + '">' +
        '<span aria-hidden="true">🔦</span> Issue Spotlight</button>');
    }
    // Jump to the voting / promise record on this same profile.
    acts.push('<button type="button" class="pdx-ctv-act" ' +
      'onclick="event.stopPropagation();if(window._pdxNavJump)window._pdxNavJump(&quot;pdxsec-record&quot;);">' +
      '<span aria-hidden="true">📋</span> Voting record</button>');
    // Source of record.
    if (it.source && it.source.url) {
      acts.push('<a class="pdx-ctv-act pdx-ctv-src" href="' + escAttr(it.source.url) + '" ' +
        'target="_blank" rel="noopener" onclick="event.stopPropagation();" ' +
        'title="Open the primary source ↗"><span aria-hidden="true">📎</span> ' +
        esc(clip((it.source.label || 'Source'), 28)) + ' ↗</a>');
    }
    return '<div class="pdx-ctv-acts">' + acts.join('') + '</div>';
  }

  function cardHTML(id, it, n) {
    var v = it.verdict || { ico: '⚑', label: 'On Record', cls: 'v-flag' };
    var issue = it.issue
      ? '<span class="pdx-ctv-issue">' + esc(it.issue.icon || '🎯') + ' ' + esc(it.issue.label) + '</span>'
      : '';
    var said = it.said && it.said.text
      ? '<div class="pdx-ctv-said"><span class="pdx-ctv-said-lb">💬 They said</span> ' +
          esc(it.said.word || 'On') + ': "' + esc(clip(it.said.text, 150)) + '"</div>'
      : '';
    var date = it.date ? '<span class="pdx-ctv-date">' + esc(it.date) + '</span>' : '';

    return '<article class="pdx-ctv-card ' + v.cls + '">' +
        '<div class="pdx-ctv-top">' +
          '<span class="pdx-ctv-num" aria-hidden="true">' + n + '</span>' +
          '<span class="pdx-ctv-verdict"><span class="pdx-ctv-vico" aria-hidden="true">' + v.ico +
            '</span>' + esc(v.label) + '</span>' +
          issue + date +
        '</div>' +
        said +
        '<h4 class="pdx-ctv-headline">' + esc(it.title) + '</h4>' +
        (it.summary ? '<p class="pdx-ctv-summary">' + esc(clip(it.summary, 260)) + '</p>' : '') +
        actionsHTML(id, it) +
      '</article>';
  }

  window._renderControversies = function (id, p) {
    var items;
    try { items = gather(id, p); } catch (e) { items = []; }
    if (!items.length) return '';

    var first = (p && p.name) ? String(p.name).split(' ')[0] : 'this official';
    var plural = items.length > 1;
    var cards = items.map(function (it, i) { return cardHTML(id, it, i + 1); }).join('');

    return '' +
      '<span id="pdxsec-controversies" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="modal-section pdx-ctv" aria-label="Biggest controversies">' +
        '<div class="pdx-ctv-head">' +
          '<div class="modal-section-title pdx-ctv-title">⚠️ Biggest Controversies</div>' +
          '<span class="pdx-ctv-count">' + items.length + ' flashpoint' + (plural ? 's' : '') + '</span>' +
        '</div>' +
        '<p class="modal-section-sub pdx-ctv-note">' +
          'The most notable or divisive ' + (plural ? 'items' : 'item') + ' on ' + esc(first) +
          '’s public record — each with a neutral summary, a say-vs-do read where one applies, ' +
          'and a link to the source. Inclusion reflects a documented gap or public attention, not a judgment.' +
        '</p>' +
        '<div class="pdx-ctv-list">' + cards + '</div>' +
      '</section>';
  };
})();
