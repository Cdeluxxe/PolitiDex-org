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
     • It is not an input to the personal alignment read (the issue side-map and
       its coverage) or to a Door 2 pick — not to the seat list, the field gate,
       the pick store or the running count. Those two are named separately from
       `ballotSort` and `yourMatch` above because they are the surfaces where a
       money figure would stop being a report and start being advice: alignment
       is what the site says a reader has in common with a person, and a Door 2
       pick is the reader's ballot. Neither may move because a filing exists.
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

  // One lookup for the whole lane. read() used to inline its own `_FTM_BY_ID` dip,
  // which is how it and recordFor() could ever have disagreed about whether a
  // person has a file; both now go through the one door above.
  function read(pid) {
    if (!pid) return null;
    var rec = recordFor(pid);
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

  // ── THE SOURCE GAP, NAMED ──────────────────────────────────────────────────
  // "No money file on hand" is honest and still incomplete. It says the shelf is
  // empty without saying WHICH ARCHIVE the file would have come from, and a reader
  // cannot tell these three apart from the blank alone:
  //
  //     the FEC publishes this filing and PolitiDex has not read it yet
  //     the filing sits in Utah's state system, which has no API to read it from
  //     no disclosure source is open for this office at all
  //
  // Those are different facts about the gap, and only the third one is close to
  // "there may be nothing to find". Naming the authority converts a blank from a
  // hint about the person into a task on our side of the line.
  //
  // DERIVED FROM THE OFFICE STRING, AND FROM NOTHING ELSE. This function invents no
  // filing, no donor, no committee and no figure. It reads `office` / `state` off
  // the roster record — the same two fields the profile header prints — and returns
  // the name of the archive that would hold the document. Where PolitiDex has no
  // source open it says exactly that, rather than naming an archive it has not
  // looked in, because "search the FEC" printed under a county council seat is a
  // false lead dressed as a citation.
  var FEDERAL_RE = /president|u\.?\s?s\.?\s*(senator|senate|rep\b|representative|congress)|congress(man|woman|person)?\b|house of representatives/i;

  function rosterRec(pid) {
    var src = W.CMP_DATA || W.PROFILES;
    return (src && pid && src[pid]) ? src[pid] : null;
  }
  function fieldOf(pid, p, key) {
    if (p && p[key]) return String(p[key]);
    var rec = rosterRec(pid);
    return (rec && rec[key]) ? String(rec[key]) : '';
  }

  // { authority, url, line } — one line, ready to print inside the lane.
  function sourceGap(pid, p) {
    var office = fieldOf(pid, p, 'office');
    var state = fieldOf(pid, p, 'state');
    if (FEDERAL_RE.test(office)) {
      return {
        authority: 'FEC',
        url: 'https://www.fec.gov/data/candidates/',
        line: 'Source gap — this is a federal office, so the filings are public at the ' +
              'FEC and PolitiDex has not opened a file from them for this person.'
      };
    }
    if (/utah/i.test(state) || /utah/i.test(office)) {
      return {
        authority: 'Utah state disclosures',
        url: 'https://disclosures.utah.gov/Search/PublicSearch',
        line: 'Source gap — this is a Utah state or local office, so the filings sit in ' +
              'Utah’s state disclosure system, which publishes no API to read them from. ' +
              'A curator has not transcribed this one.'
      };
    }
    return {
      authority: 'none opened',
      url: '',
      line: 'Source gap — PolitiDex has no disclosure source open for this office' +
            (state ? ' in ' + esc(state) : '') + ' yet, so no filing has been looked for. ' +
            'This is an unopened archive, not a search that came back empty.'
    };
  }

  // The one-line rendering of the above, for the empty state of any money surface.
  function sourceGapHtml(pid, p) {
    var g = sourceGap(pid, p);
    return '<p style="font-family:\'Barlow\',sans-serif;font-size:0.66rem;color:' + THEME.text +
      ';line-height:1.5;margin:0.35rem 0 0;">' + esc(g.line) +
      (g.url ? ' <a href="' + attr(g.url) + '" target="_blank" rel="noopener noreferrer" ' +
        'onclick="event.stopPropagation();" style="color:' + THEME.ink + ';white-space:nowrap;">' +
        esc(g.authority) + ' ↗</a>' : '') +
    '</p>';
  }

  // ── THE COUNTS LEAD ────────────────────────────────────────────────────────
  // What a person WITH a file leads with. The money section used to open on a pill
  // reading "Grassroots · 38% small-dollar" beside a "Large war chest" tag, which is
  // the retired Constituents-First grade wearing prose: three donor-mix levels, a
  // three-step size tier, and a 0–100 figure sitting on the first line of the lane.
  //
  // This is counts instead. How many reported sources the filing breaks into, how
  // many industry sectors are named in it, and what the candidate put in from their
  // own pocket — each one a quantity a reader can go and check against the linked
  // document, none of them a level. The shares still exist and are still published;
  // they live one block down in compositionHtml(), attached to the bucket they are a
  // share OF, which is the only place a percentage on this lane is a composition
  // rather than a grade.
  //
  // IN-STATE VS OUT-OF-STATE IS NOT HERE, AND SAYS SO. It is the count a reader most
  // wants and the FTM records do not carry donor geography at all. Deriving it would
  // mean inventing it, so the row names it as a gap in what we hold. An absent count
  // that is labelled absent costs a reader nothing; one that is quietly approximated
  // costs them the ability to trust the three beside it.
  function countsHtml(c, rec) {
    if (!c) return '';
    rec = rec || {};
    var sectors = (rec.sectors && typeof rec.sectors === 'object')
      ? Object.keys(rec.sectors).length : 0;
    var donors = (rec.topDonors && rec.topDonors.length) ? rec.topDonors.length : 0;
    var self = num(c.amounts && c.amounts.selfFunded);

    var items = [
      { k: 'Reported sources', v: String(c.rows.length),
        n: 'buckets the filing breaks into' },
      { k: 'Named contributors', v: donors ? String(donors) : 'none itemized',
        n: donors ? 'listed on the filing' : 'no donor list in what we hold' },
      { k: 'Industry sectors', v: sectors ? String(sectors) : 'none itemized',
        n: sectors ? 'named in the filing' : 'no sector breakdown on file' },
      { k: 'Candidate self-funding', v: self ? money(self) : 'none reported',
        n: self ? 'from their own pocket' : 'nothing from their own pocket' }
    ];
    var cells = items.map(function (it) {
      return '<div style="min-width:0;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.09em;' +
          'text-transform:uppercase;color:' + THEME.line + ';">' + esc(it.k) + '</div>' +
        '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.03em;color:' +
          THEME.ink + ';line-height:1.2;">' + esc(it.v) + '</div>' +
        '<div style="font-family:\'Barlow\',sans-serif;font-size:0.6rem;color:#8fa8bd;line-height:1.35;">' +
          esc(it.n) + '</div>' +
      '</div>';
    }).join('');

    return '<div style="background:' + THEME.fill + ';border:1px solid ' + THEME.lineSoft +
        ';border-radius:0.625rem;padding:0.7rem 0.8rem;margin-bottom:0.75rem;">' +
      '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;letter-spacing:0.1em;' +
        'text-transform:uppercase;color:' + THEME.line + ';margin-bottom:0.5rem;">' +
        '💰 What the filing is made of' + (c.cycle ? ' · ' + esc(c.cycle) + ' cycle' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:0.6rem 0.8rem;">' +
        cells +
      '</div>' +
      '<p style="font-family:\'Barlow\',sans-serif;font-size:0.62rem;color:#8fa8bd;line-height:1.5;' +
        'margin:0.55rem 0 0;padding-top:0.45rem;border-top:1px solid rgba(255,255,255,0.06);">' +
        'Counts as filed, not a rating — there is no total here and nothing is compared to ' +
        'another person. In-state vs out-of-state giving is not shown because the records ' +
        'PolitiDex holds carry no donor geography; it is missing from our copy of the filing ' +
        'rather than absent from the filing.' +
      '</p>' +
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
  function entryHtml(pid, p) {
    var c = read(pid), cov = coverage();
    var box = 'background:' + THEME.fill + ';border:1px solid ' + THEME.lineSoft +
      ';border-left:3px solid ' + THEME.line + ';border-radius:0.55rem;padding:0.6rem 0.75rem;margin:0.5rem 0;';
    var head = '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:' + THEME.ink + ';">' +
      '<span style="color:' + THEME.line + ';">\ud83d\udcb0</span> Campaign finance \u2014 disclosure lane</span>';
    if (!c) {
      // The blank, plus the archive the file would have come from. Without that
      // second line the row states an absence and stops, and an absence with no
      // named cause is the thing a reader fills in themselves.
      return '<div style="' + box + '">' + head +
        '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:' + THEME.text + ';line-height:1.55;margin:0.3rem 0 0;">' +
          '<strong style="color:#dbe6f6;">No money file on hand.</strong> ' + esc(cov.sentence) +
        '</p>' +
        sourceGapHtml(pid, p) +
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
        '<a href="/money" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:' + THEME.ink + ';text-decoration:none;white-space:nowrap;">Follow the Money \u2192</a>' +
      '</div>' +
      '<p style="font-family:\'Barlow\',sans-serif;font-size:0.7rem;color:' + THEME.text + ';line-height:1.55;margin:0.3rem 0 0;">' + lead +
        ' <span style="color:#7596c0;">\u00b7 ' + c.rows.length + ' reported source' +
        (c.rows.length === 1 ? '' : 's') + '</span></p>' +
    '</div>';
  }

  // ── THE TWO LETTERHEAD MONEY CHIPS — TWO DOORS, NOT A TOTAL ────────────────
  // Two chips in the person file's identity block, in the same row as ⚖️ Word vs
  // Action, both in the one green-and-gold money pair, both led by 💰 — and they
  // are not two views of one number:
  //
  //   💰 $774M itemized receipts · 2024 · FEC          → campaign filings block
  //   💰 $1–5M disclosed · 10 yrs in office · 2024 FD  → disclosures block
  //
  // TWO PILLS, TWO UNITS, NEVER ONE NUMBER. The first is what a CAMPAIGN raised
  // and reported, under contribution limits, to an election authority. The second
  // is what a PERSON told a clerk they own while holding the office. Different
  // questions, different archives, different spans, and the single most damaging
  // thing this letterhead could do is let a reader add them. So: no sum, no
  // combined figure, no "total money" pill, no ratio of one to the other, and the
  // two never share a segment. Two chips is not a redundancy waiting to be tidied
  // into one; the separation IS the finding.
  //
  //   The unit rides on the figure in both, for the same reason it always has
  // here: "$774M" alone is a number about a person. "$774M itemized receipts" is a
  // number about a document. "$1–5M disclosed" is a number about a form somebody
  // signed. A reader handed only the digits has been handed the one reading we are
  // certain is wrong.
  //
  // NEVER $0, AND NOBODY "EARNED" ANYTHING. A missing filing and a missing
  // disclosure are both rendered as WORDS, in both chips, on every profile —
  // never as a zero, never as an empty pill, never as no pill at all. Zero is a
  // figure, and a figure printed where nobody looked is a reading of a person
  // assembled out of missing data. And no surface on this lane says a person
  // "earned" or "made" a receipts figure: money that passed through a committee is
  // not income, and $774M of itemized receipts describes a fundraising operation.
  //
  // WHAT THEY ARE NOT. Neither is a strip, a card, a chart, a table or a
  // composition. Everything that explains either number — the buckets, the bar,
  // the outside-spending note, the named top source, the as-of stamp, the
  // disclosure form link, the coverage sentences in full — lives in ONE place per
  // lane, in the money section below, and each chip's whole job is to get a reader
  // to its own block there. A letterhead that answers the money question in place
  // is a letterhead that has grown a second money section, and then the profile
  // says the same thing twice at two different lengths, which is exactly the state
  // the header stack above ⚖️ Word vs Action was cut out of.
  //
  // COVERAGE COUNTS AND THE TOP SOURCE CAME OFF THE PILL. The on-file receipts
  // chip used to run four segments long: "$8.6M itemized 2024 cycle · top source:
  // Large individual · OpenSecrets file · 13 of 1120 filed". Two chips in one row
  // cannot both be four segments long without becoming the strip this lane
  // refuses to be — and of everything the pill could give up, those two are the
  // two that a reader needs a denominator and a bucket list to interpret, which is
  // to say they need the section. Both are still spoken in full in the aria-label
  // and printed in full in BOTH section blocks. Nothing was deleted; it moved one
  // jump away, to where it can be read correctly.
  //
  // NO SECOND ARITHMETIC. Every receipts figure comes off read(), the one
  // composition read in this file. Every disclosure figure comes off
  // PDXFinance.wealth() as the STRING it was published as — see the wall in
  // pdx-finance.js: no midpoint, no parse, no arithmetic on a band. A chip
  // carrying only a range therefore cannot print a single dollar figure, because
  // no code path in either file could produce one.
  //
  // THE EMPTY STATES ALWAYS RENDER. This is the whole reason the chips are worth
  // having on a site with filings for a small minority of the roster and
  // disclosure forms for none of it yet. If a chip appeared only where a file
  // exists, "no chip" would be doing the talking — and what it would say, to a
  // reader who has learned that this site puts a money chip on people with money,
  // is "clean". It is not clean; it is unchecked.
  //
  //   receipts, on file   💰 $8.6M itemized receipts · 2024 · OpenSecrets
  //   receipts, partial   💰 Partial file · 6 items · OpenSecrets
  //   receipts, empty     💰 No money file on hand
  //   wealth, on file     💰 $1–5M disclosed · 10 yrs in office · 2024 FD
  //   wealth, empty       💰 No in-office wealth file on hand
  //
  // NO RING, NO RAMP, NO RANK, AND NO TELLING THE TWO APART BY COLOUR. One neutral
  // accent across all five states and both chips. A chip that is steel when the
  // money is diffuse and amber when it is concentrated delivers a verdict with
  // colour after the words have carefully declined to, which is the exact trick
  // the retired Constituents-First badge was built on. Nothing here is a grade, a
  // level, a 0–100, a percentage or a comparison to another person.
  //
  // TWO DOORS, TWO TARGETS, ONE PAGE. The chips are not the same click: receipts
  // jumps to the campaign-filings block, wealth jumps to the disclosures block,
  // each focusing its own heading on arrival. A reader who taps the disclosure
  // pill and lands on the donor composition has been answered with the other
  // archive. Neither chip leaves the person file — see the wall over openSection.
  var SECTION_ID = 'pdxsec-funding';
  var WEALTH_SECTION_ID = 'pdxsec-wealth';

  // Does a money file exist for this person at all — in whatever state? Separate
  // from read(), which reports null both for "no file" and for "a file we cannot
  // compose a base out of". Telling those two apart is what makes an honest
  // partial state possible instead of filing a thin record under "nothing here".
  //   THE LOOKUP ORDER IS THE BUG THIS FILE WAS SHIPPING. recordFor() used to read
  // `W._FTM_BY_ID` and nothing else. That index is built inside index.html's
  // Follow-the-Money IIFE, so `var _FTM_BY_ID` is a CLOSURE variable and never
  // reaches `window` — which means the lookup returned null in every browser, for
  // every person, including the ones with a filing. The visible result was a
  // letterhead reading "No money file" directly above a money section drawing the
  // full $8.6M composition (that section reads `window._pdxFinanceSignal`, which IS
  // exposed), and a coverage sentence that counted 0 filings out of 800 instead of
  // 13. Two surfaces disagreeing about whether a filing exists is worse than either
  // answer alone, and the one that was wrong was the one on the first screen.
  //   `_pdxFinanceFiling(pid)` is the published accessor and is tried first: it
  // hands back a shallow copy, so a display module cannot mutate the shipped record
  // it is reporting. The bare `_FTM_BY_ID` lookup stays as the second seam, because
  // that is where the fences and any future ingest attach their own index.
  //   THE SECOND SEAM RESOLVES THE SAME IDS AS THE FIRST. Two of the thirteen
  // filings are stored under a short key the roster does not use — `bking` for
  // the person file `brian_king`, `gleich` for `caroline_gleich` — and the
  // shipped index owns that mapping (FTM_ID_ALIAS in index.html, published as
  // `PDX_FINANCE_ID_ALIAS`). `_pdxFinanceFiling` already applies it. The raw
  // fallback below has to apply it too, or the lane would answer one way when
  // index.html's accessors are present and another way when they are not, which
  // is a per-environment disagreement about whether a person has a filing.
  // The alias is read from the index rather than typed here: one table, two
  // seams, and no chance of the copies drifting apart. Both seams are held to
  // the same answer by scripts/test-finance-id-alias.mjs, which boots this file
  // against the real shipped index with the accessor present and absent.
  function aliasKey(pid) {
    var map = W.PDX_FINANCE_ID_ALIAS;
    return (map && typeof map === 'object' && map[pid]) ? map[pid] : '';
  }
  function recordFor(pid) {
    if (!pid) return null;
    var get = W._pdxFinanceFiling;
    if (typeof get === 'function') {
      try { var r = get(pid); if (r) return r; } catch (e) {}
    }
    var by = W._FTM_BY_ID;
    if (!by) return null;
    if (by[pid]) return by[pid];
    var k = aliasKey(pid);
    return (k && by[k]) ? by[k] : null;
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
               items: itemCount(rec), composition: null,
               source: (rec.funding && rec.funding.source) || rec.source || '',
               coverage: cov };
    }
    return { state: 'file', pid: pid, sectionId: SECTION_ID,
             items: c.rows.length, composition: c, source: c.source || '',
             coverage: c.coverage || cov };
  }

  // ── WHICH ARCHIVE THE FIGURE CAME OUT OF ────────────────────────────────────
  // A dollar figure beside a person's name has two readings and only one of them is
  // ours. "$780M" on a letterhead can be read as campaign receipts or as what this
  // person is worth, and nothing in a pill's width had ever said which — the chip
  // relied on the reader knowing that a site with a 💰 glyph means donations. So the
  // figure now carries its unit ("itemized", "2024 cycle") and its PROVENANCE: the
  // archive the filing was transcribed from, named on the chip, so the number is
  // visibly a document rather than an estimate of a person.
  //   READ OFF THE FILING'S OWN SOURCE URL, never typed at a call site and never
  // guessed from the office. The filing carries the link a reader can open; the host
  // of that link is the authority that published it, and the two therefore cannot
  // disagree. An unrecognised host says "filed" and names nobody — a wrong authority
  // on a real figure is worse than no authority at all.
  //   NOT A GRADE AND NOT A RANK. "FEC file" says where the paperwork is, which is a
  // fact about disclosure, not about the person. It is the same class of statement as
  // the coverage counts beside it, and like them it has no tone, no colour and no
  // threshold anywhere in this file that reads it.
//   THREE LENGTHS OF THE SAME FACT, one per surface that has room for it.
  // `short` is the bare authority for a pill now sharing its row with a second
  // chip ("FEC"), `tag` is the phrase for anywhere with a line to itself ("FEC
  // file"), `name` is what a screen reader hears in a sentence ("Transcribed from
  // the FEC"). Three lengths, one row, so they cannot name different authorities.
  var ARCHIVES = [
    { re: /(^|\.)fec\.gov$/i,            tag: 'FEC file',             short: 'FEC',              name: 'the FEC' },
    { re: /(^|\.)disclosures\.utah\.gov$/i, tag: 'Utah disclosure file', short: 'Utah disclosures', name: 'Utah state disclosures' },
    { re: /(^|\.)opensecrets\.org$/i,    tag: 'OpenSecrets file',     short: 'OpenSecrets',      name: 'OpenSecrets' }
  ];
  function archiveOf(url) {
    var u = String(url || '');
    if (!u) return null;
    var host = '';
    try { host = (u.split('//')[1] || '').split('/')[0].split('?')[0].toLowerCase(); } catch (e) { host = ''; }
    if (!host) return null;
    for (var i = 0; i < ARCHIVES.length; i++) {
      if (ARCHIVES[i].re.test(host)) return ARCHIVES[i];
    }
    return { re: null, tag: 'filed', short: 'filed', name: 'the published filing' };
  }
  // The figure with its unit welded on. "$780M" alone is a number about a person;
  // "$780M itemized receipts" is a number about a document, and that difference is
  // the whole point of this segment. The unit no longer bends around the cycle —
  // it used to read "$780M itemized 2024 cycle" when the record stated one and
  // "$780M in itemized receipts" when it did not, which meant the noun naming WHAT
  // KIND OF MONEY this is disappeared exactly when the filing was least specific.
  // The unit is now unconditional and the year rides in its own segment beside it,
  // where it can be dropped without taking the unit with it.
  function figureText(c) {
    if (!c) return '';
    return c.receiptsFmt + ' itemized receipts';
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
  //   THE CHIP CARRIES COUNTS, NOT A SHARE. The on-file chip used to read
  // "$8.6M · 38% small-dollar · top pile: Large individual · 13 of 757 filed". That
  // 38% was the one thing on it that could be mistaken for a reading of the person:
  // a bare 0–100 about someone, sitting on the first screen inches from ⚖️ Word vs
  // Action's percentage and Your Match's percentage, with nothing in the pill's own
  // width to say which of the three grammars it belonged to. A share of a
  // composition is still composition — but only where the bucket it is a share OF is
  // printed beside it, which is true in the section below and cannot be true in a
  // pill. So the chip answers how much / who / how well disclosed, all as counts,
  // and the percentages stay attached to their buckets one jump away.
  //   The old "same pile twice" dedupe went with the share. It existed because
  // "70% small-dollar · top pile: Small-dollar" restated its own previous segment;
  // with no share segment there is nothing for the top source to restate, so a
  // small-dollar-led filing now names its largest source like every other filing.
  function chipSegments(cr) {
    var segs = [];
    if (cr.state === 'file') {
      var c = cr.composition;
      // HOW MUCH — the itemized base, the same base every share in the section is
      // taken over, so the chip and the section are answers about one filing.
      segs.push({ fig: true, text: figureText(c) });
      // WHEN — the filing's own cycle year, bare. It is the figure's span, and a
      // dollar total with no span on it is a claim about a career. Dropped rather
      // than invented where the record states no cycle; the unit above survives
      // that drop on its own (see figureText).
      if (c.cycle) segs.push({ fig: false, text: String(c.cycle) });
      // WHERE THE PAPERWORK IS. See the wall over archiveOf. An unrecognised host
      // names nobody rather than guessing an authority.
      var arc = archiveOf(c.source);
      if (arc) segs.push({ fig: false, text: arc.short });
    } else if (cr.state === 'thin') {
      segs.push({ fig: true, text: 'Partial file' });
      // Counted, not characterised: reported items only — a total-raised line, the
      // named donor rows, the sector rows. It is a count of what a reader will
      // actually find in the block below, so the chip promises the section exactly
      // what the section can deliver.
      segs.push({ fig: false, text: cr.items + ' item' + (cr.items === 1 ? '' : 's') });
      // A partial file is still a file, so it still says which archive it came out
      // of. Provenance is the one segment that belongs on every state that has a
      // document behind it — a figure a reader cannot trace is an estimate.
      var tarc = archiveOf(cr.source);
      if (tarc) segs.push({ fig: false, text: tarc.short });
    } else {
      // "No money file YET" was the wrong word and it was doing real work. "Yet"
      // describes a queue: it tells a reader the file is coming, which implies
      // somebody looked and found the archive still loading. For most of this
      // roster nobody has looked, and there is no ingest scheduled to look. "On
      // hand" states the only thing we can stand behind — what PolitiDex is
      // holding — and leaves the reason to the source-gap line in the lane itself.
      // The wealth chip's empty state is built to this same grammar, deliberately:
      // two pills in one row speaking two dialects of absence would read as two
      // different KINDS of absence, and they are the same kind.
      segs.push({ fig: true, text: 'No money file on hand' });
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
      // Counts here too, matching the visible pill word for word. A screen reader
      // hearing a percentage the sighted chip no longer prints would be getting a
      // different lane, and the longer form is not a licence to say more than the
      // surface it names — only to say it more fully.
      // The source COUNT lives here now rather than on the pill (see chipSegments),
      // so this is the surface that still speaks it — the longer form says the same
      // things more fully, and it may not say fewer of them than the pill does.
      var arc = archiveOf(c.source);
      return c.receiptsFmt + ' in itemized campaign receipts' + (c.cycle ? ', ' + c.cycle + ' cycle' : '') +
        ' across ' + c.rows.length + ' reported source' + (c.rows.length === 1 ? '' : 's') + '. ' + top +
        (arc ? 'Transcribed from ' + arc.name + '. ' : '') +
        // The coverage counts came off the visible pill when the second chip
        // joined the row (see the wall above), which makes this the surface that
        // still speaks them. The longer form may say the same things more fully
        // than the pill; it may not say fewer of them.
        (cov.sentence ? cov.sentence + ' ' : '') +
        'This is campaign money raised, not personal wealth, and it is not added ' +
        'to the disclosure figure beside it. ' +
        'Open the campaign filings block on this file for the full composition, bucket by bucket.';
    }
    if (cr.state === 'thin') {
      var tarc2 = archiveOf(cr.source);
      return 'Partial money file — ' + cr.items + ' reported item' +
        (cr.items === 1 ? '' : 's') + ' and no itemized composition. ' +
        (tarc2 && tarc2.re ? 'Transcribed from ' + tarc2.name + '. ' : '') +
        (cov.sentence || '') + ' Open the campaign filings block on this file.';
    }
    return 'No money file on hand for this person. ' + (cov.sentence || '') +
      ' Open the campaign filings block on this file, which names the disclosure ' +
      'source the filing would have come from.';
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

  // The chips' one action, parameterised by target. Exposed as two named methods
  // below so each inline handler is a call to a named function rather than a
  // scroll expression pasted into markup — and so the two doors cannot drift into
  // two different scroll behaviours, which is how one chip would end up revealing
  // a deferred stage and the other jumping into a collapsed one.
  function jumpTo(id) {
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
  function openSection() { return jumpTo(SECTION_ID); }
  // Chip 2's door. Same page, same section, a different heading focused on
  // arrival — see TWO DOORS, TWO TARGETS above.
  function openWealthSection() { return jumpTo(WEALTH_SECTION_ID); }

  // ONE BUILDER FOR BOTH PILLS. The two chips share every visual decision they
  // have — the class, the glyph, the separator, the segment markup, the one
  // accent — because they are two readings of one lane and a reader must be able
  // to tell at a glance that they belong together. What differs is carried in
  // data, not in a second copy of the markup: the lane name, the state, the label,
  // and which door the click opens. A second hand-written button is how one pill
  // acquires a ring, a tint or a size the other does not have.
  function chipButtonHtml(o) {
    var segs = o.segs || [];
    var inner = '';
    for (var i = 0; i < segs.length; i++) {
      if (i) inner += '<span class="pdx-mchip-sep" aria-hidden="true">·</span>';
      inner += '<span class="' + (segs[i].fig ? 'pdx-mchip-fig' : 'pdx-mchip-hi') + '">' +
        esc(segs[i].text) + '</span>';
    }
    return '<button type="button" class="pdx-mchip" data-pdx-mchip="' + attr(String(o.pid || '')) + '"' +
      ' data-pdx-mchip-lane="' + attr(o.lane) + '"' +
      ' data-pdx-mchip-state="' + attr(o.state) + '"' +
      ' onclick="event.stopPropagation();if(window.PDXFinanceLane)window.PDXFinanceLane.' + o.open + '();"' +
      ' aria-label="' + attr(o.label) + '">' +
        '<span class="pdx-mchip-ico" aria-hidden="true">💰</span>' + inner +
      '</button>';
  }

  function letterheadChipHtml(pid) {
    try {
      var cr = chipRead(pid);
      return chipButtonHtml({
        pid: pid, lane: 'receipts', state: cr.state,
        segs: chipSegments(cr), label: chipLabel(cr), open: 'openSection'
      });
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

  // ── CHIP 2 — WHAT WAS DISCLOSED WHILE SERVING ───────────────────────────────
  // The second pill's whole read. The DATA lives in pdx-finance.js (the
  // disclosure table, PDXFinance.wealth(), the no-midpoint wall); the RENDERING
  // lives here, beside chip 1, and that split is deliberate on both sides:
  //
  //   Here, because the two pills must not be able to disagree about what a money
  // chip looks like or how it behaves. They share chipButtonHtml, the accent, the
  // glyph, the one-line rule, the class, the focus-after-reveal jump. A wealth
  // chip rendered in its own file grows its own version of all six.
  //   Not here, because the wall that matters most — no midpoint, no arithmetic,
  // no sum with receipts — is a wall around the DATA, and it holds better in a
  // file that has never seen a receipts figure. Nothing in pdx-finance.js can add
  // the two chips together because nothing in pdx-finance.js knows both numbers.
  //
  // TWO STATES, NOT THREE. Chip 1 has a "partial" state because a campaign filing
  // can be half-transcribed: a total with no itemization is genuinely a file with
  // less in it. A personal disclosure has no equivalent. The form either carries a
  // figure for a reader to see — a band or an exact number, as filed — or this
  // site is holding nothing, and there is no honest third reading between them.
  // Inventing a "partial disclosure" state would mean characterising the
  // completeness of somebody's financial disclosure from the absence of our own
  // transcription, which is a finding about a person made out of our own gap.
  // WHICH FORM THIS IS, AND WHO PUBLISHED IT. Both come out of pdx-finance.js:
  // the kind off the row through a two-entry label lookup, the archive off the
  // form URL's own host. Neither is typed at a call site and neither is inferred
  // from the office, so the words on the pill and the link under them cannot
  // disagree — a chip reading "House Clerk" over a link to somewhere else is
  // worse than a chip that names nobody.
  function formLabel(kind) {
    var F = W.PDXFinance;
    if (F && typeof F.kindLabel === 'function') {
      try { var k = F.kindLabel(kind); if (k) return String(k); } catch (e) {}
    }
    if (kind) return String(kind);
    return (F && F.FORM_LABEL) ? String(F.FORM_LABEL) : 'FD';
  }
  function archiveLabel(url) {
    var F = W.PDXFinance;
    if (F && typeof F.archiveFor === 'function') {
      try { var a = F.archiveFor(url); if (a) return String(a); } catch (e) {}
    }
    return '';
  }
  // WHAT THE FORM REPORTS, IN ONE SENTENCE, FOR THE LONG BLOCK ONLY. Neither
  // form carries a total, and the block says which boxes it does carry instead
  // of leaving a reader to assume a figure was withheld.
  function formSentence(kind) {
    var F = W.PDXFinance;
    if (F && typeof F.kindSentence === 'function') {
      try { var t = F.kindSentence(kind); if (t) return String(t); } catch (e) {}
    }
    return '';
  }
  function wealthCoverage() {
    var F = W.PDXFinance;
    if (F && typeof F.coverage === 'function') {
      try { return F.coverage(); } catch (e) {}
    }
    return null;
  }
  // The chip's own read, published so a caller (or a test) can ask what the
  // letterhead will say without rendering markup to find out — the same courtesy
  // chipRead() extends for chip 1.
  //   `person` is passed through rather than looked up here when the caller
  // already holds the record: tenure is read off the person file's own termStart /
  // termEnd, and the letterhead already has that object in hand.
  function wealthRead(pid, person) {
    var F = W.PDXFinance;
    var w = null;
    if (F && typeof F.wealth === 'function') {
      try { w = F.wealth(pid, person); } catch (e) { w = null; }
    }
    var cov = wealthCoverage();
    // A row that does not name a form or link one is not a row. Re-checked here
    // as well as in pdx-finance.js because this is the last gate before a pill
    // gets printed, and an object whose shape is trusted over its contents is how
    // a chip comes to announce a document that nobody can open.
    if (!w || !w.kind) {
      return { state: 'empty', pid: pid || null, sectionId: WEALTH_SECTION_ID,
               disclosure: null, kind: '', year: '', archive: '', coverage: cov };
    }
    // ONE READ, THREE SURFACES. `kind`, `year` and `archive` are resolved once
    // here — the archive off the form URL's host — so the pill, the pill's
    // accessible name and the long block cannot describe one document three
    // ways. `disclosure` is the archive's own read, untouched.
    return { state: 'file', pid: pid, sectionId: WEALTH_SECTION_ID,
             disclosure: w, kind: formLabel(w.kind), year: String(w.year || ''),
             archive: archiveLabel(w.formUrl), coverage: cov };
  }

  // Tenure in the width of a pill. Whole years, off the person file's own sworn
  // date, and BELOW ONE YEAR IT SAYS SO IN WORDS rather than printing "0 yrs in
  // office" — a zero beside a dollar figure on a money chip reads as a zeroed
  // figure, and this one is a real span that is simply shorter than its unit.
  function tenureText(years) {
    if (typeof years !== 'number' || !isFinite(years)) return '';
    if (years < 1) return 'under 1 yr in office';
    return years + ' yr' + (years === 1 ? '' : 's') + ' in office';
  }

  function wealthChipSegments(wr) {
    var segs = [];
    if (wr.state === 'file') {
      var w = wr.disclosure;
      // WHICH FORM IS ON FILE. "FD on file" is a claim about PAPERWORK — a named
      // document, in an archive, with a link under it — and it is the only claim
      // this archive can support. There is no figure in this segment because
      // there is no figure on the form: a federal FD reports a category of value
      // per asset and a Utah conflict-of-interest statement reports sources and
      // holdings, and neither carries a total. A pill that waited for one said
      // nothing about people who had in fact filed.
      segs.push({ fig: true, text: wr.kind + ' on file' });
      // WHICH YEAR, AND WHOSE ARCHIVE — in that order, immediately after the
      // form, because those three tokens ARE the pill's contract: what is on
      // file, for when, held by whom. Same provenance discipline as chip 1: the
      // year is the form's own, and the archive is read off the form URL's host,
      // so the authority named on the pill is the authority the link goes to.
      if (wr.year) segs.push({ fig: false, text: wr.year });
      if (wr.archive) segs.push({ fig: false, text: wr.archive });
      // THE SPAN THE FILING SITS IN, LAST, AND ONLY WHERE THIS DOCUMENT ALREADY
      // KNOWS IT. Tenure has one owner — window._pdxTenure — and it is not
      // loaded on every document that renders a letterhead. Where it is absent
      // the segment is absent: no module is pulled in to force a span, and no
      // years are stored beside the row to stand in for it. It trails the three
      // contract tokens rather than interrupting them.
      var ten = tenureText(w.tenureYears);
      if (ten) segs.push({ fig: false, text: ten });
    } else {
      // Built to chip 1's grammar of absence on purpose — "on hand", not "yet".
      // See the comment in chipSegments: "yet" promises a queue that does not
      // exist. "In-office wealth file" rather than plain "wealth" because the gap
      // is specifically a missing FORM, filed while serving; we are not holding
      // an estimate of what anybody owns. NO DIGIT AND NO DOLLAR SIGN IN IT: a
      // zero here would be read as a disclosure of zero.
      segs.push({ fig: true, text: 'No in-office wealth file on hand' });
    }
    return segs;
  }

  // THE ACCESSIBLE NAME SAYS WHAT THE PILL IS NOT. A money-coloured chip under a
  // 💰 glyph will be read as a figure by anybody scanning, so the longer copy —
  // the copy a screen-reader user actually receives in full — states in words
  // that this is a filed form, that it is not a net worth, not a band total and
  // not a zero, and that an empty one is our missing data rather than a report
  // that somebody did not file.
  function wealthChipLabel(wr) {
    var cov = wr.coverage || {};
    if (wr.state === 'file') {
      var w = wr.disclosure;
      var ten = tenureText(w.tenureYears);
      var arc = wr.archive ? ' published by ' + wr.archive : '';
      return (wr.kind === 'COI'
        ? 'A Utah conflict-of-interest statement is on file'
        : 'A federal annual financial disclosure is on file') +
        (wr.year ? ' for ' + wr.year : '') + arc +
        (ten ? ', filed while serving ' + ten : '') + '. ' +
        'This says a document exists and can be read — it is not a net worth, ' +
        'not a band total, and not a dollar figure of any kind. ' +
        (formSentence(wr.kind) || '') +
        ' PolitiDex does not add those boxes together into a figure. ' +
        'This is also not campaign money and is not added to the receipts ' +
        'figure beside it. Open the disclosures block on this file for the form ' +
        'itself.';
    }
    return 'No in-office wealth file on hand for this person. ' +
      (cov.sentence || '') +
      ' A blank here is missing data on our side: it is not a disclosure of zero, ' +
      'it is not a net worth of nothing, and it is not a report that this person ' +
      'failed to file. Open the disclosures block on this file, which names the ' +
      'form this would have come from.';
  }

  function wealthLetterheadChipHtml(pid, person) {
    try {
      var wr = wealthRead(pid, person);
      return chipButtonHtml({
        pid: pid, lane: 'wealth', state: wr.state,
        segs: wealthChipSegments(wr), label: wealthChipLabel(wr),
        open: 'openWealthSection'
      });
    } catch (e) { return ''; }
  }

  // NO HOST AND NO DEFERRED RE-READ, UNLIKE CHIP 1, AND THE ASYMMETRY IS THE
  // POINT. Chip 1 carries a host span and a one-shot repaint because the campaign
  // filing index is assembled inside index.html's Follow-the-Money IIFE and a
  // letterhead can legitimately render before it is attached — the repaint exists
  // to stop a chip saying "no money file" above a section drawing $8.6M. The
  // disclosure table is a plain inline object literal in pdx-finance.js, loaded
  // before this file and before any profile renders: there is no seam it could
  // arrive late through. A re-read seam that can never fire is worse than none,
  // because the next reader of this file will trust it for a reason that is not
  // true, and a timer per profile per chip is not free.
  function wealthLetterheadChipMount(pid, person) {
    try { return wealthLetterheadChipHtml(pid, person); } catch (e) { return ''; }
  }

  // ── THE DISCLOSURES BLOCK — CHIP 2'S OTHER END ─────────────────────────────
  // What the second pill is a door TO. It carries the same figure as the chip, by
  // construction: one wealthRead() per surface, no second lookup and no second
  // formatting rule, so the pill and the block cannot end up quoting the archive
  // differently. What it adds is everything a pill has no room for — the form
  // itself as a link, the coverage counts, and the sentence saying what a blank
  // means.
  //   NO THIRD SCORE. This block has no tier, no band ladder, no "wealthy"
  // characterisation, no comparison to the roster, no percentage and no arithmetic
  // against the campaign figure one block up. It prints a figure, a span, a form
  // and a coverage count, and stops.
  function wealthBlockHtml(pid, p) {
    var wr, cov;
    try { wr = wealthRead(pid, p || null); } catch (e) { return ''; }
    cov = wr.coverage || {};
    var first = (p && p.name) ? String(p.name).split(' ')[0] : 'this official';
    var body;
    if (wr.state === 'file') {
      var w = wr.disclosure;
      var ten = tenureText(w.tenureYears);
      // THE DOCUMENT ITSELF, AS A LINK A READER CAN OPEN, labelled with the same
      // year and the same archive the pill named. The gate on the table refuses a
      // row with no link, so the no-link branch is a defence rather than a state
      // a shipped row can be in — and it says so instead of rendering a dead
      // anchor that looks live.
      var stamp = (w.year ? w.year + ' ' : '') + wr.kind +
        (wr.archive ? ' \u00b7 ' + wr.archive : '');
      var link = w.formUrl
        ? '<a class="pdx-money-block-src" href="' + attr(w.formUrl) + '" target="_blank" rel="noopener noreferrer">' +
            '\ud83d\udcc4 ' + esc(stamp) + ' \u2197</a>'
        : '<span class="pdx-money-block-src is-none">' + esc(stamp) + ' \u00b7 no link on file</span>';
      body =
        // THE SAME WORDS THE PILL CARRIES. One read, quoted twice, so the door
        // and the room behind it cannot describe one document two ways.
        '<div class="pdx-money-block-fig">' + esc(wr.kind) + ' <span>on file</span></div>' +
        '<p class="pdx-money-block-s">' +
          'PolitiDex holds ' + esc(first) + "'s own in-office disclosure document" +
          (wr.year ? ' for ' + esc(wr.year) : '') +
          (wr.archive ? ', as published by ' + esc(wr.archive) : '') +
          (ten ? ', filed while serving ' + esc(ten) : '') + '. ' +
          // THE SENTENCE THE WHOLE PASS TURNS ON. A reader who has just been told
          // a disclosure exists will ask what it says, and the honest answer is
          // that neither form states a total. Saying so here is what stops the
          // next person building a figure out of the boxes.
          'A Utah conflict-of-interest statement reports sources and holdings, not a dollar ' +
          'total; a federal FD reports per-asset categories, not a net worth. PolitiDex will ' +
          'not add those boxes into a figure. ' +
          // ONE SENTENCE ABOUT WHAT THE FORM REPORTS, AND IT IS THE ONE ABOVE.
          // The per-kind sentence pdx-finance.js also publishes is for the
          // accessible name, where the general one is not read out; printing both
          // here would say the same thing twice to a reader who can see them.
          'This is a filed form, not campaign money: it is a different fact from the receipts ' +
          'above it, over a different span, and the two are never added together or divided ' +
          'into one another.' +
        '</p>' + link;
    } else {
      body =
        '<div class="pdx-money-block-fig is-none">No in-office wealth file on hand</div>' +
        '<p class="pdx-money-block-s">' +
          'PolitiDex holds no in-office disclosure document for ' + esc(first) + '. ' +
          'That is missing data on our side \u2014 it is not a disclosure of zero, it is not a ' +
          'finding about ' + esc(first) + ', it is not a report that ' + esc(first) + ' did not ' +
          'file, and nothing here reads it as one. Collecting these forms is hand work that ' +
          'has not been done yet for most of this roster; where the document exists, this ' +
          'block names it, dates it and links it. ' +
          // WHAT THE MISSING FORM WOULD HAVE SAID, AND IT IS NOT A NUMBER. This
          // is the same sentence the on-file branch prints, quoted here rather
          // than written twice in different words — and it belongs on the empty
          // branch for a reason the on-file branch does not have: a reader told
          // only "no document on hand" is left expecting a DOLLAR FIGURE to
          // arrive when the hand work gets done. None is coming. Neither form
          // states a total, so the gap this block names is a gap in WHICH FORM we
          // hold, never a gap in a figure — and saying so where the blank is is
          // what stops the next curator, or the next reader, filling it with an
          // estimate. It carries no digit and no dollar sign, which is what keeps
          // the roster-wide sweep in scripts/test-money-two-chips.mjs true.
          'A Utah conflict-of-interest statement reports sources and holdings, not a dollar ' +
          'total; a federal FD reports per-asset categories, not a net worth. PolitiDex will ' +
          'not add those boxes into a figure, and will not publish one here in place of the ' +
          'form.' +
        '</p>';
    }
    return '<span id="' + WEALTH_SECTION_ID + '" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<div class="pdx-money-block" data-pdx-money-block="wealth" data-pdx-wealth-state="' + attr(wr.state) + '">' +
        '<h4 class="pdx-money-block-h">Disclosures while serving</h4>' +
        body +
        (cov.sentence
          ? '<p class="pdx-money-block-cov"><span>Coverage</span> \u00b7 ' + esc(cov.sentence) + '</p>'
          : '') +
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
    // THEME is published so the fence can compare it, value by value, against the
    // :root custom properties in finance-lane.css. Two copies of the token exist
    // (inline styles travel into surfaces that never load the stylesheet), and two
    // copies that can drift silently are worse than one that cannot travel.
    THEME: THEME, COLORS: COLORS, ACCENT: ACCENT, THIN_AT: THIN_AT,
    compose: compose, read: read,
    coverage: coverage, coverageHtml: coverageHtml,
    compositionHtml: compositionHtml, entryHtml: entryHtml,
    // ── The two reads the person file's money section leads with ─────────────
    // countsHtml(read, ftmRecord) is the ON-FILE lead: reported sources, named
    // contributors, industry sectors and self-funding, as counts. It replaced a
    // pill reading "Grassroots · 38% small-dollar" beside a "Large war chest"
    // tag, which was the retired grade's three donor-mix levels and a size tier
    // rewritten as prose. sourceGap(pid, p) / sourceGapHtml(pid, p) are the
    // OFF-FILE lead: which archive the missing filing would have come from —
    // 'FEC', 'Utah state disclosures', or 'none opened' when PolitiDex has no
    // source open for that office. Derived from the office string alone; it
    // invents no filing, no donor and no figure.
    countsHtml: countsHtml,
    sourceGap: sourceGap, sourceGapHtml: sourceGapHtml,
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
    // ── Chip 2: what was disclosed while serving ─────────────────────────────
    // The same five surfaces for the second pill — read, markup, mount, door,
    // and the section block the door opens onto. wealthRead(pid, person) is
    // two-valued ('file' | 'empty'); see the wall over it for why there is no
    // third state. The figures come from PDXFinance.wealth() as published
    // strings: nothing here parses, midpoints, ranks or sums them, and no
    // surface in this file puts a receipts figure and a disclosure figure in
    // one expression.
    WEALTH_SECTION_ID: WEALTH_SECTION_ID,
    wealthRead: wealthRead,
    wealthLetterheadChipHtml: wealthLetterheadChipHtml,
    wealthLetterheadChipMount: wealthLetterheadChipMount,
    wealthBlockHtml: wealthBlockHtml,
    openWealthSection: openWealthSection,
    // The campaign-filing lookup, published so PDXFinance.filing(pid) can delegate
    // to it instead of keeping a second copy of the two seams and the id alias.
    // One owner for "does this person have a filing" — two owners is how the chip
    // and the helper come to answer that differently.
    filingRecord: recordFor,
    // Declared so the wall is readable from the object as well as from the header,
    // and asserted in scripts/test-finance-lane.mjs.
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking', 'alignment',
                  'door2Picks'],
    // Test/ingest seams. Overriding a getter cannot change what a filing says —
    // it can only change the denominator the disclosure sentence quotes.
    _setCounters: function (onFileFn, rosterFn) {
      if (typeof onFileFn === 'function') _onFile = onFileFn;
      if (typeof rosterFn === 'function') _roster = rosterFn;
    }
  };
})();
