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
  // ── THE BUCKET PALETTE IS NOW ONE COLOUR, AND THAT IS A REVERSAL ───────────
  // This map used to hold five distinguishable hues — blue, purple, mint, amber,
  // steel — one per bucket, and FINANCE_INTEGRITY.md defended them as categorical:
  // they distinguished buckets and ranked none of them. That defence was true of
  // the ORDER of the colours. It was not true of the colours themselves.
  //   `selfFunded` was #ffb86c. That is an amber, and its meaning was a donor-mix
  // category. A reader does not need a legend to know what an amber band in a
  // funding chart is telling them to think, and a palette cannot disclaim the
  // connotations of its own members. Five hues on the most prominent money visual
  // on the site also could not coexist with one money pair: whatever the chip and
  // the header agreed to mean, the bar underneath them spoke a different language
  // with five words in it.
  //   So every bucket is the money gold, and the composition is drawn as one bar
  // per bucket — gold for that bucket's dollars against a slate track for the rest
  // of the receipts. Length carries the share, which is the honest channel for a
  // proportion; the label and the dollar figure carry which bucket it is, which is
  // what text is for. Nothing is distinguished by hue, so nothing can be over-read
  // as ranked by hue. The doctrine's purpose survives; its mechanism does not.
  //   The five keys stay, because `compose()` publishes a `color` on every row and
  // consumers (the Money Tree, the ledger recap) read it. They now all read gold.
  var COLORS = {
    smallDollar: '#c9992f', largeIndividual: '#c9992f', pac: '#c9992f',
    selfFunded: '#c9992f', party: '#c9992f'
  };
  // ── THE MONEY TOKEN ────────────────────────────────────────────────────────
  // Mirrors the custom properties in finance-lane.css. Two homes because this
  // module builds several blocks with inline styles on purpose (they travel into
  // surfaces that do not load the lane's stylesheet), and a var() that resolves
  // to nothing renders an invisible bar. scripts/test-money-theme.mjs asserts the
  // two copies agree hex for hex, so they cannot drift.
  //
  // ONE PAIR. Deep forest fill, gold outline / 💰 / dollar marks. It means "this
  // is the money lane" and it means nothing else: it does not vary with donor
  // mix, with the size of the figure, or with whether a filing exists at all.
  // The empty file and the $8.6M file wear it identically. See the doctrine note
  // at the top of finance-lane.css.
  var THEME = {
    fill: 'rgba(15, 61, 46, 0.55)',
    fillHi: 'rgba(19, 78, 58, 0.78)',
    line: '#c9992f',
    lineSoft: 'rgba(201, 153, 47, 0.45)',
    ink: '#e3c176',
    text: '#bcd3c6',
    rest: '#3d4f66'
  };
  var ACCENT = THEME.line;  // the lane's one accent, where a score used a ramp

  // Unique-id counter for the mounted letterhead chip host. One profile can be
  // built more than once in a session (a repaint, a second modal), and two hosts
  // answering to one selector is a chip that repaints the wrong letterhead.
  var _seq = 0;

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

  // ── THE COMPOSITION BLOCK ─────────────────────────────────────────────────
  // Dollars lead, share follows in the same row, and the bar is a picture of the
  // same two numbers rather than a fourth figure. No tile, no headline number, no
  // "why this score".
  //
  //   WHY THIS IS NO LONGER ONE STACKED BAR. It used to be a single 14px bar cut
  // into five coloured segments. Two things were wrong with that. The first is the
  // palette — see COLORS above. The second is arithmetic: in `compose()` the five
  // buckets sum to `receipts` by construction, so the stack ALWAYS filled the full
  // width. A bar that is always 100% full is not measuring anything; it is a
  // decoration shaped like a measurement, and the only variable a reader could
  // actually see in it was which colour happened to be widest.
  //   Now each bucket gets its own row: a gold fill against a slate track, where
  // gold is that bucket's dollars and slate is every other dollar in the filing.
  // Those bars differ from one another, and they differ for the reason a reader
  // will assume they differ. No row is emphasised over another — same height, same
  // gold, same slate, whether the bucket is 2% or 71%.
  function compositionHtml(c) {
    if (!c) return '';
    var list = c.rows.map(function (r) {
      var w = Math.max(Math.min(r.share, 100), 0);
      return '<div style="padding:0.2rem 0;">' +
        '<div style="display:flex;align-items:baseline;gap:0.5rem;">' +
          '<span style="flex:1;min-width:0;font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:' + THEME.text + ';">' +
            esc(r.label) + '</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;font-weight:700;color:' + THEME.ink + ';white-space:nowrap;">' +
            esc(r.amountFmt) + '</span>' +
          '<span style="width:34px;text-align:right;font-family:\'Barlow Condensed\',sans-serif;font-size:0.66rem;color:#7596c0;">' +
            r.share + '%</span>' +
        '</div>' +
        '<div title="' + attr(r.short + ' ' + r.share + '% of reported receipts') +
          '" style="margin-top:0.18rem;height:7px;border-radius:4px;overflow:hidden;background:' + THEME.rest + ';">' +
          '<div style="width:' + w + '%;height:100%;background:' + THEME.line + ';border-radius:4px;"></div>' +
        '</div>' +
      '</div>';
    }).join('');
    var cyc = c.cycle ? (esc(c.cycle) + ' cycle · ') : '';
    // The outside-spending eyebrow was #fb923c. An orange headline attached to a
    // donor-mix fact is the banned channel exactly: it reported a level in colour
    // before the sentence underneath got to report it in words. The level, when
    // there is one, is still printed — as text, in the eyebrow, where a reader can
    // read what it is instead of inferring how bad it is.
    var outNote = c.outside && (c.outside.level || c.outside.note)
      ? '<div style="margin-top:0.5rem;font-family:\'Barlow\',sans-serif;font-size:0.66rem;color:#9fb4d4;line-height:1.5;">' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.08em;text-transform:uppercase;color:' + THEME.ink + ';">' +
            '🕳️ Outside spending reported' + (c.outside.level ? ' — ' + esc(c.outside.level) : '') +
          '</span><br>' + esc(c.outside.note) +
          ' Outside spending is not itemized to the candidate, so no dollar figure is shown for it.' +
          (c.outside.source ? ' <a href="' + attr(c.outside.source) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:#7596c0;">source ↗</a>' : '') +
        '</div>'
      : '';
    return '<div style="background:' + THEME.fill + ';border:1px solid ' + THEME.lineSoft + ';border-radius:0.625rem;padding:0.7rem 0.8rem;margin-bottom:0.75rem;">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem;padding-bottom:0.4rem;border-bottom:1px solid ' + THEME.lineSoft + ';">' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;color:' + THEME.line + ';">' +
          '💰 Reported receipts, by source</span>' +
        '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.03em;color:' + THEME.ink + ';">' +
          esc(c.receiptsFmt) + '</span>' +
      '</div>' +
      list +
      outNote +
      '<div style="margin-top:0.55rem;padding-top:0.45rem;border-top:1px solid rgba(255,255,255,0.06);font-family:\'Barlow\',sans-serif;font-size:0.62rem;color:#8fa8bd;line-height:1.5;">' +
        'Composition as filed. This is a disclosure record, not a score — nothing here ' +
        'is rated, ranked, or read by ⚖️ Word vs Action, by Direction Match, or by any ' +
        'ordering of one person against another.' +
      '</div>' +
      '<div style="margin-top:0.4rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.35rem;">' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.04em;color:#8fa8bd;">🕒 ' +
          cyc + (c.asOf ? 'updated ' + esc(c.asOf) : 'filing date on source') + '</span>' +
        (c.source ? '<a href="' + attr(c.source) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:' + THEME.ink + ';text-decoration:none;">📄 Verify at source ↗</a>' : '') +
      '</div>' +
    '</div>';
  }

  // ── THE REACHABILITY ROW ───────────────────────────────────────────────────
  // The old money section rendered nothing at all for the 744 people with no
  // filing, which left a reader unable to tell "checked, nothing concentrated" from
  // "never checked". This row renders in BOTH states and is the person file's one
  // labelled door into the money lane. The absent state is a sentence about the
  // data, never a sentence about the person.
  //
  //   ONE DOOR IN BOTH STATES, INCLUDING THE FRAME. This row used to draw itself
  // with a DASHED border when no filing was on file and a SOLID one when a filing
  // was, which meant the row's own outline announced the answer before the words
  // did — and announced it in the visual vocabulary of an unfinished thing. Both
  // states now take the identical money pair: forest fill, gold left edge, gold
  // dollar marks. What differs is the sentence inside, which is the only thing
  // entitled to differ.
  function entryHtml(pid) {
    var c = read(pid), cov = coverage();
    var box = 'background:' + THEME.fill + ';border:1px solid ' + THEME.lineSoft +
      ';border-left:3px solid ' + THEME.line + ';border-radius:0.55rem;padding:0.6rem 0.75rem;margin:0.5rem 0;';
    var head = '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:' + THEME.ink + ';">' +
      '<span style="color:' + THEME.line + ';">\ud83d\udcb0</span> Campaign finance \u2014 disclosure lane</span>';
    if (!c) {
      return '<div style="' + box + '">' + head +
        '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:' + THEME.text + ';line-height:1.55;margin:0.3rem 0 0;">' +
          '<strong style="color:#dbe6f6;">No itemized filing on file.</strong> ' + esc(cov.sentence) +
        '</p>' +
      '</div>';
    }
    var lead = c.largest
      ? ('Largest reported source: ' + esc(c.largest.label) + ' \u2014 ' +
         '<span style="color:' + THEME.ink + ';">' + esc(c.largest.amountFmt) + '</span> of ' +
         '<span style="color:' + THEME.ink + ';">' + esc(c.receiptsFmt) + '</span>' +
         (c.largestTied ? ' (tied with another source)' : ''))
      : ('Reported receipts: <span style="color:' + THEME.ink + ';">' + esc(c.receiptsFmt) + '</span>');
    return '<div style="' + box + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">' + head +
        '<a href="#follow-the-money" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:' + THEME.ink + ';text-decoration:none;white-space:nowrap;">Follow the Money \u2192</a>' +
      '</div>' +
      '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:' + THEME.text + ';line-height:1.55;margin:0.3rem 0 0;">' + lead +
        ' <span style="color:#7596c0;">\u00b7 ' + c.rows.length + ' reported source' +
        (c.rows.length === 1 ? '' : 's') + '</span></p>' +
    '</div>';
  }

  // ── THE LETTERHEAD MONEY CHIP — A DOOR, NOT A BLOCK ────────────────────────
  // One chip in the person file's identity block: a number, two or three
  // highlights, and a way down to the money section that shows the working. It is
  // the finance twin of ⚖️ Word vs Action's compact letterhead badge, and it is
  // deliberately built to the same rules, because the failure it is preventing is
  // the same failure.
  //
  // WHAT IT IS NOT. It is not a strip, a card, a chart, a donor table or a
  // composition. Everything that explains the money — the buckets, the bar, the
  // outside-spending note, the named top source, the as-of stamp, the coverage
  // sentence in full — lives in ONE place, the money section below, and the chip's
  // whole job is to get a reader there. A letterhead that answers the money
  // question in place is a letterhead that has grown a second money section, and
  // then the profile says the same thing twice at two different lengths, which is
  // exactly the state the header stack above ⚖️ Word vs Action was cut out of.
  //
  // NO SECOND ARITHMETIC. Every figure on the chip comes off read() — the one
  // composition read in this file, the same call the section and the cards make.
  // The dollar figure is the ITEMIZED BASE, the same base the shares are shares
  // of, so the number and the percentage beside it are answers about one filing
  // rather than two figures from two places that happen to sit in one pill. (The
  // section's own "Total Raised" tile reports career receipts, which is a
  // different and larger fact; the chip does not print it, because a share of a
  // cycle's itemized base next to a career total is a ratio with two denominators.)
  //
  // THREE STATES, AND THE EMPTY ONE ALWAYS RENDERS. This is the whole reason the
  // chip is worth having on a site with filings for a small minority of the
  // roster. If the chip only appeared where a filing exists, then "no chip" would
  // be doing the talking, and what it would say — to a reader who has learned that
  // this site puts a money chip on people with money problems — is "clean". It is
  // not clean; it is unchecked. So every profile gets a chip, and where there is
  // nothing on file the chip says that in words.
  //
  //   on file   💰 $8.6M · 38% small-dollar · top pile: Large individual · 13 of 757 filed
  //   partial   💰 Partial file · 6 items
  //   empty     💰 No money file yet
  //
  // NO RING, NO RAMP, NO RANK. One neutral accent for all three states. A chip
  // that is steel when the money is diffuse and amber when it is concentrated
  // delivers a verdict with colour after the words have carefully declined to,
  // which is the exact trick the retired Constituents-First badge was built on.
  // Nothing here is a grade, a level, a 0–100, or a comparison to another person.
  var SECTION_ID = 'pdxsec-funding';

  // Does a money file exist for this person at all — in whatever state? Separate
  // from read(), which reports null both for "no file" and for "a file we cannot
  // compose a base out of". Telling those two apart is what makes an honest
  // partial state possible instead of filing a thin record under "nothing here".
  function recordFor(pid) {
    if (!pid) return null;
    var by = W._FTM_BY_ID;
    return (by && by[pid]) ? by[pid] : null;
  }

  // How much is on a partial file, counted rather than characterised. Reported
  // items only — a total-raised line, the named donor rows, the sector rows. It is
  // a count of what a reader will find in the section, so the chip promises the
  // section exactly what the section can deliver.
  function itemCount(rec) {
    var n = 0;
    if (!rec) return 0;
    if (num(rec.totalRaised)) n++;
    if (rec.topDonors && rec.topDonors.length) n += rec.topDonors.length;
    if (rec.sectors && typeof rec.sectors === 'object') n += Object.keys(rec.sectors).length;
    return n;
  }

  // The chip's own three-valued read, published so a caller (or a test) can ask
  // what the letterhead will say without rendering markup to find out.
  function chipRead(pid) {
    var rec = recordFor(pid);
    var cov = coverage();
    if (!rec) {
      return { state: 'empty', pid: pid || null, sectionId: SECTION_ID,
               items: 0, composition: null, coverage: cov };
    }
    var c = read(pid);
    if (!c) {
      return { state: 'thin', pid: pid, sectionId: SECTION_ID,
               items: itemCount(rec), composition: null, coverage: cov };
    }
    return { state: 'file', pid: pid, sectionId: SECTION_ID,
             items: c.rows.length, composition: c, coverage: c.coverage || cov };
  }

  // Coverage, short enough to ride on one line. The chip quotes the two counts;
  // the sentence that says what a blank MEANS is in the aria-label and in full in
  // the section, because that sentence is a paragraph and this is a pill.
  function coverageTag(cov) {
    if (!cov) return '';
    return cov.roster
      ? (cov.onFile + ' of ' + cov.roster + ' filed')
      : (cov.onFile + ' filing' + (cov.onFile === 1 ? '' : 's') + ' on file');
  }

  // The visible segments, in the order the chip reads them: the figure, then the
  // highlights. Kept as data rather than baked into a string so the one-line rule
  // is inspectable — a chip is allowed a figure and up to three highlights, and a
  // fourth highlight is a strip that has not admitted it yet.
  function chipSegments(cr) {
    var segs = [];
    if (cr.state === 'file') {
      var c = cr.composition;
      segs.push({ fig: true, text: c.receiptsFmt });
      segs.push({ fig: false, text: c.shares.smallDollar + '% small-dollar' });
      // The top pile, EXCEPT when it is the pile the segment above just named.
      // "70% small-dollar · top pile: Small-dollar" spends a third of the chip
      // restating its own second segment, and a chip this size cannot afford a
      // highlight that adds nothing. The section below still names the largest
      // reported source in every case.
      if (c.largest && !(c.largest.key === 'smallDollar' && !c.largestTied)) {
        segs.push({ fig: false, text: c.largestTied
          ? 'top pile: tied'
          : ('top pile: ' + c.largest.short) });
      }
      var tag = coverageTag(cr.coverage);
      if (tag) segs.push({ fig: false, text: tag });
    } else if (cr.state === 'thin') {
      segs.push({ fig: true, text: 'Partial file' });
      segs.push({ fig: false, text: cr.items + ' item' + (cr.items === 1 ? '' : 's') });
    } else {
      segs.push({ fig: true, text: 'No money file yet' });
    }
    return segs;
  }

  // What a screen reader hears, which is where the honest long form goes. The
  // coverage disclosure is quoted whole in the two states where a reader might
  // otherwise take a gap for a finding.
  function chipLabel(cr) {
    var cov = cr.coverage || {};
    if (cr.state === 'file') {
      var c = cr.composition;
      var top = c.largest
        ? (c.largestTied ? 'Largest reported source tied. '
                         : ('Largest reported source: ' + c.largest.label + '. '))
        : '';
      return c.receiptsFmt + ' in itemized receipts' + (c.cycle ? ', ' + c.cycle + ' cycle' : '') +
        '. ' + c.shares.smallDollar + '% small-dollar. ' + top +
        'Open the money section on this file for the full composition.';
    }
    if (cr.state === 'thin') {
      return 'Partial money file — ' + cr.items + ' reported item' +
        (cr.items === 1 ? '' : 's') + ' and no itemized composition. ' +
        (cov.sentence || '') + ' Open the money section on this file.';
    }
    return 'No money file on record for this person yet. ' + (cov.sentence || '') +
      ' Open the money section on this file, which says the same in full.';
  }

  // ── MOUNT-THEN-JUMP ────────────────────────────────────────────────────────
  // The chip goes DOWN THIS PAGE and nowhere else. It is not a link to the
  // site-level 💰 Follow the Money section: a reader who taps a chip beside a
  // person's name and lands on a national index has been navigated off the file
  // they were reading, and the back button is not an answer to that.
  //
  // The money stage can sit inside a fold or a deferred drawer, so the target node
  // may legitimately not exist when the chip is tapped. _pdxNavJump already solves
  // exactly this for the profile rail: it reveals the target (mounting a deferred
  // drawer's held-back markup), opens every collapsed box above it, and measures
  // the scroll AFTER that so the offset reflects the expanded layout. Reusing it
  // rather than reimplementing a scroll means the chip cannot drift from the rail.
  function sectionHost(id) {
    var doc = W.document;
    var a = doc && doc.getElementById(id);
    if (!a) return null;
    // The anchor is a zero-height aria-hidden marker sitting just above the
    // section it names. Focusing that is focusing nothing, so step to the block it
    // marks — which is the thing a reader was sent here to read.
    if (a.getAttribute && a.getAttribute('aria-hidden') === 'true') {
      return a.nextElementSibling || a.parentElement || a;
    }
    return a;
  }

  function focusSection(id) {
    var host = sectionHost(id);
    if (!host || typeof host.focus !== 'function') return false;
    try {
      if (host.hasAttribute && !host.hasAttribute('tabindex')) host.setAttribute('tabindex', '-1');
      host.focus({ preventScroll: true });
    } catch (e) {
      try { host.focus(); } catch (e2) { return false; }
    }
    return true;
  }

  // The chip's one action. Exposed on the object so the inline handler is a call
  // to a named function rather than a scroll expression pasted into markup.
  function openSection() {
    var id = SECTION_ID;
    try {
      if (typeof W._pdxNavJump === 'function') {
        W._pdxNavJump(id);
      } else {
        if (typeof W._pdxRevealTarget === 'function') W._pdxRevealTarget(id);
        var el = W.document && W.document.getElementById(id);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {}
    // After the reveal, never before it: on a deferred stage the node that gets
    // focus is the one that just materialised, not the absence that preceded it.
    try { focusSection(id); } catch (e) {}
    return false;
  }

  function letterheadChipHtml(pid) {
    try {
      var cr = chipRead(pid);
      var segs = chipSegments(cr);
      var inner = '';
      for (var i = 0; i < segs.length; i++) {
        if (i) inner += '<span class="pdx-mchip-sep" aria-hidden="true">·</span>';
        inner += '<span class="' + (segs[i].fig ? 'pdx-mchip-fig' : 'pdx-mchip-hi') + '">' +
          esc(segs[i].text) + '</span>';
      }
      return '<button type="button" class="pdx-mchip" data-pdx-mchip="' + attr(String(pid || '')) + '"' +
        ' data-pdx-mchip-state="' + attr(cr.state) + '"' +
        ' onclick="event.stopPropagation();if(window.PDXFinanceLane)window.PDXFinanceLane.openSection();"' +
        ' aria-label="' + attr(chipLabel(cr)) + '">' +
          '<span class="pdx-mchip-ico" aria-hidden="true">💰</span>' + inner +
        '</button>';
    } catch (e) { return ''; }
  }

  // Host + one deferred re-read, the same discipline the ⚖️ letterhead badge
  // keeps. Not for the same reason, though, and the difference is worth stating:
  // there is no warm event on this lane, because the filing index is inline
  // synchronous data. The single re-read exists only so a letterhead built before
  // that index was attached does not sit there saying "no money file yet" about a
  // person who has one — and it is allowed to repaint ONLY out of the empty state,
  // so a chip that is already telling the truth is never rewritten under a reader.
  function bindLetterheadChip(uid, pid) {
    var doc = W.document;
    if (!doc || !W.setTimeout) return;
    W.setTimeout(function () {
      try {
        var host = doc.querySelector('[data-pdx-mchip-host="' + uid + '"]');
        if (!host) return;
        var shown = host.firstChild && host.firstChild.getAttribute
          ? host.firstChild.getAttribute('data-pdx-mchip-state') : null;
        if (shown !== 'empty') return;
        if (chipRead(pid).state === 'empty') return;
        host.innerHTML = letterheadChipHtml(pid);
      } catch (e) {}
    }, 0);
  }

  function letterheadChipMount(pid) {
    try {
      _seq++;
      var uid = ('mchip-' + String(pid || 'none') + '-' + _seq).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = letterheadChipHtml(pid);
      bindLetterheadChip(uid, pid);
      return '<span class="pdx-mchip-host" data-pdx-mchip-host="' + attr(uid) + '">' + inner + '</span>';
    } catch (e) { return ''; }
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
    // THEME is published so the fence can compare it, value by value, against the
    // :root custom properties in finance-lane.css. Two copies of the token exist
    // (inline styles travel into surfaces that never load the stylesheet), and two
    // copies that can drift silently are worse than one that cannot travel.
    THEME: THEME, COLORS: COLORS, ACCENT: ACCENT, THIN_AT: THIN_AT,
    compose: compose, read: read,
    coverage: coverage, coverageHtml: coverageHtml,
    compositionHtml: compositionHtml, entryHtml: entryHtml,
    // ── The letterhead chip: the person file's compact money door ────────────
    // letterheadChipMount(pid) is what a letterhead wants — host + markup, and
    // it renders on EVERY profile including the ones with nothing on file, which
    // is the point (see the block over SECTION_ID). letterheadChipHtml() is the
    // pure string; chipRead() is the three-valued state ('file' | 'thin' |
    // 'empty') for anything that needs to know what the chip will say without
    // rendering it. SECTION_ID / openSection() are the door: the id on this same
    // person file that the chip jumps to, and the jump itself, which mounts a
    // deferred stage before scrolling and focuses the section on arrival.
    SECTION_ID: SECTION_ID,
    chipRead: chipRead,
    letterheadChipHtml: letterheadChipHtml,
    letterheadChipMount: letterheadChipMount,
    openSection: openSection,
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
