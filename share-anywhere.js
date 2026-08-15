// ─────────────────────────────────────────────────────────────────────────────
// SHARE ANYWHERE  ·  one share control that works on every entry point
// ─────────────────────────────────────────────────────────────────────────────
// window.PDXShareAnywhere
//
// The app already had two good share pipelines and no way to reach either one
// from the places a reader actually opens.
//
//   · PDXReceiptCards  → the Official Record card (a member's own floor vote
//                        against their own stated position), guard-gated.
//   · PDXReceipts      → the Say-vs-Do receipt (said this, did that), curated.
//
// Both render sourced, dated, verdict-stamped, branded images. Neither was
// offered from the compact profile sheets, the browse cards, the profile modal
// header or the search results — the four surfaces a phone user lives in. The
// only share those surfaces had was a profile LINK, and the only surfaces that
// offered a card were the profile's Official Record rows and the gap sheet's
// 🏛️ column.
//
// This module is the missing middle. It answers one question — "what is the
// strongest shareable artifact for this person?" — in one place, and it always
// has an answer:
//
//   TIER 'record'   an Official Record card cleared by every trust guard
//   TIER 'receipt'  a curated Say-vs-Do receipt
//   TIER 'link'     neither exists → share the profile link, and SAY SO
//
// Two properties are load-bearing.
//
// 1. IT NEVER INVENTS AN ARTIFACT. The tiers are resolved by asking the two
//    owning modules through their public, already-guarded reads
//    (publicCardsFor / forPolitician). This module renders no image, writes no
//    caption and relaxes no guard, so "sourced, dated, verdict-stamped,
//    branded" stays a property of the pipelines rather than a promise made
//    here. When both say no, tier 'link' shares a link and the control says
//    that is what it is doing. An honest link beats a Share button that toasts
//    "No receipt to share yet" — which is what the old wiring did.
//
// 2. IT NEVER MOVES THE PAGE. PDXReceiptCards.buttonHtml() is deliberately
//    fail-CLOSED: it renders hidden and is either revealed or deleted once the
//    record arrives. That is right for a control that promises a specific vote,
//    but it means a button appearing (or vanishing) after hydration — a layout
//    shift, on exactly the mobile surfaces the stability work just settled. So
//    this control is fail-OPEN and fixed-size: it renders visible immediately
//    with a neutral label, and hydration only ever changes its ICON GLYPH (in a
//    fixed-width slot), its colour and its accessible name. The visible label
//    text never changes, nothing is inserted, nothing is removed, so no reflow
//    is possible. Where a host wants prose about what will be sent, the hint
//    line has a reserved height and the text swaps inside it.
//
// Depends on nothing being loaded: every read is behind a typeof check and the
// worst case is tier 'link'.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  if (window.PDXShareAnywhere) return;

  var _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return _ESC[c]; }); }

  function RC() { return window.PDXReceiptCards || null; }
  function SVD() { return window.PDXReceipts || null; }
  function PC() { return window.PDXProfileCard || null; }

  // The roster read every other surface uses, so the accessible name on this
  // button and the name on the card can never disagree.
  function nameOf(pid) {
    var p = null;
    try { p = (window.PROFILES && window.PROFILES[pid]) || (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) {}
    var n = p && (p.name || p.fullName || p.displayName);
    if (n) return String(n);
    return String(pid || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESOLUTION
  // ──────────────────────────────────────────────────────────────────────────
  // Both reads are synchronous and both are the OWNING module's public,
  // already-filtered accessor. publicCardsFor() is the guarded list — the wave-1
  // allowlist and all fourteen trust guards have already run inside it — so a
  // card this module can see is a card that was cleared to leave the app.
  // ══════════════════════════════════════════════════════════════════════════
  function recordCard(pid, issueKey) {
    var rc = RC();
    if (!rc || typeof rc.publicCardsFor !== 'function') return null;
    var list = null;
    // Prefer the card for the issue the host is showing; fall back to the
    // member's strongest public card, so a row about one issue never silently
    // shares a different one unless that is all there is.
    if (issueKey) {
      try { list = rc.publicCardsFor(pid, { issueKey: issueKey }); } catch (e) { list = null; }
      if (list && list.length) return list[0];
    }
    try { list = rc.publicCardsFor(pid, {}); } catch (e) { list = null; }
    return (list && list.length) ? list[0] : null;
  }

  function receiptFor(pid, issueKey) {
    var s = SVD();
    if (!s) return null;
    if (issueKey && typeof s.find === 'function') {
      try { var r = s.find(pid, issueKey); if (r) return r; } catch (e) {}
    }
    if (typeof s.forPolitician !== 'function') return null;
    try { return s.forPolitician(pid) || null; } catch (e) { return null; }
  }

  // The whole-person read, and the tier this control now prefers — but ONLY where
  // the host is not already about one thing. A share button sitting in a row about
  // immigration must still send the immigration card: swapping it for a summary
  // would answer a question the reader did not ask, and quietly lose the vote they
  // were looking at. So an issueKey suppresses this tier outright.
  function summaryFor(pid, issueKey) {
    if (issueKey) return null;
    var pc = PC();
    if (!pc || typeof pc.brief !== 'function' || typeof pc.share !== 'function') return null;
    // brief(), not read(): the verdict and the counts, without the cited-example
    // pass. Every row in a filtered list asks this question on every keystroke, and
    // the module memoises the answer until a record settles.
    try { return pc.brief(pid) || null; } catch (e) { return null; }
  }

  // What each tier promises, in the words the reader sees. These are kept short on
  // purpose: they swap inside a box whose height is reserved in whole lines (see
  // .pdxsa-hint), and the reservation is only honest if the longest of them still
  // fits it at the narrowest phone width.
  var TIERS = {
    summary: {
      ico: '⚖️', cls: 'pdxsa-t-summary',
      hint: 'Record card — the Word vs Action read, its coverage and the receipts under it.'
    },
    record: {
      ico: '🏛️', cls: 'pdxsa-t-record',
      hint: 'Official Record card — bill, vote, date, source and how it was judged.'
    },
    receipt: {
      ico: '🧾', cls: 'pdxsa-t-receipt',
      hint: 'Say-vs-Do receipt — what they said, what they did, with source and date.'
    },
    link: {
      ico: '🔗', cls: 'pdxsa-t-link',
      hint: 'No verdict-stamped card on file yet — this shares the profile link.',
      // The same tier from inside an issue dossier. The link is more specific
      // there (it opens the Official Record for that one issue), so the promise
      // has to be too — and both strings are kept short enough that swapping
      // between them cannot overflow the height-reserved hint box.
      hintIssue: 'No verdict-stamped card on file yet — this shares the Official Record link.'
    }
  };

  // Guards are not free and search re-renders on every keystroke, so the tier is
  // memoised per (pid, issue). Cleared for a pid the moment its record settles,
  // which is the only event that can change the answer.
  var _tier = {};
  var _settled = {};
  var _warming = {};

  function key(pid, issueKey) { return String(pid || '') + '|' + String(issueKey || ''); }

  // The resolved state, from whatever is loaded RIGHT NOW. Never throws, never
  // waits, and never returns null: a pid with nothing on file is tier 'link'.
  function state(pid, opts) {
    pid = String(pid || '');
    if (!pid) return null;
    var iss = (opts && opts.issueKey) || '';
    var k = key(pid, iss);
    if (_tier[k]) return _tier[k];

    var st = { pid: pid, issueKey: iss, tier: 'link', card: null, receipt: null, summary: null,
               settled: !!_settled[pid], name: nameOf(pid), what: '' };
    // Every artifact that exists is gathered, not just the winning one, so
    // dispatch() can step DOWN a tier if the module that owns the top one is
    // missing at tap time — rather than falling all the way to the link and
    // throwing away a card that was on file the whole time.
    var card = recordCard(pid, iss);
    if (card) {
      st.card = card;
      st.tier = 'record';
      st.what = [card.measureNumber, card.issue && card.issue.label].filter(Boolean).join(' · ');
    } else {
      var r = receiptFor(pid, iss);
      if (r) {
        st.tier = 'receipt';
        st.receipt = r;
        st.what = String((r.issue && (r.issue.label || r.issue)) || r.headline || '').slice(0, 90);
      }
    }
    var sum = summaryFor(pid, iss);
    if (sum) {
      st.summary = sum;
      st.tier = 'summary';
      st.what = sum.verdict ? String(sum.verdict.label) : 'their record so far';
    }
    var t = TIERS[st.tier];
    st.ico = t.ico; st.cls = t.cls;
    st.hint = (st.issueKey && t.hintIssue) ? t.hintIssue : t.hint;
    st.label = label(st);
    // Only cache an answer that cannot still improve. Before the record settles
    // a 'link' is provisional, and caching it would freeze the weakest tier in
    // place for the rest of the session. A summary is never cached early either:
    // its verdict is read from a record that may still be warming, and a frozen
    // "no record to test yet" in the aria-label would outlive the votes arriving.
    if ((st.tier !== 'link' && st.tier !== 'summary') || _settled[pid]) _tier[k] = st;
    return st;
  }

  // The accessible name. It names the artifact AND the person, because this
  // button appears in strips where "Share" alone could mean any of five rows.
  function label(st) {
    if (st.tier === 'summary') {
      var d = st.summary || {};
      var b = d.breakdown || {};
      var tested = (b.consistent || 0) + (b.mixed || 0) + (b.contradicts || 0);
      // Spelled out rather than summarised: whoever hears this label is deciding
      // whether to publish the image, so they are told what the image will say —
      // including when the answer is that there is not much record yet.
      return 'Share ' + st.name + '’s record card as an image — the ⚖️ Word vs Action read (' +
        (d.verdict ? d.verdict.label : 'still building') + '), ' +
        (tested
          ? tested + ' tested statement' + (tested === 1 ? '' : 's') + ' broken out as ' +
            (b.consistent || 0) + ' backed up, ' + (b.mixed || 0) + ' mixed and ' +
            (b.contradicts || 0) + ' contradicted'
          : 'an honest note that nothing they have said has been tested by a vote yet') +
        ', its coverage, and the receipts under it. No percentage is printed on the card.';
    }
    if (st.tier === 'record') {
      return 'Share ' + (st.what || 'this vote') + ' for ' + st.name +
        ' as an Official Record image — the card prints the bill, the vote, the date, the source and how it was judged.';
    }
    if (st.tier === 'receipt') {
      return 'Share the Say-vs-Do receipt for ' + st.name +
        ' as an image — the card prints what they said, what they did, the source and the date.';
    }
    // The link tier, named by what the link actually opens. Inside an issue
    // dossier that is the Official Record for that issue, not the profile — and a
    // label that said "profile" while the button sent an issue link would be the
    // same lie in the other direction.
    if (st.issueKey) {
      return 'Share a link to ' + st.name + '’s Official Record on this issue. ' +
        'No verdict-stamped share card is on file for them here yet.';
    }
    return 'Share a link to ' + st.name +
      '’s profile. No verdict-stamped share card is on file for them yet.';
  }

  // One warm attempt per member, shared by every button on the page. Resolving
  // clears the memo so the next state() read sees the record.
  function warm(pid) {
    pid = String(pid || '');
    if (!pid) return Promise.resolve(null);
    if (_settled[pid]) return Promise.resolve(null);
    if (_warming[pid]) return _warming[pid];
    var rc = RC();
    var p = (rc && typeof rc.warm === 'function') ? rc.warm(pid) : Promise.resolve(null);
    _warming[pid] = Promise.resolve(p).catch(function () { return null; }).then(function (v) {
      _settled[pid] = true;
      Object.keys(_tier).forEach(function (k) { if (k.indexOf(pid + '|') === 0) delete _tier[k]; });
      return v;
    });
    return _warming[pid];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARKUP  ·  fail-open and fixed-size
  // ──────────────────────────────────────────────────────────────────────────
  // opts: { pid, issueKey, block, stopKeys, hint, text, cls, fallback }
  //   block    → full-width, for a bottom sheet
  //   stopKeys → the host row is itself keyboard-activatable; keep Enter/Space
  //              on this button out of the row's own handler
  //   hint     → also emit the height-reserved explanation line
  //   text     → override the (constant) visible label
  //   fallback → 'copy' when the button already lives inside the share sheet, so
  //              tier 'link' copies the link instead of reopening the sheet it
  //              is standing in
  // ══════════════════════════════════════════════════════════════════════════
  function buttonHtml(opts) {
    opts = opts || {};
    var pid = String(opts.pid || '');
    if (!pid) return '';
    var st = state(pid, opts);
    var txt = opts.text || 'Share';
    var btn =
      '<button type="button" class="pdxsa-share-btn ' + st.cls + (opts.block ? ' pdxsa-block' : '') +
        (opts.cls ? ' ' + esc(opts.cls) : '') + '"' +
        ' data-pid="' + esc(pid) + '"' +
        (st.issueKey ? ' data-issue="' + esc(st.issueKey) + '"' : '') +
        (opts.fallback ? ' data-pdxsa-fallback="' + esc(opts.fallback) + '"' : '') +
        (st.settled ? '' : ' data-pdxsa-pending="1"') +
        ' data-pdxsa-tier="' + st.tier + '"' +
        (opts.stopKeys ? ' onkeydown="event.stopPropagation()"' : '') +
        ' title="' + esc(st.label) + '" aria-label="' + esc(st.label) + '">' +
        // Fixed-width slot: hydration swaps the glyph inside it, so the button's
        // width is set by the label alone and can never change.
        '<span class="pdxsa-ico" aria-hidden="true">' + st.ico + '</span>' +
        '<span class="pdxsa-lbl">' + esc(txt) + '</span>' +
      '</button>';
    if (!opts.hint) return btn;
    return '<span class="pdxsa-wrap' + (opts.block ? ' pdxsa-wrap-block' : '') + '">' + btn +
      '<span class="pdxsa-hint">' + esc(st.hint) + '</span></span>';
  }

  // In-place upgrade. Touches only attributes, one glyph and one text node that
  // lives in a height-reserved box — never the DOM shape, never the label width.
  function apply(btn, st) {
    if (!btn || !st) return;
    btn.classList.remove('pdxsa-t-summary', 'pdxsa-t-record', 'pdxsa-t-receipt', 'pdxsa-t-link');
    btn.classList.add(st.cls);
    btn.setAttribute('data-pdxsa-tier', st.tier);
    btn.setAttribute('title', st.label);
    btn.setAttribute('aria-label', st.label);
    var ico = btn.querySelector('.pdxsa-ico');
    if (ico) ico.textContent = st.ico;
    var wrap = btn.parentNode;
    var hint = wrap && wrap.classList && wrap.classList.contains('pdxsa-wrap')
      ? wrap.querySelector('.pdxsa-hint') : null;
    if (hint) hint.textContent = st.hint;
    btn.removeAttribute('data-pdxsa-pending');
  }

  // Resolves to the number of buttons upgraded. Safe on every repaint: a button
  // is only looked at while it still carries data-pdxsa-pending.
  function hydrate(root) {
    var scope = root || document;
    var list = null;
    try { list = scope.querySelectorAll('.pdxsa-share-btn[data-pdxsa-pending]'); } catch (e) { list = null; }
    if (!list || !list.length) return Promise.resolve(0);
    var byPid = {}, i, p;
    for (i = 0; i < list.length; i++) {
      p = list[i].getAttribute('data-pid');
      if (!p) { list[i].removeAttribute('data-pdxsa-pending'); continue; }
      (byPid[p] = byPid[p] || []).push(list[i]);
    }
    var n = 0;
    return Promise.all(Object.keys(byPid).map(function (pid) {
      return warm(pid).then(function () {
        byPid[pid].forEach(function (btn) {
          if (!btn.parentNode) return;
          apply(btn, state(pid, { issueKey: btn.getAttribute('data-issue') || '' }));
          n++;
        });
      });
    })).then(function () { return n; });
  }

  // For hosts that paint synchronously and want hydration on the next tick
  // without wiring their own timer.
  function hydrateSoon(root) {
    try { setTimeout(function () { hydrate(root || document); }, 0); } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION  ·  one tap, whichever tier answers
  // ──────────────────────────────────────────────────────────────────────────
  // A cold tap warms the record inside the same gesture before deciding, so a
  // reader who taps before hydration finishes still gets the card rather than
  // the link. The busy state is a class and an aria-busy attribute — no text
  // change, so waiting cannot move the page either.
  // ══════════════════════════════════════════════════════════════════════════
  function busy(btn, on) {
    if (!btn || !btn.classList) return;
    if (on) { btn.classList.add('pdxsa-busy'); btn.setAttribute('aria-busy', 'true'); }
    else { btn.classList.remove('pdxsa-busy'); btn.removeAttribute('aria-busy'); }
  }

  function toast(msg) {
    try { if (typeof window._showToast === 'function') { window._showToast(msg); return true; } } catch (e) {}
    return false;
  }

  // Step down, never sideways: the preferred tier first, then any weaker artifact
  // state() already found, then the link. A module that failed to load costs the
  // reader the best card, not the whole gesture.
  function dispatch(st, btn) {
    var rc = RC(), s = SVD(), pc = PC();
    if (st.tier === 'summary' && pc && typeof pc.share === 'function') return pc.share(st.pid, btn);
    if (st.card && rc && typeof rc.share === 'function') return rc.share(st.card, btn);
    if (st.receipt && s && typeof s.share === 'function') return s.share(st.receipt, btn);
    return fallback(st, btn);
  }

  // The honest fallback. Nothing here pretends a card exists: it shares the one
  // artifact that always exists — the record itself — and names that plainly.
  //
  // "The record itself" is not always the profile. This control is mounted inside
  // issue dossiers, where st.issueKey names the one issue the reader has open, and
  // the app already has an address for that: #record=<pid>~<issue>, which
  // share-links.js writes in server-visible form and receipt-cards.js opens
  // straight onto the Official Record. Dropping the issue here was the whole "dead
  // link" report: a share taken from Scalise / Secure & Accessible Voting emitted
  // /?p=scalise, and the reader who followed it landed on a profile shell with no
  // way to tell which of nineteen issues had been sent.
  function fallback(st, btn) {
    var inSheet = btn && btn.getAttribute && btn.getAttribute('data-pdxsa-fallback') === 'copy';
    var scoped = !!st.issueKey;
    var what = scoped ? 'issue link' : 'profile link';
    if (inSheet && typeof window._pdxCopyShareLink === 'function') {
      window._pdxCopyShareLink();
      toast('No verdict-stamped card on file yet — ' + what + ' copied instead');
      return null;
    }
    if (typeof window.pdxSharePolitician === 'function') {
      window.pdxSharePolitician(st.pid, null, { issueKey: st.issueKey || '' });
      toast('No verdict-stamped card on file yet — sharing the ' + what);
      return null;
    }
    if (typeof window.showProfile === 'function') { window.showProfile(st.pid); return null; }
    toast('Nothing to share for them yet');
    return null;
  }

  function share(pid, btn, opts) {
    pid = String(pid || '');
    if (!pid) return null;
    var iss = (opts && opts.issueKey) || (btn && btn.getAttribute && btn.getAttribute('data-issue')) || '';
    var st = state(pid, { issueKey: iss });
    if (!st) return null;
    if (st.tier !== 'link' || _settled[pid]) return dispatch(st, btn);
    // Cold and empty-looking. The record may simply not have arrived, so warm
    // first — one tap, still.
    busy(btn, true);
    return warm(pid).then(function () {
      busy(btn, false);
      var next = state(pid, { issueKey: iss });
      if (btn && btn.parentNode) apply(btn, next);
      return dispatch(next, btn);
    }, function () {
      busy(btn, false);
      return dispatch(st, btn);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL DELEGATE
  // ──────────────────────────────────────────────────────────────────────────
  // Capture phase, like the PDXReceiptCards delegate it sits beside: this button
  // is mounted inside rows and cards that are themselves clickable, and the
  // share must not also open the profile behind it.
  // ══════════════════════════════════════════════════════════════════════════
  function bind() {
    if (window._pdxsaBound) return;
    window._pdxsaBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.pdxsa-share-btn');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var pid = btn.getAttribute('data-pid');
      if (pid) share(pid, btn);
    }, true);

    // The curated Say-vs-Do feed loads ON DEMAND (pdx-lazy-data.js fires this once
    // window.ACCT_SPOTLIGHT arrives), so a tier resolved before it lands can be a
    // 'link' that is only true for another second. Left memoised that would freeze
    // the weakest answer in place for the rest of the session and quietly deny a
    // receipt that exists. So the memo is dropped and every control already on the
    // page is re-marked pending and re-read — an upgrade in place, which is exactly
    // what this control's fixed size makes safe to do at any time.
    document.addEventListener('pdx:data:acctSpotlight', function () {
      try {
        _tier = {};
        var all = document.querySelectorAll('.pdxsa-share-btn');
        for (var i = 0; i < all.length; i++) all[i].setAttribute('data-pdxsa-pending', '1');
        hydrate(document);
      } catch (e) {}
    });
  }

  window.PDXShareAnywhere = {
    // reads
    state: state,
    warm: warm,
    TIERS: TIERS,
    // markup + in-place hydration
    buttonHtml: buttonHtml,
    hydrate: hydrate,
    hydrateSoon: hydrateSoon,
    apply: apply,
    // action
    share: share,
    // pure pieces, exposed for scripts/test-share-anywhere.mjs
    _label: label,
    _nameOf: nameOf
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
