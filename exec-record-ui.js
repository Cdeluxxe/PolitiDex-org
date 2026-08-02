/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — ✒️ EXECUTIVE ENACTMENT RECORD · profile surface (Phase 4)
   ═══════════════════════════════════════════════════════════════════════════
   Renders the lane exec-record.js reads. Phases 1–3 built the vocabulary, the read
   path and the sourced action data; nothing was on screen. This file is the screen.

   WHY THE RENDERER IS A SEPARATE FILE FROM THE READ PATH
   exec-record.js is deliberately DOM-free and pure — its whole test suite loads it
   into a DOM-less sandbox and drives real data through it. Keeping the markup out of
   it preserves that property, and keeps the two failure modes apart: a wrong number
   is a read-path bug, a wrong sentence is a copy bug, and they are gated by different
   tests (scripts/test-exec-vocab.mjs on the vocabulary, scripts/test-exec-ui.mjs on
   the rendered HTML).

   WHAT THIS SURFACE MUST NEVER DO — each one is asserted in scripts/test-exec-ui.mjs
   against the real rendered output, not against these templates:
     · No percentage, and no graded adjective standing in for one. "Mostly acted on
       it" is a ratio wearing a word: it would pass every numeric check while
       reintroducing the denominator the no-score rule removed from the math.
     · No vote language. This figure cast no floor votes; borrowing the 🏛️ lane's
       words would manufacture a record that does not exist.
     · Never add an issue count to a document count. The two axes are labelled with
       their own units, on their own rows, precisely so the reader is never invited to
       read them as parts of one whole.
     · Never present an action as operative without its standing, and never state a
       standing without the citation that establishes it. A "struck down" chip with no
       ruling behind it is as unpublishable as an unsourced signing.
     · Never manufacture a sentence when there is nothing on file. A figure with no
       executive actions renders the empty string — the section does not appear at all,
       rather than appearing to say something about them.

   THE OMNIBUS RULE
   One signature can run in both directions. H.R. 1 carries fourteen issue mappings,
   four of them against. So issues are rendered GROUPED BY DIRECTION with each group's
   own count and every issue named — never one flattened line, and never only the
   headline issue, which is how a signed omnibus comes to look like a single clean win.

   Reads (all optional, all guarded): window.PDXExecRecord, window.EXEC_ACTIONS
   (via the read path), window.ISSUE_MAP for issue labels, window.PDXLearn for the
   in-context education pill. Every one of them absent degrades to plain text or to
   nothing, so this renders correctly on a cold, offline, data-less first paint.

   Exposes: window.PDXExecRecordUI = { sectionHtml, navPill, ensureStyles }
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXExecRecordUI) return; // idempotent

  function EX() { return window.PDXExecRecord || null; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plural(n, one, many) { return n === 1 ? one : many; }

  // In-context education, guarded exactly as consistency.js guards it: with
  // pdx-learn.js absent this is plain escaped text and the pill is nothing, so every
  // surface below still renders.
  function LT(key, text) {
    try {
      if (window.PDXLearn && typeof window.PDXLearn.term === 'function') return window.PDXLearn.term(key, text);
    } catch (e) {}
    return esc(text);
  }

  function issueLabel(k) {
    try {
      var m = window.ISSUE_MAP && window.ISSUE_MAP[k];
      if (m && m.label) return m.label;
    } catch (e) {}
    // Fail readable, not blank: an unmapped key still names its issue.
    return String(k || '').replace(/_/g, ' ');
  }

  // Dates arrive as plain ISO calendar days ("2025-03-25"). Parsed by parts rather
  // than by Date so the rendered day can never slide by one in a western timezone —
  // a signing date is a fact about a document, not a moment in the reader's day.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  function niceDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    var mo = MONTHS[parseInt(m[2], 10) - 1];
    return mo ? (mo + ' ' + parseInt(m[3], 10) + ', ' + m[1]) : m[1];
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  // Injected once, scoped under .pdxer so nothing here can reach the 🏛️ / 🧾
  // surfaces. Everything is fluid and wraps: the widest fixed thing on the card is a
  // chip, so a 320px viewport reflows rather than scrolling sideways.
  function ensureStyles() {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      if (document.getElementById('pdx-execrecord-css')) return;
      var css =
        '.pdxer{font-family:"Barlow Condensed",sans-serif;}' +
        '.pdxer-head{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;}' +
        '.pdxer-title{display:inline-flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:1.2rem;letter-spacing:0.03em;color:#e8eefc;}' +
        '.pdxer-office{font-size:0.66rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;}' +
        '.pdxer-q{font-style:italic;font-size:0.76rem;color:#c6d4ec;margin:0.2rem 0 0.6rem;line-height:1.3;}' +
        // The count summary. Same type size as the numbers it frames — the "of the
        // formal actions on file" lead-in is what makes the counts true, so it is
        // never set as small print underneath them.
        '.pdxer-sum{font-size:0.82rem;line-height:1.45;color:#e8eefc;background:rgba(159,219,208,0.07);border:1px solid rgba(159,219,208,0.2);border-radius:0.6rem;padding:0.5rem 0.6rem;margin:0 0 0.5rem;cursor:help;}' +
        '.pdxer-scope{font-size:0.66rem;color:#8fa2c0;margin:0 0 0.55rem;line-height:1.4;}' +
        // Two axes, two rows, each carrying its own unit in its own label. This is the
        // "never add these two totals" rule made visible.
        '.pdxer-axis{display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem 0.4rem;margin:0 0 0.4rem;}' +
        '.pdxer-axis-lbl{font-size:0.6rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7e93b3;margin-right:0.15rem;}' +
        '.pdxer-chip{display:inline-flex;align-items:center;gap:0.28rem;font-weight:700;font-size:0.66rem;letter-spacing:0.02em;line-height:1.2;padding:0.14rem 0.5rem;border-radius:999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.1);background:rgba(10,15,30,0.55);color:#c6d4ec;}' +
        '.pdxer-chip b{font-weight:800;}' +
        '.pdxer-acted{color:#6ee7a0;border-color:rgba(74,222,128,.38);background:rgba(74,222,128,.12);}' +
        '.pdxer-against{color:#f89b9b;border-color:rgba(248,113,113,.42);background:rgba(248,113,113,.12);}' +
        '.pdxer-both{color:#f5c842;border-color:rgba(245,200,66,.4);background:rgba(245,200,66,.12);}' +
        '.pdxer-none{color:#9fb4d4;border-color:rgba(159,180,212,.28);background:rgba(159,180,212,.08);}' +
        '.pdxer-inforce{color:#6ee7a0;border-color:rgba(74,222,128,.38);background:rgba(74,222,128,.12);}' +
        '.pdxer-partly{color:#f5c842;border-color:rgba(245,200,66,.42);background:rgba(245,200,66,.14);}' +
        '.pdxer-blocked,.pdxer-struck{color:#f89b9b;border-color:rgba(248,113,113,.42);background:rgba(248,113,113,.12);}' +
        '.pdxer-rescinded,.pdxer-superseded,.pdxer-expired{color:#93c5fd;border-color:rgba(147,197,253,.4);background:rgba(147,197,253,.1);}' +
        // Its own colour, not a borrowed one. Sharing the in-force green would say a
        // court has left the action alone and sharing the blocked red would say a court
        // has stopped it; the whole point of the token is that neither has happened yet.
        '.pdxer-challenged{color:#f0a868;border-color:rgba(240,168,104,.42);background:rgba(240,168,104,.12);}' +
        '.pdxer-units{font-size:0.64rem;color:#8fa2c0;line-height:1.4;margin:0 0 0.7rem;padding:0.3rem 0.5rem;border-radius:0.5rem;background:rgba(159,180,212,0.06);border:1px solid rgba(159,180,212,0.14);}' +
        // One card per document.
        '.pdxer-card{border:1px solid rgba(255,255,255,0.08);border-radius:0.7rem;padding:0.6rem 0.65rem;margin-bottom:0.5rem;background:rgba(10,15,30,0.35);}' +
        '.pdxer-card-top{display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem 0.5rem;}' +
        '.pdxer-doc{font-weight:700;text-transform:uppercase;letter-spacing:0.05em;font-size:0.7rem;color:#e8eefc;}' +
        '.pdxer-verb{font-size:0.64rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#9fdbd0;}' +
        '.pdxer-card-title{font-size:0.8rem;color:#dbe6fb;line-height:1.35;margin-top:0.2rem;}' +
        '.pdxer-meta{font-size:0.66rem;color:#8fa2c0;margin-top:0.2rem;line-height:1.4;}' +
        '.pdxer-src{display:inline-block;margin-top:0.25rem;font-size:0.66rem;color:#7fb4ff;text-decoration:none;line-height:1.35;}' +
        '.pdxer-src:hover{text-decoration:underline;text-underline-offset:2px;}' +
        // Per-issue rows, grouped by direction.
        '.pdxer-grp{font-size:0.62rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#7e93b3;border-top:1px solid rgba(255,255,255,0.07);padding-top:0.35rem;margin-top:0.45rem;}' +
        '.pdxer-issrow{display:flex;align-items:baseline;gap:0.4rem;font-size:0.7rem;color:#c6d4ec;padding:0.25rem 0 0.25rem 0.1rem;line-height:1.4;}' +
        '.pdxer-iss-ico{flex-shrink:0;}' +
        '.pdxer-iss-lbl{font-weight:700;color:#e8eefc;}' +
        '.pdxer-iss-dir{font-size:0.62rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;}' +
        '.pdxer-dir-adv{color:#6ee7a0;}' +
        '.pdxer-dir-opp{color:#f89b9b;}' +
        '.pdxer-primary{font-size:0.58rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;}' +
        '.pdxer-rat{color:#9fb4d4;}' +
        // Standing block.
        '.pdxer-stand{border-top:1px solid rgba(255,255,255,0.07);margin-top:0.45rem;padding-top:0.4rem;}' +
        '.pdxer-stand-row{font-size:0.68rem;color:#c6d4ec;line-height:1.45;}' +
        '.pdxer-stand-auth{color:#9fb4d4;}' +
        '.pdxer-stand-note{color:#9fb4d4;font-size:0.66rem;line-height:1.45;margin-top:0.15rem;}' +
        '.pdxer-stand a{color:#7fb4ff;text-decoration:none;}' +
        '.pdxer-stand a:hover{text-decoration:underline;text-underline-offset:2px;}' +
        '.pdxer-more,.pdxer-cov-d{margin-top:0.4rem;}' +
        '.pdxer-more>summary,.pdxer-cov-d>summary{cursor:pointer;font-size:0.66rem;font-weight:700;letter-spacing:0.03em;color:#9fb4d4;list-style:none;}' +
        '.pdxer-more>summary::-webkit-details-marker,.pdxer-cov-d>summary::-webkit-details-marker{display:none;}' +
        '.pdxer-more>summary:hover,.pdxer-cov-d>summary:hover{color:#c6d4ec;}' +
        '.pdxer-more>summary:focus-visible,.pdxer-cov-d>summary:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.25rem;}' +
        // Coverage + method footnotes.
        '.pdxer-cov{font-size:0.66rem;color:#8fa2c0;line-height:1.45;margin-top:0.6rem;}' +
        '.pdxer-cov b{color:#c6d4ec;font-weight:700;}' +
        '.pdxer-cov-body{margin-top:0.3rem;display:flex;flex-wrap:wrap;gap:0.25rem 0.35rem;}' +
        '.pdxer-why{font-size:0.64rem;color:#8fa2c0;line-height:1.45;margin-top:0.6rem;padding-top:0.45rem;border-top:1px solid rgba(255,255,255,0.07);}' +
        '@media (max-width:380px){.pdxer-title{font-size:1.1rem;}.pdxer-sum{font-size:0.76rem;}.pdxer-issrow{flex-wrap:wrap;}}';
      var st = document.createElement('style');
      st.id = 'pdx-execrecord-css';
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    } catch (e) { /* styling is not load-bearing; the markup reads without it */ }
  }

  // ── Standing entries, source-gated ─────────────────────────────────────────
  // Same gate exec-record.js's standingOf() applies, applied again here rather than
  // trusted: a status entry whose citation cannot be opened is not rendered at all.
  // Newest first, so the current standing leads and the history follows it.
  function citableStatuses(action) {
    var ex = EX();
    var list = (action && action.status) || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || !ex.STANDING[s.status]) continue;
      if (!ex.sourceOk(s.sourceUrl) || !(s.sourceLabel && String(s.sourceLabel).trim())) continue;
      out.push(s);
    }
    out.sort(function (a, b) { return (Date.parse(b.effectiveAt || '') || 0) - (Date.parse(a.effectiveAt || '') || 0); });
    return out;
  }

  // The chip IS the standing claim, so it always carries the lane's own icon and its
  // own label — never a bare colour. `count` is used by the Axis B tally row, where the
  // same chip reports how many documents share that standing.
  function standingChip(token, count) {
    var ex = EX();
    var s = ex.STANDING[token];
    if (!s) return '';
    return '<span class="pdxer-chip ' + esc(s.cls.replace(/^exec-/, 'pdxer-')) + '">' +
      '<span aria-hidden="true">' + esc(s.ico) + '</span> ' +
      (count ? '<b>' + count + '</b> ' : '') + esc(s.label) + '</span>';
  }

  function link(url, label) {
    var ex = EX();
    if (!ex.sourceOk(url) || !label) return '';
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' +
      esc(label) + ' ↗</a>';
  }

  function statusRowHtml(s) {
    var bits = '<div class="pdxer-stand-row">' + standingChip(s.status) +
      ' <span class="pdxer-stand-auth">' + esc(niceDate(s.effectiveAt)) +
      (s.authority ? ' · ' + esc(s.authority) : '') + '</span></div>';
    if (s.note) bits += '<div class="pdxer-stand-note">' + esc(s.note) + '</div>';
    // The citation is not optional decoration — it is the entire warrant for the chip
    // above it, so it renders on the same row rather than behind a tap.
    var cites = [link(s.sourceUrl, s.sourceLabel)];
    if (s.caseUrl) cites.push(link(s.caseUrl, 'Case docket'));
    cites = cites.filter(Boolean);
    if (cites.length) bits += '<div class="pdxer-stand-note">' + cites.join(' · ') + '</div>';
    return bits;
  }

  function standingBlockHtml(action) {
    var rows = citableStatuses(action);
    if (!rows.length) {
      // Fail closed, and say so. An action with no citable standing is NOT assumed to
      // be operative, and the reader is told that rather than shown a blank.
      return '<div class="pdxer-stand"><div class="pdxer-stand-row">' +
        '<span class="pdxer-chip pdxer-none"><span aria-hidden="true">—</span> No confirmed standing on file</span>' +
        '</div><div class="pdxer-stand-note">Nothing on file establishes what happened to this action afterwards, ' +
        'so it is not presented as being in force.</div></div>';
    }
    var out = '<div class="pdxer-stand">' + statusRowHtml(rows[0]);
    if (rows.length > 1) {
      var n = rows.length - 1;
      // The log is append-only for exactly this reason: an order can be enjoined in
      // part, then further enjoined, then partly cleared. Keeping only the latest row
      // would leave the sequence unreadable, so the earlier rows stay, each with its
      // own citation.
      out += '<details class="pdxer-more"><summary>➕ ' + n + ' earlier recorded ' +
        plural(n, 'change', 'changes') + ' to this action’s standing ▾</summary>';
      for (var i = 1; i < rows.length; i++) out += statusRowHtml(rows[i]);
      out += '</details>';
    }
    return out + '</div>';
  }

  // ── Per-issue rows, grouped by direction ───────────────────────────────────
  function issueRowHtml(m) {
    var adv = m.direction === 'advances';
    return '<div class="pdxer-issrow">' +
      '<span class="pdxer-iss-ico ' + (adv ? 'pdxer-dir-adv' : 'pdxer-dir-opp') + '" aria-hidden="true">' +
        (adv ? '↑' : '↓') + '</span>' +
      '<span><span class="pdxer-iss-lbl">' + esc(issueLabel(m.issueKey)) + '</span> ' +
        '<span class="pdxer-iss-dir ' + (adv ? 'pdxer-dir-adv' : 'pdxer-dir-opp') + '">' +
          (adv ? 'advances' : 'cuts against') + '</span>' +
        (m.isPrimary ? ' <span class="pdxer-primary">primary</span>' : '') +
        (m.rationale ? ' <span class="pdxer-rat">— ' + esc(m.rationale) + '</span>' : '') +
      '</span></div>';
  }

  function issueGroupHtml(label, rows, cap) {
    if (!rows.length) return '';
    var head = '<div class="pdxer-grp">' + esc(label) + ' — ' + rows.length + ' ' +
      plural(rows.length, 'issue', 'issues') + '</div>';
    if (rows.length <= cap) return head + rows.map(issueRowHtml).join('');
    var shown = rows.slice(0, cap).map(issueRowHtml).join('');
    var rest = rows.slice(cap);
    return head + shown + '<details class="pdxer-more"><summary>➕ ' + rest.length +
      ' more ' + plural(rest.length, 'issue', 'issues') + ' in this direction ▾</summary>' +
      rest.map(issueRowHtml).join('') + '</details>';
  }

  // Every issue this document touches, in BOTH directions, each named. The group
  // headers carry their own counts so the split is legible before anything is opened —
  // an omnibus that cuts four ways cannot be read as a single clean win.
  function issuesBlockHtml(action) {
    var maps = (action && action.issues) || [];
    var adv = [], opp = [];
    for (var i = 0; i < maps.length; i++) {
      var m = maps[i];
      if (!m || !m.issueKey) continue;
      if (m.direction === 'advances') adv.push(m);
      else if (m.direction === 'opposes') opp.push(m);
    }
    var byWeight = function (a, b) {
      if (!!b.isPrimary !== !!a.isPrimary) return b.isPrimary ? 1 : -1;
      return (b.weight || 0) - (a.weight || 0);
    };
    adv.sort(byWeight); opp.sort(byWeight);
    if (!adv.length && !opp.length) return '';
    // Short lists render whole; long ones keep four per direction visible and the rest
    // one tap away. The counts in the headers never shrink, so nothing is hidden in the
    // sense that matters.
    var cap = (adv.length + opp.length) <= 6 ? 99 : 4;
    // Against first when present: the direction a reader is least likely to expect from
    // a figure's own signature is the one that must not be buried.
    return issueGroupHtml('Cuts against', opp, cap) + issueGroupHtml('Advances', adv, cap);
  }

  // ── One action card ────────────────────────────────────────────────────────
  // Class nouns for the per-class breakdown line. exec-record.js's CLASSES carry a
  // verb ("Signed into law") for the card and a singular label; the summary line needs
  // a countable noun in both numbers, and "2 signed into laws" is not one.
  var CLASS_NOUN = {
    signed_law:      ['law signed', 'laws signed'],
    vetoed_law:      ['veto', 'vetoes'],
    executive_order: ['executive order', 'executive orders'],
    directive:       ['directive', 'directives']
  };

  function cardHtml(action) {
    var ex = EX();
    var cls = ex.CLASSES[action.actionClass];
    if (!cls) return '';
    var st = ex.standingOf(action);
    var meta = [];
    if (action.actedAt) meta.push(niceDate(action.actedAt));
    if (action.measureNumber) meta.push(action.measureNumber);
    if (action.frCitation) meta.push(action.frCitation);
    if (action.publishedAt && action.publishedAt !== action.actedAt) {
      meta.push('published ' + niceDate(action.publishedAt));
    }
    return '<article class="pdxer-card" data-pdxer-doc="' + esc(action.documentId || '') + '">' +
      '<div class="pdxer-card-top">' +
        '<span class="pdxer-verb">' + esc(cls.verb) + '</span>' +
        '<span class="pdxer-doc">' + esc(action.documentId || '') + '</span>' +
        (st ? standingChip(st) : '') +
      '</div>' +
      (action.title ? '<div class="pdxer-card-title">' + esc(action.title) + '</div>' : '') +
      (meta.length ? '<div class="pdxer-meta">' + esc(meta.join(' · ')) + '</div>' : '') +
      (link(action.sourceUrl, action.sourceLabel) ? '<div>' +
        '<span class="pdxer-src">' + link(action.sourceUrl, action.sourceLabel) + '</span></div>' : '') +
      issuesBlockHtml(action) +
      standingBlockHtml(action) +
    '</article>';
  }

  // ── Axis rows ──────────────────────────────────────────────────────────────
  // Two rows, each labelled with its own unit. Zero-valued buckets are omitted, with
  // one deliberate exception below.
  function alignmentRowHtml(sum) {
    var ex = EX(), chips = [];
    var add = function (n, label, cls) {
      if (!n) return;
      chips.push('<span class="pdxer-chip ' + cls + '"><b>' + n + '</b> ' + esc(label) + '</span>');
    };
    add(sum.issues.aligned, 'acted on it', 'pdxer-acted');
    add(sum.issues.against, 'acted against it', 'pdxer-against');
    add(sum.issues.bothWays, 'both ways', 'pdxer-both');
    // Coverage, in the same row but in the muted style, because it is not a finding:
    // it is the shape of what we have looked at.
    add(sum.issues.noActionFound, 'stated, no action found', 'pdxer-none');
    add(sum.issues.noStance, 'action, no stated position', 'pdxer-none');
    if (!chips.length) return '';
    return '<div class="pdxer-axis"><span class="pdxer-axis-lbl">' +
      LT('stance', 'Alignment') + ' · ' + sum.issues.total + ' ' +
      plural(sum.issues.total, 'issue', 'issues') + '</span>' + chips.join('') + '</div>';
  }

  function standingRowHtml(sum) {
    var chips = [];
    var add = function (n, token) { if (n) chips.push(standingChip(token, n)); };
    // Contested standings lead. If anything is enjoined, that is the first thing the
    // row says, however compact it gets.
    add(sum.actions.struckDown, 'struck_down');
    add(sum.actions.blocked, 'blocked');
    add(sum.actions.partlyBlocked, 'partly_blocked');
    add(sum.actions.rescinded, 'rescinded');
    // A live unresolved challenge leads over the uncontested standings for the same
    // reason the injunctions do, and sits after them because a ruling outranks a
    // pending one.
    add(sum.actions.challengedUnverified, 'challenged_unverified');
    add(sum.actions.superseded, 'superseded');
    add(sum.actions.expired, 'expired');
    add(sum.actions.inForce, 'in_force');
    if (sum.unstatedStanding) {
      chips.push('<span class="pdxer-chip pdxer-none"><b>' + sum.unstatedStanding +
        '</b> no confirmed standing</span>');
    }
    if (!chips.length) return '';
    var docs = sum.actions.total + (sum.unstatedStanding || 0);
    return '<div class="pdxer-axis"><span class="pdxer-axis-lbl">Standing · ' + docs + ' ' +
      plural(docs, 'document', 'documents') + '</span>' + chips.join('') + '</div>';
  }

  // ── Coverage disclosure ────────────────────────────────────────────────────
  // Issue keys that are not reported on the strength of a stance filing alone.
  // Mirrors the guard at receipt-cards.js:86 and the same standing decision behind
  // it: `tariffs_authority` collects stances filed as SUPPORT that mean opposite
  // things (Congress holds the tariff power / the president holds it), so naming a
  // figure's "stated position" on that key says something the filing cannot support.
  // The guard is deliberately scoped to THIS list — the place where an issue is named
  // purely because a stance exists under the key. A sourced action that mapped the key
  // would still render its row, because hiding a real mapping is the worse error; if
  // one ever arrives, the key needs splitting before it is seeded, not filtering here.
  var HELD_ISSUE_KEYS = {
    tariffs_authority: 'stated positions filed under this key carry opposite meanings, so it is not reported here yet'
  };

  // The issues with a stated position and nothing on file. Named, not just counted:
  // "13 issues" with the issues unnamed is unanswerable without leaving the profile,
  // and the whole point of this bucket is that it is checkable.
  function coverageHtml(pid, sum) {
    var ex = EX();
    var out = '';
    if (sum.issues.noActionFound) {
      var keys = [], heldReasons = [], held = 0;
      try {
        var pm = (typeof window._polPositionMap === 'function' && window.CMP_DATA)
          ? (window._polPositionMap(pid, window.CMP_DATA[pid]) || {}) : {};
        Object.keys(pm).sort().forEach(function (k) {
          if (ex.issue(pid, k).token !== 'said_not_done') return;
          if (HELD_ISSUE_KEYS[k]) {
            held++;
            if (heldReasons.indexOf(HELD_ISSUE_KEYS[k]) < 0) heldReasons.push(HELD_ISSUE_KEYS[k]);
            return;
          }
          keys.push(k);
        });
      } catch (e) { keys = []; heldReasons = []; held = 0; }
      var head = '<b>' + sum.issues.noActionFound + '</b> ' +
        plural(sum.issues.noActionFound, 'issue', 'issues') +
        ' with a stated position and no action found on file.';
      var why = ' This is coverage, not a finding: it means nothing qualifying is on file ' +
        'yet, not that the figure declined to act.';
      // The chip list being shorter than the count is a discrepancy a reader can see, so
      // it is stated and explained rather than left looking like an omission.
      var heldNote = held
        ? '<div class="pdxer-cov">' + held + ' of them ' + plural(held, 'is', 'are') +
          ' counted above but not named here: ' + esc(heldReasons.join('; ')) + '.</div>'
        : '';
      if (keys.length) {
        out += '<details class="pdxer-cov-d"><summary class="pdxer-cov">➕ ' + head + why + ' ▾</summary>' +
          '<div class="pdxer-cov-body">' + keys.map(function (k) {
            return '<span class="pdxer-chip pdxer-none">' + esc(issueLabel(k)) + '</span>';
          }).join('') + '</div>' + heldNote + '</details>';
      } else {
        out += '<div class="pdxer-cov">' + head + why + '</div>' + heldNote;
      }
    }
    if (sum.dropped) {
      // A filter that hides its own exclusions makes a partial record look complete.
      out += '<div class="pdxer-cov"><b>' + sum.dropped + '</b> curated ' +
        plural(sum.dropped, 'item is', 'items are') + ' held back from this section for citing a ' +
        'directory index or a summary page rather than the document itself.</div>';
    }
    return out;
  }

  // ── The section ────────────────────────────────────────────────────────────
  function sectionHtml(pid) {
    try {
      var ex = EX();
      if (!ex || !pid || !ex.eligible(pid)) return '';
      var sum = ex.summary(pid);
      var pool = ex.actionsFor(pid);
      // Quiet by construction. No summary or nothing on file → no section, not a
      // sentence about the absence. The empty string is the honest rendering: this
      // lane knows nothing about most figures, and saying so on every profile would
      // be noise that reads as a finding.
      if (!sum || !pool.kept.length) return '';
      ensureStyles();

      var cards = pool.kept.slice().sort(function (a, b) {
        return (Date.parse(b.actedAt || '') || 0) - (Date.parse(a.actedAt || '') || 0);
      }).map(cardHtml).join('');
      if (!cards) return '';

      var office = ex.office(pid);
      var tip = ex.summaryTip(sum);

      var scope = [];
      if (sum.term) scope.push('Current term (' + sum.term + ')');
      var shown = sum.actions.total + (sum.unstatedStanding || 0);
      if (sum.allTimeTotal > shown) scope.push(sum.allTimeTotal + ' on file across all terms');
      var byClass = [];
      Object.keys(sum.byClass).forEach(function (k) {
        var n = sum.byClass[k];
        if (!n) return;
        // Reported per class and never summed into one headline figure: signing a bill
        // Congress wrote and issuing an order alone are different claims about power,
        // and "5 actions" flattens shared authorship into sole authorship.
        var noun = CLASS_NOUN[k] || [k, k];
        byClass.push(n + ' ' + noun[n === 1 ? 0 : 1]);
      });
      if (byClass.length) scope.push(byClass.join(' · '));

      return '<section class="pdxer" data-pdxer-pid="' + esc(pid) + '" aria-label="Executive Enactment Record">' +
        '<div class="pdxer-head">' +
          '<span class="pdxer-title"><span aria-hidden="true">' + esc(ex.SCOPE.icon) + '</span> ' +
            LT('execrecord', ex.SCOPE.label) + '</span>' +
          (office ? '<span class="pdxer-office">' + esc(office) + '</span>' : '') +
        '</div>' +
        '<div class="pdxer-q">“' + esc(ex.SCOPE.question) + '”</div>' +
        // The label is generated by the read path, not authored here, so the framing
        // clause and the counts cannot disagree with the cards below them.
        '<p class="pdxer-sum" title="' + esc(tip) + '">' + esc(sum.label) + '</p>' +
        (scope.length ? '<div class="pdxer-scope">' + esc(scope.join(' · ')) + '</div>' : '') +
        alignmentRowHtml(sum) +
        standingRowHtml(sum) +
        '<div class="pdxer-units">Two different units, never added together: <b>issues</b> above on the ' +
          'left, <b>documents</b> on the right. One action can touch several issues, and one issue can ' +
          'have several actions behind it.</div>' +
        cards +
        coverageHtml(pid, sum) +
        '<div class="pdxer-why">' + esc(ex.SCOPE.blurb) + '</div>' +
      '</section>';
    } catch (e) {
      // Fail closed: a renderer that throws must not take the profile with it, and an
      // executive record is never so important that a half-rendered one is worth
      // publishing.
      return '';
    }
  }

  // ── Quick-jump rail entry ──────────────────────────────────────────────────
  // Returns null unless there is something on file, so the pill self-gates exactly as
  // the section does. The value is a count with its qualifier attached — "5 on file",
  // never a bare 5 and never a ratio.
  function navPill(pid) {
    try {
      var ex = EX();
      if (!ex || !pid || !ex.eligible(pid)) return null;
      var sum = ex.summary(pid);
      if (!sum) return null;
      var docs = sum.actions.total + (sum.unstatedStanding || 0);
      if (!docs) return null;
      return {
        target: 'pdxsec-exec-record',
        icon: ex.SCOPE.icon,
        label: 'Enactments',
        value: docs + ' On File',
        color: sum.contested ? '#f5c842' : '#9fdbd0',
        tip: sum.label
      };
    } catch (e) { return null; }
  }

  window.PDXExecRecordUI = {
    sectionHtml: sectionHtml,
    navPill: navPill,
    ensureStyles: ensureStyles
  };
})();
