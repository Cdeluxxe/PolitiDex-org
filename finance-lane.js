/* ============================================================================
   finance-lane.js — the money lane, and the grade it no longer publishes
   ============================================================================
   WHY THIS FILE EXISTS

   Campaign finance matters and it was already on the site. What it was NOT was a
   pure lane: it arrived as a "Constituents-First signal", a 0–100 number with a
   coloured tile, three graded levels (Constituents-First / Mixed Funding /
   Special-Interest Heavy) and a "Why this score" list. Next to ⚖️ Word vs Action's
   percentage and Your Match's percentage, that read as a third match % — a grade
   about a person, in the same visual grammar as the two reads that ARE grounded in
   a formal record and that carry publication floors.

   And the coverage made it worse rather than better. Itemized filings are on file
   for 13 people. PolitiDex carries profiles for 757. A green "Constituents-First"
   badge or a red "Special-Interest Heavy" badge printed against that denominator
   is a verdict about a person derived from data the site almost never has, and the
   people who got no badge at all could not tell whether they had been checked and
   cleared or never checked.

   So the score is retired. Not hidden behind a flag, not left computed-but-unread
   (that is how a retired grade comes back — see the Accountability composite this
   codebase already deleted twice). The arithmetic that produced 50 ± bonuses,
   the three level thresholds, the clamp, the colour ramp and the reason list with
   its `+35` / `−17` point badges are gone from the shipped read. What is left is
   the thing the filings actually say:

       $2.4M in itemized receipts, 2024 cycle
       ├── small-dollar contributions      $1.5M   62%
       ├── large individual contributions  $0.6M   25%
       └── PAC contributions               $0.3M   13%
       Moderate outside spending reported on their behalf. → verify at source

   Composition and counts. No headline number, no level, no letter, no verb.

   WHAT THIS LANE IS ALLOWED TO DO
     • Report the buckets as filed, in dollars, with each bucket's share of the
       itemized base — because a share OF A COMPOSITION is composition. What is
       forbidden is a single figure standing for the whole person.
     • Name the largest reported source, because "largest" is a fact about a list.
     • Report outside ("dark-money") spending at the level the filing supports and
       never as a dollar figure it does not support.
     • Disclose its own coverage in the same breath, every time, on the same terms
       Direction Match discloses its floors: how many people have a filing, out of
       how many the site carries, and the explicit statement that a missing filing
       is missing DATA and not a finding about the person.

   WHAT IT CAN NEVER DO — the wall, declared in NEVER_FEEDS and asserted by
   scripts/test-finance-lane.mjs:
     • It is not an input to Direction Match / Word vs Action. Not weighted in, not
       a tiebreak, not a confidence modifier.
     • It is not an input to a formal pattern tier, to the publication floor, or to
       any count of formal acts.
     • It is not an input to ballot sort order, Your Match, or any ranking of one
       person against another.
     • It reads no party field and has no opinion about one.
     • It carries no motive language. Filings show where money came from. They do
       not show why anyone voted for anything, and this lane never says they do.

   PALETTE NOTE, which is a doctrine note. The old chart keyed small-dollar to
   green and PAC to red, so the colours delivered the verdict after the words
   stopped. The palette here is categorical on purpose: five hues that distinguish
   buckets and rank none of them. #4ade80 and #f87171 — this codebase's yes/no
   colours — do not appear in this file.

     window.PDXFinanceLane = {
       compose(record, opts) → composition read, or null when nothing is on file
       read(pid)             → compose() for a pid, via the shipped FTM index
       coverage()            → { onFile, roster, thin, sentence }
       entryHtml(pid)        → the person-file reachability row, on file or not
       BUCKETS, COLORS, NEVER_FEEDS, scored: false
     }
   ========================================================================= */
(function () {
  'use strict';
  var W = (typeof window !== 'undefined') ? window : null;
  if (!W) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }
  function num(v) { var n = Number(v); return (isFinite(n) && n > 0) ? n : 0; }

  // Dollars, at the precision a filing supports. Local rather than borrowed from
  // index.html so this module can be read in isolation and tested in node.
  function money(n) {
    n = Number(n);
    if (!isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(a % 1e9 === 0 ? 0 : 1) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
    if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }

  // ── The buckets, exactly as the FEC reports them ───────────────────────────
  // Order is presentation order and nothing else — it is the order the FEC's own
  // summary uses, not a ranking, and the rendered list re-sorts by amount.
  // `party` is present and counted in the base because it is money that was
  // raised; it carried no meaning in the retired score either.
  var BUCKETS = [
    { key: 'smallDollar', label: 'small-dollar contributions', short: 'Small-dollar' },
    { key: 'largeIndividual', label: 'large individual contributions', short: 'Large individual' },
    { key: 'pac', label: 'PAC contributions', short: 'PAC' },
    { key: 'selfFunded', label: 'candidate self-funding', short: 'Self-funded' },
    { key: 'party', label: 'party committee transfers', short: 'Party' }
  ];
  // Categorical, not evaluative. See the palette note in the header.
  var COLORS = {
    smallDollar: '#7cc4ff', largeIndividual: '#c4a6ff', pac: '#5efcc4',
    selfFunded: '#ffb86c', party: '#7596c0'
  };
  var ACCENT = '#9fb4d4';   // the lane's own neutral, used where a score used a ramp

  // ── COVERAGE ───────────────────────────────────────────────────────────────
  // Read live off the shipped index rather than hard-coded, so the sentence cannot
  // drift from the data the moment a filing is added. Both getters are overridable
  // for tests and for a future ingest that keeps its roster somewhere else.
  var _onFile = function () {
    var ids = W._pdxFinanceIds;
    if (typeof ids === 'function') { try { return (ids() || []).length; } catch (e) {} }
    var by = W._FTM_BY_ID;
    if (by && typeof by === 'object') {
      var n = 0;
      for (var k in by) {
        if (!Object.prototype.hasOwnProperty.call(by, k)) continue;
        if (by[k] && by[k].funding) n++;
      }
      return n;
    }
    return 0;
  };
  var _roster = function () {
    var src = W.CMP_DATA || W.PROFILES;
    return (src && typeof src === 'object') ? Object.keys(src).length : 0;
  };

  // A filing is on file for a small minority of the roster and the disclosure says
  // so in words, every time, unprompted — the same posture publication-floor.js
  // takes when it refuses to publish a Direction Match read. `thin` is true when
  // fewer than a third of the roster has a filing, which is the state the site is
  // actually in and is likely to stay in.
  var THIN_AT = 1 / 3;
  function coverage() {
    var on = _onFile(), all = _roster();
    var thin = !all || on < all * THIN_AT;
    var sentence;
    if (!all) {
      sentence = 'Campaign-finance filings are shown only where a disclosure ' +
        'report is on file. A blank here is missing data, not a finding.';
    } else {
      sentence = 'Itemized filings are on file for ' + on + ' of the ' + all +
        ' people PolitiDex carries. Where a filing is missing, that is missing ' +
        'data — it is not a finding about the person, and nothing on this lane ' +
        'is read as one.';
    }
    return { onFile: on, roster: all, thin: thin, sentence: sentence };
  }

  // ── COMPOSE ────────────────────────────────────────────────────────────────
  // One filing → what it says. Returns null when there is nothing to report, so
  // every caller renders a calm gap rather than a zeroed-out chart (a chart of
  // five empty bars is a statement about a person made out of no data).
  //   record — an FTM-shaped record: { id, name, funding: { …buckets… }, source }
  //   opts.asOf — the site's "as of" stamp, when the filing carries none.
  function compose(record, opts) {
    opts = opts || {};
    var fu = record && record.funding;
    if (!fu) return null;

    var amounts = {}, base = 0;
    BUCKETS.forEach(function (b) { amounts[b.key] = num(fu[b.key]); base += amounts[b.key]; });
    if (base <= 0) return null;

    // Shares, rounded once, here, so no two surfaces round differently.
    var shares = {};
    BUCKETS.forEach(function (b) { shares[b.key] = Math.round(100 * amounts[b.key] / base); });
    // Kept for the surfaces that already read it. It is a SUM OF BUCKETS and is
    // labelled as one wherever it prints — it is not a grade and there is no
    // threshold anywhere in this file that reads it.
    shares.concentrated = Math.round(100 * (amounts.largeIndividual + amounts.pac) / base);

    var rows = BUCKETS.map(function (b) {
      return {
        key: b.key, label: b.label, short: b.short, color: COLORS[b.key],
        amount: amounts[b.key], amountFmt: money(amounts[b.key]), share: shares[b.key]
      };
    }).filter(function (r) { return r.amount > 0; })
      .sort(function (a, b) { return b.amount - a.amount; });

    // "Largest" is a fact about a sorted list. It is not a verdict, it gets no
    // colour of its own, and a two-way tie is reported as a tie rather than
    // resolved by fiat.
    var largest = rows.length ? rows[0] : null;
    var tied = largest ? rows.filter(function (r) { return r.amount === largest.amount; }) : [];

    // Outside spending as the filing supports it: a level word and the note that
    // came with it. Never a dollar figure — outside spending is not itemized to
    // the candidate and inventing a number for it would be inventing data.
    var out = fu.outside || null;
    var outside = out ? {
      level: String(out.level || ''), note: out.note || '', source: out.source || ''
    } : null;

    return {
      pid: (record && record.id) || null,
      lane: 'finance',
      // Declared on every read, so a consumer that wants to print a grade has to
      // ignore the object telling it not to.
      scored: false,
      accent: ACCENT,
      receipts: base, receiptsFmt: money(base),
      cycle: fu.cycle || '',
      asOf: fu.asOf || opts.asOf || '',
      source: fu.source || (record && record.source) || '',
      amounts: amounts, shares: shares, rows: rows,
      largest: largest, largestTied: tied.length > 1,
      outside: outside,
      coverage: coverage()
    };
  }

  function read(pid) {
    if (!pid) return null;
    var rec = null;
    var by = W._FTM_BY_ID;
    if (by && by[pid]) rec = by[pid];
    if (!rec) return null;
    return compose(rec, { asOf: W.FTM_AS_OF || '' });
  }

  // ── THE COMPOSITION BLOCK ──────────────────────────────────────────────────
  // Dollars lead, share follows in the same row, and the stacked bar is a picture
  // of the same two numbers rather than a fourth figure. No tile, no headline
  // number, no "why this score".
  function compositionHtml(c) {
    if (!c) return '';
    var bar = c.rows.map(function (r) {
      return '<div title="' + attr(r.short + ' ' + r.share + '%') + '" style="width:' +
        Math.max(r.share, 1) + '%;background:' + r.color + ';height:100%;"></div>';
    }).join('');
    var list = c.rows.map(function (r) {
      return '<div style="display:flex;align-items:baseline;gap:0.5rem;padding:0.16rem 0;">' +
        '<span style="width:9px;height:9px;border-radius:2px;background:' + r.color +
          ';flex-shrink:0;position:relative;top:-1px;"></span>' +
        '<span style="flex:1;min-width:0;font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:#c8d8ea;">' +
          esc(r.label) + '</span>' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;font-weight:700;color:#dbe6f6;white-space:nowrap;">' +
          esc(r.amountFmt) + '</span>' +
        '<span style="width:34px;text-align:right;font-family:\'Barlow Condensed\',sans-serif;font-size:0.66rem;color:#7596c0;">' +
          r.share + '%</span>' +
      '</div>';
    }).join('');
    var cyc = c.cycle ? (esc(c.cycle) + ' cycle · ') : '';
    var outNote = c.outside && (c.outside.level || c.outside.note)
      ? '<div style="margin-top:0.5rem;font-family:\'Barlow\',sans-serif;font-size:0.66rem;color:#9fb4d4;line-height:1.5;">' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;color:#fb923c;">' +
            '🕳️ Outside spending reported' + (c.outside.level ? ' — ' + esc(c.outside.level) : '') +
          '</span><br>' + esc(c.outside.note) +
          ' Outside spending is not itemized to the candidate, so no dollar figure is shown for it.' +
          (c.outside.source ? ' <a href="' + attr(c.outside.source) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:#7596c0;">source ↗</a>' : '') +
        '</div>'
      : '';
    return '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(159,180,212,0.22);border-radius:0.625rem;padding:0.7rem 0.8rem;margin-bottom:0.75rem;">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem;margin-bottom:0.45rem;">' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">' +
          'Reported receipts, by source</span>' +
        '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.03em;color:#dbe6f6;">' +
          esc(c.receiptsFmt) + '</span>' +
      '</div>' +
      '<div style="display:flex;height:14px;border-radius:4px;overflow:hidden;margin-bottom:0.5rem;background:rgba(10,15,30,0.6);">' + bar + '</div>' +
      list +
      outNote +
      '<div style="margin-top:0.55rem;padding-top:0.45rem;border-top:1px solid rgba(255,255,255,0.06);font-family:\'Barlow\',sans-serif;font-size:0.62rem;color:#5b7196;line-height:1.5;">' +
        'Composition as filed. This is a disclosure record, not a score — nothing here ' +
        'is rated, ranked, or read by ⚖️ Word vs Action, by Direction Match, or by any ' +
        'ordering of one person against another.' +
      '</div>' +
      '<div style="margin-top:0.4rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.35rem;">' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.04em;color:#5b7196;">🕒 ' +
          cyc + (c.asOf ? 'updated ' + esc(c.asOf) : 'filing date on source') + '</span>' +
        (c.source ? '<a href="' + attr(c.source) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#7cc4ff;text-decoration:none;">📄 Verify at source ↗</a>' : '') +
      '</div>' +
    '</div>';
  }

  // ── THE REACHABILITY ROW ───────────────────────────────────────────────────
  // The old money section rendered nothing at all for the 744 people with no
  // filing, which left a reader unable to tell "checked, nothing concentrated" from
  // "never checked". This row renders in BOTH states and is the person file's one
  // labelled door into the money lane. The absent state is a sentence about the
  // data, never a sentence about the person.
  function entryHtml(pid) {
    var c = read(pid), cov = coverage();
    var head = '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">' +
      '💵 Campaign finance — disclosure lane</span>';
    if (!c) {
      return '<div style="border:1px dashed rgba(159,180,212,0.25);border-radius:0.7rem;padding:0.6rem 0.75rem;margin:0.5rem 0;">' +
        head +
        '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:#9fb4d4;line-height:1.55;margin:0.3rem 0 0;">' +
          '<strong style="color:#c8d8ea;">No itemized filing on file.</strong> ' + esc(cov.sentence) +
        '</p>' +
      '</div>';
    }
    var lead = c.largest
      ? ('Largest reported source: ' + esc(c.largest.label) + ' — ' +
         esc(c.largest.amountFmt) + ' of ' + esc(c.receiptsFmt) +
         (c.largestTied ? ' (tied with another source)' : ''))
      : ('Reported receipts: ' + esc(c.receiptsFmt));
    return '<div style="border:1px solid rgba(159,180,212,0.22);border-radius:0.7rem;padding:0.6rem 0.75rem;margin:0.5rem 0;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">' + head +
        '<a href="#follow-the-money" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#7cc4ff;text-decoration:none;white-space:nowrap;">Follow the Money →</a>' +
      '</div>' +
      '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:#c8d8ea;line-height:1.55;margin:0.3rem 0 0;">' + lead +
        ' <span style="color:#7596c0;">· ' + c.rows.length + ' reported source' +
        (c.rows.length === 1 ? '' : 's') + '</span></p>' +
    '</div>';
  }

  // The disclosure, on its own, for a surface that shows the lane at site level.
  function coverageHtml() {
    var cov = coverage();
    return '<p style="font-family:\'Barlow\',sans-serif;font-size:0.68rem;color:#9fb4d4;line-height:1.55;margin:0.4rem 0 0;">' +
      '<span style="font-family:\'Barlow Condensed\',sans-serif;letter-spacing:0.08em;text-transform:uppercase;font-size:0.56rem;color:#7596c0;">' +
      'Coverage</span> · ' + esc(cov.sentence) + '</p>';
  }

  W.PDXFinanceLane = {
    BUCKETS: BUCKETS.map(function (b) { return { key: b.key, label: b.label, short: b.short }; }),
    COLORS: COLORS, ACCENT: ACCENT, THIN_AT: THIN_AT,
    compose: compose, read: read,
    coverage: coverage, coverageHtml: coverageHtml,
    compositionHtml: compositionHtml, entryHtml: entryHtml,
    // Declared so the wall is readable from the object as well as from the header,
    // and asserted in scripts/test-finance-lane.mjs.
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking'],
    // Test/ingest seams. Overriding a getter cannot change what a filing says —
    // it can only change the denominator the disclosure sentence quotes.
    _setCounters: function (onFileFn, rosterFn) {
      if (typeof onFileFn === 'function') _onFile = onFileFn;
      if (typeof rosterFn === 'function') _roster = rosterFn;
    }
  };
})();
