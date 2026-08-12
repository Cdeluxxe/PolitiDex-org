/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Coverage gaps  ·  window.PDXGaps
   ────────────────────────────────────────────────────────────────────────────
   Phase 1 of "Coverage Gaps + Suggest-a-Lead". Its whole job is to say, out
   loud, what WE do not have on file for a record — and to hand the reader one
   clean way to help us find it.

   THE GAPS ARE DERIVED, NEVER STORED. Every row below is read off values the
   app already computes: PDXWordAction.read() (which returns `coverage`, the
   `untested` items with their machine reason, `pledgeAggregate` and
   `pledgeRemainder`) and PDXCoverage.assess() (rich/partial/thin/none). Nothing
   here classifies anything on its own, and nothing is written anywhere. The day
   a curator lands the missing stance or roll call, the gap disappears by itself
   — there is no gap table to reconcile and no stale row that can claim a hole
   that has already been filled.

   TWO KINDS OF GAP. Most are ASKABLE: a hole in our research that a sourced tip
   could help fill. Three are not — `circular_hold`, `spoken_for` and
   `below_floor` are the circularity rule, the one-scored-item-per-issue rule and
   the publication floor doing their job. Those render as an explainer pointing
   at "How this is counted", never as a request for help: inviting leads there
   would teach a reader that our own method is a defect to be crowdsourced away,
   and would fill the queue with submissions no moderator could ever action.

   VOCABULARY. A gap describes OUR documentation status, never the person. "We
   have no sourced position on file yet" — never "their record is incomplete".
   Nothing in this module produces, weights or influences a score: gap severity
   orders a research queue, and is never shown as a number about a politician.

   Discussion is free: each row's engagement bar is the EXISTING item-thread
   system (window._pdxSpotlightEngageHTML → /api/threads), addressed by a stable
   `gap:<pid>:<slug>` target id. No new comment system, no new tables.

   API:
     PDXGaps.forPolitician(pid, p [, read])  → Gap[]   (sorted, uncapped, pure)
     PDXGaps.count(pid, p [, read])          → number of ASKABLE gaps
     PDXGaps.rowHtml(gap, opts)              → one gap row
     PDXGaps.panelHtml(pid, p [, read])      → collapsed line + expandable list
                                               ('' when there is nothing to ask)
     PDXGaps.slug(s) / PDXGaps.targetId(pid, slug) / PDXGaps.TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXGaps) return;

  // ── The taxonomy ───────────────────────────────────────────────────────────
  // `sev` orders the list (most-missing first) and nothing else. `askable` is
  // the load-bearing flag: false means "explain, do not solicit".
  var TYPES = {
    no_record:          { sev: 100, askable: true,  label: 'Not yet documented' },
    thin_record:        { sev: 80,  askable: true,  label: 'Still documenting' },
    thin_formal_action: { sev: 70,  askable: true,  label: 'Formal-action coverage still thin' },
    no_action_yet:      { sev: 60,  askable: true,  label: 'Said it — no action on file yet' },
    pending_pledge:     { sev: 50,  askable: true,  label: 'Pledge still open' },
    unitemized_pledges: { sev: 40,  askable: true,  label: 'Resolved pledges not itemized' },
    not_issue_linked:   { sev: 30,  askable: true,  label: 'Not tied to an issue yet' },
    circular_hold:      { sev: 20,  askable: false, label: 'Held: written from the record itself' },
    spoken_for:         { sev: 15,  askable: false, label: 'Second position on an already-scored issue' },
    below_floor:        { sev: 10,  askable: false, label: 'Not enough tested record to publish a number' }
  };

  // How many askable rows a profile shows before the rest are summarised. The
  // panel lives inside an already-long profile section on a phone. This is the
  // ONLY cap on askable gaps, and it is a display cap: derivation keeps every row
  // it found, the header states the real total, and the list says what it is
  // holding back. There used to be a second, silent cap inside derivation, which
  // meant a record with 14 gaps could honestly-but-wrongly announce 8.
  var MAX_ASK_ROWS = 6;
  var MAX_LEAD_CARDS = 3;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plural(n, one, many) { return (n === 1) ? one : (many || (one + 's')); }

  // ── The shared slugifier ───────────────────────────────────────────────────
  // A gap key has to satisfy the target-id contract the item-thread API already
  // enforces (threads.mts: /^[a-z]+:[^\s,:]{1,90}:[a-z0-9][a-z0-9-]{0,90}$/), so
  // the third segment is lowercase alnum + dashes only. Issue keys in this app
  // use underscores (climate_action), which that regex rejects — hence the
  // _ → - conversion. We defer to like-dislike.js's _pdxVoteSlug when it is
  // loaded so there is ONE slugifier in the product and keys can never drift
  // between the side that writes them and the side that reads them.
  function slug(s) {
    try {
      if (typeof window._pdxVoteSlug === 'function') return window._pdxVoteSlug(s);
    } catch (e) {}
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/['’"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'item';
  }
  function targetId(pid, sl) {
    try {
      if (typeof window._pdxVoteTargetId === 'function') return window._pdxVoteTargetId('gap', pid, sl);
    } catch (e) {}
    return 'gap:' + String(pid || 'p') + ':' + slug(sl);
  }

  // ── Guarded reads of the two sources ───────────────────────────────────────
  // Anything missing lowers the number of gaps we can name. Nothing throws.
  function assess(pid) {
    try {
      if (window.PDXCoverage && typeof window.PDXCoverage.assess === 'function') {
        return window.PDXCoverage.assess(pid);
      }
    } catch (e) {}
    return null;
  }
  function readOf(pid, p) {
    try {
      if (window.PDXWordAction && typeof window.PDXWordAction.read === 'function') {
        return window.PDXWordAction.read(pid, p);
      }
    } catch (e) {}
    return null;
  }
  function profileOf(pid, p) {
    if (p) return p;
    try { if (window.PROFILES && window.PROFILES[pid]) return window.PROFILES[pid]; } catch (e) {}
    try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) return CMP_DATA[pid]; } catch (e) {}
    return null;
  }
  function nameOf(pid, p) {
    var d = profileOf(pid, p);
    return (d && d.name) ? String(d.name) : 'this official';
  }
  function lastName(pid, p) {
    var n = nameOf(pid, p);
    var parts = n.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : n;
  }
  function issueLabel(key) {
    if (!key) return '';
    try {
      var M = window.ISSUE_MAP;
      if (M && M[key] && (M[key].label || M[key].name)) return M[key].label || M[key].name;
    } catch (e) {}
    return String(key).replace(/_/g, ' ');
  }

  // ── Derivation ─────────────────────────────────────────────────────────────
  // One gap object per hole we can name, sorted most-missing first.
  function make(pid, p, type, opts) {
    opts = opts || {};
    var def = TYPES[type];
    if (!def) return null;
    var sl = slug(type + ' ' + (opts.slugExtra || ''));
    return {
      key: targetId(pid, sl),
      slug: sl,
      type: type,
      pid: String(pid),
      polName: nameOf(pid, p),
      issueKey: opts.issueKey || null,
      issueLabel: opts.issueKey ? issueLabel(opts.issueKey) : '',
      label: opts.label || def.label,
      detail: opts.detail || '',
      ask: opts.ask || '',
      count: (typeof opts.count === 'number') ? opts.count : null,
      severity: def.sev,
      askable: def.askable
    };
  }

  function forPolitician(pid, p, pre) {
    var out = [];
    if (!pid) return out;
    p = profileOf(pid, p);
    var who = lastName(pid, p);
    var cov = assess(pid);
    var r = pre || readOf(pid, p);

    function push(type, opts) { var g = make(pid, p, type, opts); if (g) out.push(g); }

    // 1 · Nothing on file that this read can test. Said once, and nothing else — a
    // profile with no documented word has no positions to be missing actions for.
    // Note this fires only when we ACTUALLY assessed the record: if the coverage
    // module is absent we do not know, and "not yet documented" is a claim, not a
    // default.
    //
    // The two branches exist because our two counters do not count the same
    // things. PDXCoverage.assess() counts everything we hold on a record,
    // including spotlight items; wordLedger only reads sourced positions and
    // pledges. So a spotlight-only profile lands here with word === 0 while
    // assess() reports "thin" rather than "none". That combination used to return
    // an empty list, which hid the panel on exactly the profiles with the least
    // documentation — the thinnest records looked as settled as the fullest ones.
    var noWord = !r || !r.coverage || !r.coverage.word;
    if (noWord) {
      if (cov && cov.key === 'none') {
        push('no_record', {
          detail: 'We have no sourced position, pledge or on-record item for ' + nameOf(pid, p) + ' yet. ' +
                  'Rather than leave the space blank, we mark it: this record is on our research queue.',
          ask: 'A speech, interview, candidate questionnaire, voter guide or official page where they state a position in their own words.'
        });
      } else if (cov) {
        var held = cov.records || 0;
        push('no_record', {
          count: held,
          detail: (held
                    ? 'We hold ' + held + ' ' + plural(held, 'item') + ' on this record, but nothing yet that states a position in ' +
                      nameOf(pid, p) + '’s own words — so there is no documented word here for a formal action to be tested against. '
                    : 'We hold nothing yet that states a position in ' + nameOf(pid, p) + '’s own words. ') +
                  'That is our documentation, not their record.',
          ask: 'A speech, interview, candidate questionnaire, voter guide or official page where they state a position in their own words — with a link.'
        });
      }
      return out;
    }

    // 2 · Thin overall coverage — a real record, just not much of it yet.
    if (cov && cov.key === 'thin') {
      push('thin_record', {
        count: cov.records,
        detail: 'Only ' + cov.records + ' sourced ' + plural(cov.records, 'record') + ' on file for ' + who +
                ' so far. We show what is verified and keep adding the rest rather than padding the profile.',
        ask: 'Any sourced statement, pledge or official act of theirs we appear to be missing.'
      });
    }
    if (!r || !r.coverage) return sortGaps(out);

    var c = r.coverage;
    var byReason = {};
    var issueRows = { no_action_yet: [], pending_pledge: [] };
    (r.untested || []).forEach(function (it) {
      var reason = (it.test && it.test.reason) || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
      if (reason === 'no_action_yet') issueRows.no_action_yet.push(it);
      else if (reason === 'unresolved') issueRows.pending_pledge.push(it);
    });

    // 3 · The formal record itself is still loading or still thin for this person.
    if (c.warming || byReason.engine_absent) {
      push('thin_formal_action', {
        detail: 'Our formal-action coverage for ' + who + ' is still being built, so some documented positions have ' +
                'nothing on our record to test them against yet. This is our ingest catching up, not a finding about them.',
        ask: 'A roll-call vote, sponsorship, signed order, filing or other official act of theirs that we do not appear to hold yet.'
      });
    }

    // 4 · Said it, and we hold no formal action to test it against. One row per
    // issue, because that is the unit a useful lead can actually answer. Every
    // one is derived — the display cap lives in panelHtml, which discloses what
    // it held back. Truncating here would make count() report a number smaller
    // than the real hole, which is the one thing this panel must never do.
    issueRows.no_action_yet
      .sort(function (a, b) { return (b.weight || 0) - (a.weight || 0); })
      .forEach(function (it) {
        var lbl = it.issueKey ? issueLabel(it.issueKey) : (it.label || 'this position');
        push('no_action_yet', {
          issueKey: it.issueKey || null,
          slugExtra: it.issueKey || it.label || '',
          label: 'No action on file — ' + lbl,
          detail: 'We hold a documented position from ' + who + ' on ' + lbl +
                  ', and no formal action on our record to test it against yet. That is a gap in our documentation, not a mark against them.',
          ask: 'A vote, sponsorship, committee action, signed order or official filing of theirs on ' + lbl + ' — with a link to the official record.'
        });
      });

    // 5 · Tracked pledges with no sourced outcome yet. Never counted either way.
    issueRows.pending_pledge
      .forEach(function (it) {
        var lbl = it.label || 'a tracked pledge';
        push('pending_pledge', {
          issueKey: it.issueKey || null,
          slugExtra: it.label || it.issueKey || '',
          label: 'Pledge still open — ' + lbl,
          detail: 'We track this pledge and hold no sourced outcome for it yet, so it counts neither for nor against ' + who +
                  '. It stays open until an outcome can be sourced.',
          ask: 'Anything that shows what happened to this pledge — a vote, a signed bill, an official announcement, a reversal on the record.'
        });
      });

    // 6 · Resolved pledges carried in the tracker that no itemized pledge accounts
    //     for. word-action.js already surfaces the count; this names it as a gap.
    var unitemized = 0;
    if (r.pledgeAggregate) unitemized = r.pledgeAggregate.resolved || 0;
    else if (r.pledgeRemainder) unitemized = r.pledgeRemainder;
    if (unitemized > 0) {
      push('unitemized_pledges', {
        count: unitemized,
        detail: unitemized + ' resolved ' + plural(unitemized, 'pledge') + ' ' + plural(unitemized, 'is', 'are') +
                ' carried in our promise tracker without being written up individually, so this read cannot see inside ' +
                plural(unitemized, 'it', 'them') + '. Itemizing them is our work, not a mark against ' + who + '.',
        ask: 'Help us itemize one: name the specific promise, what happened to it, and the source for the outcome.'
      });
    }

    // 7 · Word we hold that is not tied to one of our tracked issues, so no action
    //     can be matched to it.
    if (c.notIssueLinked > 0) {
      var n = c.notIssueLinked;
      push('not_issue_linked', {
        count: n,
        detail: n + ' documented ' + plural(n, 'item') + ' on file for ' + who + ' ' + plural(n, 'is', 'are') +
                ' not tied to one of our tracked issues yet, so no formal action can be matched to ' + plural(n, 'it', 'them') + '.',
        ask: 'Point us at which tracked issue one of these belongs to — or at a clearer sourced statement of the same position.'
      });
    }

    // 8 · EXPLAIN-ONLY: the circularity rule.
    if (c.recordDerived > 0) {
      var d = c.recordDerived;
      push('circular_hold', {
        count: d,
        detail: d + ' ' + plural(d, 'position') + ' on file ' + plural(d, 'was', 'were') + ' written up from the formal record itself. ' +
                'A position drawn from a vote cannot test that same vote, so ' + plural(d, 'it is', 'they are') + ' held out of the number by design.'
      });
    }

    // 9 · EXPLAIN-ONLY: one scored item per issue.
    if (byReason.spoken_for > 0) {
      var s = byReason.spoken_for;
      push('spoken_for', {
        count: s,
        detail: s + ' further ' + plural(s, 'position') + ' ' + plural(s, 'sits', 'sit') + ' on an issue that already carries a scored item. ' +
                'Each issue gets exactly one scored item, so ' + plural(s, 'it is', 'they are') + ' held rather than counted twice.'
      });
    }

    // 10 · EXPLAIN-ONLY: the publication floor.
    if (c.word && r.publishable === false && (r.tested || []).length > 0) {
      push('below_floor', {
        detail: 'A percentage appears only once at least ' + r.floors.items + ' items are tested and their combined weight reaches ' +
                r.floors.weight + '. This record is below that floor, so no number is published — the read says it is still looking.'
      });
    }

    return sortGaps(out);
  }

  function sortGaps(list) {
    return list.sort(function (a, b) {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function count(pid, p, pre) {
    return forPolitician(pid, p, pre).filter(function (g) { return g.askable; }).length;
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  // A registry so click handlers can recover the full gap object from its key
  // without serialising JSON into an attribute.
  var _reg = Object.create(null);
  var _open = Object.create(null);     // pid → reader had this panel expanded
  var _leadCache = Object.create(null); // pid → { byGap: {key: [lead]}, total }
  var _leadFetching = Object.create(null);

  function engageHtml(gap) {
    try {
      if (typeof window._pdxSpotlightEngageHTML === 'function') {
        return window._pdxSpotlightEngageHTML(gap.key, 'this coverage gap');
      }
      if (typeof window._pdxVoteControlHTML === 'function') {
        return window._pdxVoteControlHTML(gap.key, 'this coverage gap');
      }
    } catch (e) {}
    return '';
  }

  function rowHtml(gap, opts) {
    if (!gap || !gap.type) return '';
    opts = opts || {};
    _reg[gap.key] = gap;
    var k = esc(gap.key);
    // Issue-linked gaps wear their issue's colour, so "the healthcare hole" is
    // recognisable next to the healthcare row in Word vs Action and the
    // healthcare card in the Stance Library. A gap with no issue behind it — or
    // one keyed to an issue outside the core set — resolves to neutral slate.
    var ic = (gap.issueKey && window.PDXIssueColors && typeof window.PDXIssueColors.styleFor === 'function')
      ? ' style="' + window.PDXIssueColors.styleFor(gap.issueKey) + '"' : '';
    if (!gap.askable) {
      return '' +
        '<li class="pdxg-row pdxg-row-hold" data-pdx-gap="' + k + '">' +
          '<div class="pdxg-row-h">' +
            '<span class="pdxg-row-label">' + esc(gap.label) + '</span>' +
            '<span class="pdxg-row-tag pdxg-row-tag-hold">Held by the method</span>' +
          '</div>' +
          '<p class="pdxg-row-detail">' + esc(gap.detail) + '</p>' +
          '<button type="button" class="pdxg-method-link" onclick="window._pdxGapsShowMethod&&window._pdxGapsShowMethod(this)">' +
            'How this is counted →</button>' +
        '</li>';
    }
    return '' +
      '<li class="pdxg-row" data-pdx-gap="' + k + '"' + ic + '>' +
        '<div class="pdxg-row-h">' +
          '<span class="pdxg-row-label">' + esc(gap.label) + '</span>' +
          '<span class="pdxg-row-tag">Open gap</span>' +
        '</div>' +
        '<p class="pdxg-row-detail">' + esc(gap.detail) + '</p>' +
        (gap.ask ? '<p class="pdxg-row-ask"><span class="pdxg-row-ask-k">What would fill it</span> ' + esc(gap.ask) + '</p>' : '') +
        '<div class="pdxg-row-bar">' +
          engageHtml(gap) +
          '<button type="button" class="pdxg-ask-btn" data-pdx-gap-ask="' + k + '" ' +
            'onclick="window._pdxGapsAsk&&window._pdxGapsAsk(this)" ' +
            'title="Suggest a research lead for this gap">＋ Suggest a lead</button>' +
        '</div>' +
        '<div class="pdxg-leads" data-pdx-gap-leads="' + k + '" hidden></div>' +
      '</li>';
  }

  function panelHtml(pid, p, pre) {
    try {
      if (!pid) return '';
      var gaps = forPolitician(pid, p, pre);
      var ask = gaps.filter(function (g) { return g.askable; });
      var holds = gaps.filter(function (g) { return !g.askable; });
      // Nothing to ask for → no extra UI at all. A well-documented profile must
      // not grow furniture, or the signal stops meaning anything.
      if (!ask.length) return '';

      var shown = ask.slice(0, MAX_ASK_ROWS);
      var hidden = ask.length - shown.length;
      var isOpen = !!_open[pid];
      var rows = shown.map(function (g) { return rowHtml(g); }).join('');
      var holdRows = holds.map(function (g) { return rowHtml(g); }).join('');

      // The Word vs Action panel repaints itself in place once the voting record
      // warms. We remember the reader's expanded state per profile, so re-render
      // it open — and re-fill the lead slots the repaint just blanked, or the
      // list would silently lose its leads under the reader.
      if (isOpen) {
        try {
          setTimeout(function () {
            var wrap = document.querySelector('.pdxg[data-pdx-gaps-pid="' + String(pid).replace(/"/g, '') + '"]');
            if (wrap) hydrateLeads(pid, wrap);
          }, 0);
        } catch (e) {}
      }

      return '' +
        '<div class="pdxg" data-pdx-gaps-pid="' + esc(String(pid)) + '">' +
          '<button type="button" class="pdxg-toggle" aria-expanded="' + (isOpen ? 'true' : 'false') + '" ' +
            'onclick="window._pdxGapsToggle&&window._pdxGapsToggle(this)">' +
            '<span class="pdxg-toggle-ico" aria-hidden="true">◷</span>' +
            '<span class="pdxg-toggle-t"><b>' + ask.length + ' open ' + plural(ask.length, 'gap') + '</b> ' +
              'in what we have documented so far</span>' +
            '<span class="pdxg-toggle-cta">' + (isOpen ? 'Hide' : 'See what’s missing') +
              ' <span aria-hidden="true">→</span></span>' +
          '</button>' +
          '<div class="pdxg-body"' + (isOpen ? '' : ' hidden') + '>' +
            '<p class="pdxg-note">Here is what we do not have on file yet for this record, and why. ' +
              'Nothing below counts for or against anyone — it is a list of our own homework.</p>' +
            (hidden
              ? '<p class="pdxg-showing">Showing ' + shown.length + ' of ' + ask.length + ' — the rest are ' +
                'the same kinds of gap on this record.</p>'
              : '') +
            '<ul class="pdxg-list">' + rows + '</ul>' +
            (hidden
              ? '<p class="pdxg-more">+ ' + hidden + ' further ' + plural(hidden, 'gap') +
                ' not shown here. Every one of them is counted in the ' + ask.length + ' above.</p>'
              : '') +
            (holdRows
              ? '<div class="pdxg-holds">' +
                  '<div class="pdxg-holds-h">Not gaps — word our own rules hold out of the number</div>' +
                  '<ul class="pdxg-list">' + holdRows + '</ul>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── Behaviour ──────────────────────────────────────────────────────────────
  window._pdxGapsToggle = function (btn) {
    try {
      var wrap = btn.closest('.pdxg');
      if (!wrap) return;
      var body = wrap.querySelector('.pdxg-body');
      if (!body) return;
      var open = body.hasAttribute('hidden');
      if (open) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var cta = btn.querySelector('.pdxg-toggle-cta');
      if (cta) cta.innerHTML = (open ? 'Hide' : 'See what’s missing') + ' <span aria-hidden="true">→</span>';
      var pid = wrap.getAttribute('data-pdx-gaps-pid');
      if (pid) _open[pid] = open;
      if (open) {
        // The engagement rows are already in the DOM (the item-thread observer
        // picks them up on render); this only nudges a hydration if it is late.
        try { if (window.PDXThreads && window.PDXThreads.hydrate) window.PDXThreads.hydrate(); } catch (e) {}
        if (pid) hydrateLeads(pid, wrap);
      }
    } catch (e) {}
  };

  // Explain-only rows point at the panel's own "How this is counted" block rather
  // than restating the method in a second place that could drift from the first.
  window._pdxGapsShowMethod = function (btn) {
    try {
      var host = btn.closest('.pdxwa') || document;
      var det = host.querySelector('details.pdxwa-method');
      if (!det) return;
      det.open = true;
      if (det.scrollIntoView) det.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  };

  window._pdxGapsAsk = function (btn) {
    try {
      var key = btn.getAttribute('data-pdx-gap-ask');
      var gap = _reg[key];
      if (!gap) return;
      if (window.PDXCommunity && typeof window.PDXCommunity.openForGap === 'function') {
        window.PDXCommunity.openForGap(gap);
        return;
      }
      // Fallback: the existing issue-scoped on-ramp, so the button still works if
      // the Exchange controller has not been extended/loaded.
      if (typeof window._pdxSuggestReceipt === 'function') {
        window._pdxSuggestReceipt(gap.issueKey || '', gap.issueLabel || '', gap.polName || '');
        return;
      }
      try { location.hash = '#community-exchange'; } catch (e) {}
    } catch (e) {}
  };

  // ── Leads on the gap row ───────────────────────────────────────────────────
  // Read-only, public endpoint (no token needed) and one request per profile,
  // fired only once the reader opens the list. Leads are rendered in a
  // deliberately quiet treatment: never a strength badge, never a verdict colour,
  // never a percentage — a lead is a research question, not a receipt.
  // Where a lead stands, as the reader sees it. Two vocabularies: what the
  // submitter attached (source states) and what a curator did about it (review
  // states, set only from the moderation queue). Neither is a verdict, a strength
  // grade or a score, and the titles say so — "answered" in particular must never
  // read as "this is now part of the record", because the record is the other side
  // of this panel and it got there a different way.
  var LEAD_STATES = {
    has_source:   { cls: 'pdxg-lead-sourced',  ico: '🔗', label: 'Has source',
                    tip: 'The submitter attached a source for us to check. Not a verification.' },
    needs_source: { cls: '',                   ico: '◌', label: 'Needs source',
                    tip: 'No source yet — this stays a research question until one is found.' },
    checking:     { cls: 'pdxg-lead-checking', ico: '◍', label: 'We’re checking this',
                    tip: 'A curator has picked this lead up.' },
    answered:     { cls: 'pdxg-lead-answered', ico: '✓', label: 'Answered',
                    tip: 'A curator followed this lead and got an answer. A research note — nothing here is scored, and anything that belongs in the record enters it through the Evidence Locker.' },
    dead_end:     { cls: 'pdxg-lead-dead',     ico: '⌀', label: 'Dead end',
                    tip: 'A curator followed this lead and found nothing to document. Kept so the same ground is not covered twice.' }
  };
  function leadStatePill(state) {
    var d = LEAD_STATES[state] || LEAD_STATES.needs_source;
    return '<span class="pdxg-lead-state ' + d.cls + '" title="' + esc(d.tip) + '">' +
      d.ico + ' ' + esc(d.label) + '</span>';
  }
  var LEAD_RANK = { checking: 0, has_source: 1, needs_source: 2, answered: 3, dead_end: 4 };
  function leadRank(state) {
    var r = LEAD_RANK[state];
    return typeof r === 'number' ? r : LEAD_RANK.needs_source;
  }
  function leadCard(lead, gap) {
    var st = LEAD_STATES[lead.leadState] ? lead.leadState : 'needs_source';
    return '' +
      '<div class="pdxg-lead pdxg-leadst-' + esc(st.replace(/_/g, '-')) + '">' +
        '<div class="pdxg-lead-top">' +
          '<span class="pdxg-lead-pill">💡 Lead</span>' +
          '<span class="pdxg-lead-pill pdxg-lead-community">Community Submitted</span>' +
          leadStatePill(lead.leadState) +
        '</div>' +
        '<div class="pdxg-lead-head">' + esc(lead.headline) + '</div>' +
        '<div class="pdxg-lead-meta">by ' + esc(lead.authorName || 'Community Member') +
          ' · 💬 ' + (lead.commentCount || 0) + '</div>' +
        '<button type="button" class="pdxg-lead-open" data-pdx-gap-ask="' + esc(gap.key) + '" ' +
          'onclick="window._pdxGapsOpenLead&&window._pdxGapsOpenLead(this,' + (+lead.id || 0) + ')">' +
          'Open in the Community Exchange →</button>' +
      '</div>';
  }

  window._pdxGapsOpenLead = function (btn, leadId) {
    try {
      var gap = _reg[btn.getAttribute('data-pdx-gap-ask')];
      if (gap && window.PDXCommunity && typeof window.PDXCommunity.openForGap === 'function') {
        window.PDXCommunity.openForGap(gap, { compose: false, openPostId: leadId || null });
        return;
      }
      try { location.hash = '#community-exchange'; } catch (e) {}
    } catch (e) {}
  };

  function renderLeads(wrap, byGap) {
    try {
      var slots = wrap.querySelectorAll('[data-pdx-gap-leads]');
      for (var i = 0; i < slots.length; i++) {
        (function (slot) {
          var key = slot.getAttribute('data-pdx-gap-leads');
          var gap = _reg[key];
          var list = (byGap && byGap[key]) || [];
          if (!gap || !list.length) { slot.setAttribute('hidden', ''); slot.innerHTML = ''; return; }
          // Open leads first, settled ones last, then newest inside each band. A
          // curator who has already answered or closed a lead has removed it from
          // the work, so it should stop competing for the reader's attention —
          // this is the lead list ordering only, not gap severity ordering.
          var sorted = list.slice().sort(function (a, b) {
            var as = leadRank(a.leadState);
            var bs = leadRank(b.leadState);
            if (as !== bs) return as - bs;
            return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
          });
          var more = sorted.length - MAX_LEAD_CARDS;
          slot.innerHTML =
            '<div class="pdxg-leads-h">' + sorted.length + ' suggested ' + plural(sorted.length, 'lead') +
              ' on this gap — community submitted, not part of the record</div>' +
            sorted.slice(0, MAX_LEAD_CARDS).map(function (l) { return leadCard(l, gap); }).join('') +
            (more > 0 ? '<div class="pdxg-leads-more">+ ' + more + ' more in the Community Exchange</div>' : '');
          slot.removeAttribute('hidden');
        })(slots[i]);
      }
    } catch (e) {}
  }

  function hydrateLeads(pid, wrap) {
    if (!pid || !wrap) return;
    if (_leadCache[pid]) { renderLeads(wrap, _leadCache[pid]); return; }
    if (_leadFetching[pid]) return;
    _leadFetching[pid] = 1;
    var url = '/api/community/posts?kind=lead&pol=' + encodeURIComponent(pid);
    try {
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          delete _leadFetching[pid];
          var byGap = Object.create(null);
          ((d && d.posts) || []).forEach(function (post) {
            if (!post || !post.gapKey) return;
            (byGap[post.gapKey] || (byGap[post.gapKey] = [])).push(post);
          });
          _leadCache[pid] = byGap;
          renderLeads(wrap, byGap);
        })
        .catch(function () { delete _leadFetching[pid]; });
    } catch (e) { delete _leadFetching[pid]; }
  }

  // A newly submitted lead should appear without a reload, and a curator's
  // decision should land on the profile the same way — both events bust the
  // per-politician cache and re-fetch, so the card shows the state the server
  // actually holds rather than one this page guessed.
  function refreshLeadsFor(ev) {
    try {
      var pid = ev && ev.detail && ev.detail.pid;
      if (!pid) return;
      delete _leadCache[pid];
      var wrap = document.querySelector('.pdxg[data-pdx-gaps-pid="' + String(pid).replace(/"/g, '') + '"]');
      if (wrap) hydrateLeads(pid, wrap);
    } catch (e) {}
  }
  window.addEventListener('pdx-gap-lead-added', refreshLeadsFor);
  window.addEventListener('pdx-gap-lead-updated', refreshLeadsFor);

  window.PDXGaps = {
    TYPES: TYPES,
    slug: slug,
    targetId: targetId,
    forPolitician: forPolitician,
    count: count,
    rowHtml: rowHtml,
    panelHtml: panelHtml,
    // Exposed for the Exchange controller (it needs the gap a composer was
    // opened from) and for tests.
    get: function (key) { return _reg[key] || null; }
  };
})();
