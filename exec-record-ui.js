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

   Exposes: window.PDXExecRecordUI = { sectionHtml, navPill, NARROW_AT, ensureStyles }
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
        // The merged form: this lane sitting inside the Official Record. Indented and
        // rule-led so it reads as the document ledger BELOW the issue rows, not as a
        // second record section competing with them for the title.
        '.pdxer-embed{margin:0.7rem 0 0.2rem;padding:0.6rem 0 0 0.65rem;border-left:2px solid rgba(159,219,208,0.35);}' +
        '.pdxer-embed-h{display:flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:0.98rem;letter-spacing:0.04em;color:#9fdbd0;margin-bottom:0.35rem;}' +
        // The coverage gate. Amber and above the counts: it is a condition on them,
        // not a footnote to them. Full-width and wrapping freely so the whole
        // declaration is readable on a narrow phone rather than clipped to a chip.
        '.pdxer-gate{border-radius:0.6rem;padding:0.55rem 0.65rem;margin:0 0 0.6rem;}' +
        '.pdxer-gate-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.35rem 0.5rem;margin-bottom:0.25rem;}' +
        '.pdxer-gate-badge{font:700 0.6rem/1 "Barlow Condensed",sans-serif;letter-spacing:0.06em;text-transform:uppercase;' +
          'border-radius:999px;padding:0.22rem 0.5rem;white-space:nowrap;}' +
        '.pdxer-gate-label{font-size:0.78rem;font-weight:600;color:#e8eefc;line-height:1.3;}' +
        '.pdxer-gate-body{font-size:0.72rem;line-height:1.5;color:#c6d4ec;}' +
        '.exec-cov-pilot{background:rgba(245,200,66,0.09);border:1px solid rgba(245,200,66,0.34);}' +
        '.exec-cov-pilot .pdxer-gate-badge{color:#f5c842;background:rgba(245,200,66,0.16);border:1px solid rgba(245,200,66,0.4);}' +
        '.exec-cov-none{background:rgba(147,164,189,0.08);border:1px dashed rgba(147,164,189,0.34);}' +
        '.exec-cov-none .pdxer-gate-badge{color:#93a4bd;background:rgba(147,164,189,0.12);border:1px solid rgba(147,164,189,0.32);}' +
        '.exec-cov-broad{background:rgba(159,219,208,0.07);border:1px solid rgba(159,219,208,0.22);}' +
        '.exec-cov-broad .pdxer-gate-badge{color:#9fdbd0;background:rgba(159,219,208,0.14);border:1px solid rgba(159,219,208,0.32);}' +
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
        // Its own colour for the same reason challenged has one. Sharing the blocked red
        // would say a court reached this action; sharing the rescinded blue would say
        // the President reversed himself. Congress overriding a veto is neither, and a
        // borrowed colour would quietly name the wrong actor.
        '.pdxer-overridden{color:#c4a6f5;border-color:rgba(196,166,245,.44);background:rgba(196,166,245,.12);}' +
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
        // The row is now a two-line block, not a sentence: identity and direction on the
        // first line, the plain-English mechanism on its own line under it. A wrapped
        // baseline-aligned run put the explanation in the middle of the label on a phone.
        '.pdxer-issrow{display:flex;align-items:flex-start;gap:0.4rem;font-size:0.7rem;color:#c6d4ec;padding:0.3rem 0 0.35rem 0.1rem;line-height:1.4;}' +
        '.pdxer-iss-ico{flex-shrink:0;line-height:1.5;}' +
        '.pdxer-iss-body{display:block;min-width:0;}' +
        '.pdxer-iss-hd{display:block;line-height:1.5;}' +
        '.pdxer-iss-lbl{font-weight:700;color:#e8eefc;}' +
        '.pdxer-iss-dir{font-size:0.62rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;}' +
        '.pdxer-dir-adv{color:#6ee7a0;}' +
        '.pdxer-dir-opp{color:#f89b9b;}' +
        // The explanation line. Full-width, own line, normal sentence case — this is the
        // part a first-time reader is meant to learn the row from.
        '.pdxer-iss-why{display:block;color:#c6d4ec;font-size:0.7rem;line-height:1.5;margin-top:0.1rem;}' +
        // The scope sentence, for a mapping that rests on one part of the document.
        // A sentence under the explanation, not a badge beside the issue name: it is a
        // fact about how much of the document the link covers, and reading it as a
        // demotion of the topic was exactly the failure mode of the old chip.
        '.pdxer-iss-scope{display:block;color:#c3ad7d;font-size:0.66rem;line-height:1.45;margin-top:0.15rem;}' +
        '.pdxer-iss-inv{display:block;color:#d8bd85;font-size:0.64rem;line-height:1.45;margin-top:0.15rem;}' +
        // The curation rationale, one tap down. It quotes the sections the mapping rests
        // on and can run to a paragraph; it is the receipt, not the explanation.
        '.pdxer-rat-d{margin-top:0.2rem;}' +
        '.pdxer-rat-d>summary{cursor:pointer;list-style:none;font-size:0.62rem;font-weight:700;letter-spacing:0.03em;color:#8fa2c0;}' +
        '.pdxer-rat-d>summary::-webkit-details-marker{display:none;}' +
        '.pdxer-rat-d>summary:hover{color:#c6d4ec;}' +
        '.pdxer-rat-d>summary:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.25rem;}' +
        '.pdxer-rat{display:block;color:#9fb4d4;font-size:0.66rem;line-height:1.5;margin-top:0.2rem;padding-left:0.5rem;border-left:2px solid rgba(159,180,212,0.28);}' +
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
        '.pdxer-fold{margin:0 0 0.5rem;}' +
        '.pdxer-fold-s{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:center;min-height:2.5rem;padding:0.35rem 0.7rem;border:1px dashed rgba(159,180,212,0.32);border-radius:0.6rem;background:rgba(159,180,212,0.06);color:#9fb4d4;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;}' +
        '.pdxer-fold-s::-webkit-details-marker{display:none;}' +
        '.pdxer-fold-s:hover{color:#c6d4ec;border-color:rgba(159,180,212,0.5);}' +
        '.pdxer-fold-s:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
        '.pdxer-fold[open] .pdxer-fold-s{margin-bottom:0.5rem;}' +
        '@media (max-width:380px){.pdxer-title{font-size:1.1rem;}.pdxer-sum{font-size:0.76rem;}.pdxer-iss-hd{line-height:1.6;}}';
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
  // THE DIRECTION SHOWN IS THE ACT'S, NOT THE DOCUMENT'S. A mapping's `direction`
  // states what the DOCUMENT does to the issue; for a blocking class — a veto — the
  // document and the act point opposite ways, and exec-record.js's issueDirection()
  // is the one place that distinction is drawn. Reading `m.direction` here printed
  // a veto of a resolution ending the border emergency as an action AGAINST border
  // security, which is the opposite of what the figure did and the opposite of what
  // every other surface in the lane reports. Route through the helper, and fall back
  // to the raw mapping only if an older exec-record.js is on the page.
  function effDir(action, m) {
    var ex = EX();
    if (ex && typeof ex.issueDirection === 'function') {
      try { return ex.issueDirection(action, m) || m.direction; } catch (e) { /* fall through */ }
    }
    return m.direction;
  }

  // True when the act and the document disagree — the reader is looking at a row whose
  // arrow cannot be checked against the document's title, so the row says why.
  function inverted(action, m) { return effDir(action, m) !== m.direction; }

  // Below this weight a mapping is a real link but a narrow one — a single title of a
  // reconciliation law, a report requirement, a delegated authority.
  //   THIS IS A FACT ABOUT THE MAPPING, SO IT IS WRITTEN AS ONE. It used to print as
  // a chip in the row head, sitting beside the issue name in the same slot a status
  // badge occupies — which is how a true statement about scope became a mark that
  // read the row down before the reader got to what the document did. It now lands
  // in the explanation line, as a sentence, where it can be read instead of ranked.
  var NARROW_AT = 45;
  var NARROW_NOTE = 'What this document does here is one part of it — a title, a ' +
    'requirement, an authority — rather than the whole document.';

  // What the reader gets per row: the issue, the direction on THIS issue, one plain
  // sentence of mechanism, how much of this document that link rests on when the
  // answer is "one part of it", and the curation rationale one tap down. The plain
  // sentence FAILS CLOSED — a mapping with no `plain` renders with no explanation
  // line rather than falling back to dumping the rationale, which is a paragraph of
  // quoted subsections and belongs behind the tap.
  //   NO RANK BADGE. `isPrimary` used to print here as "primary" / "supporting" on
  // every single row — a two-way ranking of a document's own topics, stamped on the
  // citizen face by default. The flag is untouched in the data and is still read in
  // stance-helpers.js, where it now words one sentence and gates nothing: a row whose
  // acts all arrived inside larger measures says so beside its finding
  // (_RD_MIN_PRIMARY → `pkgOnly`), rather than being refused a finding. Either way it
  // is not a thing this face says about a topic. Every issue this document touches
  // gets the same row.
  function issueRowHtml(action, m) {
    var adv = effDir(action, m) === 'advances';
    var dcls = adv ? 'pdxer-dir-adv' : 'pdxer-dir-opp';
    var narrow = typeof m.weight === 'number' && m.weight <= NARROW_AT;
    return '<div class="pdxer-issrow">' +
      '<span class="pdxer-iss-ico ' + dcls + '" aria-hidden="true">' + (adv ? '↑' : '↓') + '</span>' +
      '<span class="pdxer-iss-body">' +
        '<span class="pdxer-iss-hd">' +
          '<span class="pdxer-iss-lbl">' + esc(issueLabel(m.issueKey)) + '</span> ' +
          '<span class="pdxer-iss-dir ' + dcls + '">' +
            (adv ? 'advances' : 'cuts against') + '</span>' +
        '</span>' +
        (m.plain ? '<span class="pdxer-iss-why">' + esc(m.plain) + '</span>' : '') +
        (narrow ? '<span class="pdxer-iss-scope">' + esc(NARROW_NOTE) + '</span>' : '') +
        (inverted(action, m)
          ? '<span class="pdxer-iss-inv">Direction shown is the action’s. The measure it blocked pointed the other way.</span>'
          : '') +
        // …unless the rationale IS the explanation. Where a mapping rests on one
        // short sentence, curation record and display line converge, and offering a
        // tap that reveals the sentence already on screen is a fake receipt.
        (m.rationale && m.rationale !== m.plain
          ? '<details class="pdxer-rat-d"><summary>What the document says ▾</summary>' +
              '<span class="pdxer-rat">' + esc(m.rationale) + '</span></details>'
          : '') +
      '</span></div>';
  }

  // Every row in the group, always. THERE IS NO LONGER A FOLD HERE. The list used to
  // keep four rows per direction visible and put the rest one tap down, which was
  // defensible when the header counts stayed honest — but a fold is still a default
  // view that is smaller than the act, and on the surface whose whole job is to show
  // what an instrument touched, the default has to be the full map. The group header
  // keeps its count so the size of the list is legible before it is read.
  function issueGroupHtml(action, label, rows) {
    if (!rows.length) return '';
    var head = '<div class="pdxer-grp">' + esc(label) + ' — ' + rows.length + ' ' +
      plural(rows.length, 'issue', 'issues') + '</div>';
    return head + rows.map(function (m) { return issueRowHtml(action, m); }).join('');
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
      // Grouped by the same direction the row's own arrow shows. Grouping by the raw
      // mapping while labelling by the act would put a row reading "advances" under
      // the "Cuts against" header.
      var d = effDir(action, m);
      if (d === 'advances') adv.push(m);
      else if (d === 'opposes') opp.push(m);
    }
    // ORDERED BY NAME, NOT BY CURATOR WEIGHT. Sorting by isPrimary then weight let
    // the curation decide which of a document's issues led the list — and, while the
    // list still folded, which ones a reader saw without opening anything. The fold
    // is gone and the sort stayed alphabetical: arbitrary, and arbitrary in a way no
    // reader will mistake for a judgement about which issues this document really
    // touched.
    var byLabel = function (a, b) {
      return String(issueLabel(a.issueKey)).localeCompare(String(issueLabel(b.issueKey)));
    };
    adv.sort(byLabel); opp.sort(byLabel);
    if (!adv.length && !opp.length) return '';
    // Against first when present: the direction a reader is least likely to expect from
    // a figure's own signature is the one that must not be buried.
    return issueGroupHtml(action, 'Cuts against', opp) +
           issueGroupHtml(action, 'Advances', adv);
  }

  // ── One action card ────────────────────────────────────────────────────────
  // THE CLASS NOUNS MOVED. They used to live here, because this file was the only
  // one printing the per-class breakdown line. The compact formal summary at the
  // head of an executive profile prints it too now, so the nouns sit with the
  // classes themselves — PDXExecRecord.inventory() — and both callers read the one
  // list rather than keeping two that can drift.

  // How many action cards print inline before the ledger folds. Three is enough
  // to show what the cards are and what the newest ones say; the count rows above
  // already state the totals, so nothing is hidden that a reader has not been told.
  var CARDS_OPEN = 3;

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
    // A veto Congress overrode leads with the injunctions: the action did not hold,
    // and which branch ended it is carried by the chip's own label.
    add(sum.actions.overridden, 'overridden');
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
      // THE CHIPS MUST BE READ OVER THE SAME SPAN AS THE COUNT ABOVE THEM. The count
      // comes from `sum`; the chips are recomputed here issue by issue, and if that
      // recomputation uses a different term scope the list and its own headline
      // disagree — a panel whose whole job is to explain a discrepancy becomes one.
      // Taken from the summary rather than assumed, so this follows whatever scope
      // the caller asked for.
      var scopeOpts = { allTerms: sum.termScope === 'all_time' };
      try {
        var pm = (typeof window._polPositionMap === 'function' && window.CMP_DATA)
          ? (window._polPositionMap(pid, window.CMP_DATA[pid]) || {}) : {};
        Object.keys(pm).sort().forEach(function (k) {
          if (ex.issue(pid, k, scopeOpts).token !== 'said_not_done') return;
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
  // ── The coverage gate, rendered ────────────────────────────────────────────
  // FIRST, ABOVE THE COUNTS, DELIBERATELY. Placed under the cards it would be a
  // footnote to a claim the reader has already formed; placed here it is a condition
  // on everything below it. The counts stay exactly as they were — this qualifies the
  // denominator, it does not touch the numbers.
  //
  // Every string comes from PDXExecRecord.COVERAGE or is built from the two live
  // counts, so the banner cannot claim a coverage level the data does not support,
  // and the vocabulary test gates its wording alongside the verdict labels.
  function coverageGateHtml() {
    var ex = EX();
    if (!ex || typeof ex.coverage !== 'function') return '';
    var cov;
    try { cov = ex.coverage(); } catch (e) { return ''; }
    if (!cov || cov.state === 'broad') return ''; // nothing to warn about
    return '<div class="pdxer-gate ' + esc(cov.cls) + '" role="note">' +
      '<div class="pdxer-gate-head"><span class="pdxer-gate-badge">' + esc(cov.badge) + '</span>' +
        '<span class="pdxer-gate-label">' + esc(cov.label) + '</span></div>' +
      '<div class="pdxer-gate-body">' + esc(cov.line) + ' ' + esc(cov.short) +
        (cov.compare ? ' ' + esc(cov.compare) : '') + '</div>' +
    '</div>';
  }

  // ── the lane's body, built once ─────────────────────────────────────────────
  // Everything below the title: the coverage declaration, the generated summary
  // label, the scope line, the two count rows, the cards and the why. Shared by the
  // standalone section and by the embed that now lives inside the Official Record,
  // so the merged lane cannot drift from the one it replaced. Returns null when this
  // figure has nothing on file — the caller decides what to render for that, and both
  // callers choose to render nothing.
  function bodyParts(pid) {
    var ex = EX();
    if (!ex || !pid || !ex.eligible(pid)) return null;
    // THE LEDGER IS OVER THE SAME RECORD AS THE SCORE. It used to show the current
    // term only, which was defensible while the score did too. The score is now the
    // whole formal record, and a receipts panel narrower than the number it backs is
    // the worst kind of mismatch: a reader who counts the cards to check the maths
    // finds fewer documents than were counted and no way to see the rest. The term
    // breakdown does not disappear — it moves to the scope line below, where it is a
    // disclosed sub-fact of a complete ledger instead of a silent filter on it.
    var ALL = { allTerms: true };
    var sum = ex.summary(pid, ALL);
    var pool = ex.actionsFor(pid, ALL);
    // Quiet by construction. No summary or nothing on file → no section, not a
    // sentence about the absence. The empty string is the honest rendering: this
    // lane knows nothing about most figures, and saying so on every profile would
    // be noise that reads as a finding.
    if (!sum || !pool.kept.length) return null;
    ensureStyles();

    var sorted = pool.kept.slice().sort(function (a, b) {
      return (Date.parse(b.actedAt || '') || 0) - (Date.parse(a.actedAt || '') || 0);
    });
    if (!sorted.length) return null;
    // Newest few inline, the rest behind a native disclosure. Every document is
    // still here and still in the same order — but this ledger was printing the
    // entire term inline, which made the one section a reader is meant to keep
    // the longest thing on the page by an order of magnitude. A <details> rather
    // than a spine lid on purpose: this body is re-rendered outside the spine
    // when the record warms, so it has to fold itself.
    var cards = sorted.slice(0, CARDS_OPEN).map(cardHtml).join('');
    var rest = sorted.slice(CARDS_OPEN);
    if (rest.length) {
      cards += '<details class="pdxer-fold">' +
          '<summary class="pdxer-fold-s">Show ' + rest.length + ' earlier ' +
            (rest.length === 1 ? 'action' : 'actions') + ' on file</summary>' +
          rest.map(cardHtml).join('') +
        '</details>';
    }
    if (!cards) return null;

    var scope = [];
    // What span this ledger covers, first, because every count after it is over
    // that span. Then the current term as a share of it — for someone still
    // serving, that is the live part of the record and a reader looking for it
    // should not have to count cards to find out how much of this is recent.
    scope.push('All terms on file');
    var serving = typeof ex.serving === 'function' && ex.serving(pid);
    var term = typeof ex.currentTerm === 'function' ? ex.currentTerm(pid) : '';
    if (serving && term) {
      var curN = ex.actionsFor(pid).kept.length;
      if (curN && curN < pool.kept.length) {
        scope.push(curN + ' of ' + pool.kept.length + ' in the current term (' + term + ')');
      }
    }
    // Reported per class and never summed into one headline figure: signing a bill
    // Congress wrote and issuing an order alone are different claims about power,
    // and "5 actions" flattens shared authorship into sole authorship.
    var byClass = (typeof ex.inventory === 'function') ? ex.inventory(sum) : [];
    if (byClass.length) scope.push(byClass.join(' · '));

    return {
      sum: sum,
      office: ex.office(pid),
      html: coverageGateHtml() +
        // The label is generated by the read path, not authored here, so the framing
        // clause and the counts cannot disagree with the cards below them.
        '<p class="pdxer-sum" title="' + esc(ex.summaryTip(sum)) + '">' + esc(sum.label) + '</p>' +
        (scope.length ? '<div class="pdxer-scope">' + esc(scope.join(' · ')) + '</div>' : '') +
        alignmentRowHtml(sum) +
        standingRowHtml(sum) +
        '<div class="pdxer-units">Two different units, never added together: <b>issues</b> above on the ' +
          'left, <b>documents</b> on the right. One action can touch several issues, and one issue can ' +
          'have several actions behind it.</div>' +
        cards +
        coverageHtml(pid, sum) +
        '<div class="pdxer-why">' + esc(ex.SCOPE.blurb) + '</div>'
    };
  }

  // ── the merged form: this lane INSIDE the Official Record ───────────────────
  // The profile used to carry two record products for a president — an Official
  // Record that spoke in issue rows and a separate Executive Enactment Record that
  // spoke in documents — which asked a reader to work out which one was the record.
  // There is one record section now, and this is its document ledger: same content,
  // no section chrome, no second question, no second title claiming to be a record of
  // its own. The anchor id rides along so existing deep links still land.
  function embedHtml(pid) {
    try {
      var p = bodyParts(pid);
      if (!p) return '';
      var ex = EX();
      return '<div class="pdxer pdxer-embed" id="pdxsec-exec-record" data-pdxer-pid="' + esc(pid) + '"' +
          ' aria-label="Executive actions behind this record">' +
        '<div class="pdxer-embed-h"><span aria-hidden="true">' + esc(ex.SCOPE.icon) + '</span> ' +
          'The ' + LT('execrecord', 'executive actions') + ' behind this record</div>' +
        p.html +
      '</div>';
    } catch (e) { return ''; }
  }

  function sectionHtml(pid) {
    try {
      var p = bodyParts(pid);
      if (!p) return '';
      var ex = EX();
      return '<section class="pdxer" data-pdxer-pid="' + esc(pid) + '" aria-label="Executive Enactment Record">' +
        '<div class="pdxer-head">' +
          '<span class="pdxer-title"><span aria-hidden="true">' + esc(ex.SCOPE.icon) + '</span> ' +
            LT('execrecord', ex.SCOPE.label) + '</span>' +
          (p.office ? '<span class="pdxer-office">' + esc(p.office) + '</span>' : '') +
        '</div>' +
        '<div class="pdxer-q">“' + esc(ex.SCOPE.question) + '”</div>' +
        p.html +
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
      // Same span as the section it jumps to. A pill reading "47 on file" over a
      // ledger of 56 is a wrong count in the one place a reader cannot open to
      // check it.
      var sum = ex.summary(pid, { allTerms: true });
      if (!sum) return null;
      var docs = sum.actions.total + (sum.unstatedStanding || 0);
      if (!docs) return null;
      // The pill is the compact rendering of this lane, and the compact rendering is
      // where a qualifier is most easily lost. While coverage is a pilot, the tip
      // carries the same declaration the section banner does, so a reader who only
      // ever hovers the rail is told the same thing as one who scrolls to the section.
      var tip = sum.label;
      var cov = null;
      try { cov = (typeof ex.coverage === 'function') ? ex.coverage() : null; } catch (e) { cov = null; }
      if (cov && !cov.comparable) tip = cov.badge + ' — ' + cov.line + ' ' + tip;
      return {
        target: 'pdxsec-exec-record',
        icon: ex.SCOPE.icon,
        label: 'Enactments',
        value: docs + ' On File',
        color: sum.contested ? '#f5c842' : '#9fdbd0',
        tip: tip,
        // Machine form of the non-comparability rule, carried on the pill itself so a
        // rail that ever starts ranking its entries has the flag in hand.
        comparable: !!(cov && cov.comparable)
      };
    } catch (e) { return null; }
  }

  window.PDXExecRecordUI = {
    sectionHtml: sectionHtml,
    embedHtml: embedHtml,
    navPill: navPill,
    // The narrow-link threshold, published so the issue dossier can say "narrow
    // link" about exactly the mappings this section says it about. A second copy
    // of the number in another file is how two surfaces start disagreeing about
    // how much of a document a claim rests on.
    NARROW_AT: NARROW_AT,
    ensureStyles: ensureStyles
  };
})();
