/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Claim → Receipt adapter  ·  window.PDXClaimCheck
   ────────────────────────────────────────────────────────────────────────────
   THE SMALLEST THING THAT MAKES A PASTED CLAIM CHECKABLE.

   Everything a "paste a claim → see the receipt" flow needs already shipped,
   except one link in the middle:

     · receipt-cards.js already builds the receipt — a member's own stated
       position lined up against their own cited floor vote on the same issue
       key, judged by the shared Official Record engine, behind guards that fail
       closed, with a source URL a stranger can open and a share image.
     · say-vs-do.js already renders that card object.
     · The All-Seeing Eye already accepts any text a reader can type or paste.

   What was missing is the ADAPTER: nothing turned a sentence into the address
   `(pid, issueKey)` that PDXReceiptCards.find() takes. This file is that
   adapter and nothing more.

   WHAT THIS FILE DOES NOT DO — the list matters as much as the feature:
     · It does not judge whether a claim is true. It locates the receipt the
       app already holds and lets that receipt speak.
     · It does not render a receipt. Every card on screen comes out of
       PDXReceipts.cardHTML(), the same renderer the hero and the profile use.
     · It does not relax a guard. The card it displays is one PDXReceiptCards
       already agreed to build; the share affordance is PDXReceiptCards.buttonHtml(),
       which is gated a second time by the public allowlist.
     · It does not score, count, rank, or write anything. No Say-vs-Do figure,
       Word vs Action percentage or Official Record verdict is touched.
     · It stores nothing. There is no claim database; the last reading lives in
       one variable and dies with the tab.

   THE HONESTY RULE. A reader must always be able to see what we THOUGHT they
   meant, because a resolver that silently reads "Lee is soft on the border" as
   a question about immigration enforcement has made an interpretive choice on
   their behalf. So every result prints its reading — the person, the issue, and
   the direction we read the claim as asserting — above the card, and offers the
   ordinary search as the way out when the reading is wrong.

   Public surface:
     PDXClaimCheck.looksLikeClaim(text)   → is this paste-shaped rather than search-shaped?
     PDXClaimCheck.blockHtml(text)        → the block the All-Seeing Eye splices in
     PDXClaimCheck.check(text)            → run it (returns a Promise, resolves to the state)
     PDXClaimCheck.statusFor(card, dir)   → 'supported' | 'contradicted' | '' (pure)
     PDXClaimCheck.state()                → the last reading, or null
     PDXClaimCheck.reset()                → forget it
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXClaimCheck) return; // idempotent

  var ENDPOINT = '/api/claim-resolve';

  // ── What counts as paste-shaped ───────────────────────────────────────────
  // The gate that decides whether the eye offers a claim check at all. It is
  // deliberately blunt and deliberately high: the cost of not offering is that a
  // reader runs an ordinary search, which is what they get today; the cost of
  // offering on every third keystroke is a search box that nags, and a bill to
  // match. "who actually backs housing?" (27 chars, 4 words) stays a search.
  // "Mike Lee says he wants to cut spending but voted for the omnibus" (64
  // chars, 13 words) is a claim.
  var MIN_CHARS = 40;
  var MIN_WORDS = 6;
  // Mirrors CLAIM_MAX in the Function. Trimming here keeps the request honest
  // about what was actually read rather than letting the server truncate
  // silently.
  var MAX_CHARS = 1200;

  function looksLikeClaim(text) {
    var s = String(text == null ? '' : text).trim();
    if (s.length < MIN_CHARS) return false;
    var words = s.split(/\s+/).filter(Boolean);
    return words.length >= MIN_WORDS;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  // One reading at a time, keyed by the exact claim text. The eye re-renders its
  // whole panel on every keystroke and on several app events, so the block has
  // to be able to redraw itself from this rather than from the DOM it last wrote
  // — otherwise a background 'pdx-saved-change' would wipe a result the reader
  // is still reading.
  var _state = null; // { key, phase, claim, reading, card, status, reason }
  var _seq = 0;      // stale-response guard

  function keyOf(text) { return String(text == null ? '' : text).trim().slice(0, MAX_CHARS); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATUS  ·  what the record says about the claim
  // ──────────────────────────────────────────────────────────────────────────
  // The resolver returns the direction the CLAIM asserts. The card carries the
  // member's own stated position (`said.word`) and the engine's verdict on
  // whether their record backs it (`verdict.key`). Those two together give the
  // direction the RECORD points, and the status is a comparison of the two
  // directions — nothing is re-derived and no vote semantics are re-read here.
  //
  //   stated position + verdict 'consistent'  → record points the stated way
  //   stated position + verdict 'contradicts' → record points the other way
  //
  // supportMeaning ('yea_supports' / 'yea_opposes') is what makes that verdict
  // meaningful when one 'yea' means opposite things on two bundled provisions.
  // It is applied upstream by _issueRecordSummary, which is exactly why this
  // function reads the verdict instead of reading votes: re-deriving it here
  // would be a second, drifting copy of the Official Record logic.
  //
  // A stance that is 'Mixed on' or 'On' has no direction to compare, so it
  // returns '' and the caller shows the card without a verdict banner rather
  // than picking one. Fail closed.
  function statusFor(card, direction) {
    if (!card || !card.said || !card.verdict) return '';
    if (direction !== 'supports' && direction !== 'opposes') return '';
    var stanceDir =
      card.said.word === 'Supports' ? 'supports' :
      card.said.word === 'Opposes' ? 'opposes' : '';
    if (!stanceDir) return '';
    var key = card.verdict.key;
    // An omnibus card carries the underlying say-vs-do verdict alongside its own
    // stamp; anything else we do not recognise gets no banner.
    if (key === 'omnibus') key = (card.saydoVerdict && card.saydoVerdict.key) || '';
    if (key !== 'consistent' && key !== 'contradicts') return '';
    var recordDir = (key === 'consistent')
      ? stanceDir
      : (stanceDir === 'supports' ? 'opposes' : 'supports');
    return recordDir === direction ? 'supported' : 'contradicted';
  }

  var STATUS_META = {
    supported: {
      cls: 'pdxcc-ok', ico: '✓', label: 'Supported by the record',
      note: 'The record we hold points the same way as this claim.'
    },
    contradicted: {
      cls: 'pdxcc-no', ico: '⚠', label: 'Contradicted by the record',
      note: 'The record we hold points the other way.'
    },
    none: {
      cls: 'pdxcc-na', ico: '—', label: 'No clear record',
      note: 'We hold no receipt that can test this claim — that is a gap in our record, not a verdict on the claim.'
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // THE READING  ·  always printed, never implied
  // ══════════════════════════════════════════════════════════════════════════
  function issueLabelFor(issueKey, fallback) {
    // ISSUE_MAP owns the label and the icon. The API's `display.issue` is only a
    // de-underscored key, used when the taxonomy has not loaded yet.
    try {
      var def = (window.ISSUE_MAP || {})[issueKey];
      if (def && def.label) return String(def.label).trim();
    } catch (e) {}
    return String(fallback || issueKey || '').trim();
  }

  function readingHtml(reading) {
    var dir = reading.direction === 'supports' ? 'supports it' : 'opposes it';
    return '<div class="pdxcc-reading">' +
      '<span class="pdxcc-reading-k">Read as</span> ' +
      '<b>' + esc(reading.politician) + '</b> · ' +
      esc(reading.issueLabel) + ' · the claim says they <b>' + esc(dir) + '</b>' +
      '</div>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER  ·  the inner HTML of the block, one function per phase
  // ──────────────────────────────────────────────────────────────────────────
  // Everything below writes chrome. The receipt itself is never built here — it
  // is handed to PDXReceipts.cardHTML(), the renderer say-vs-do.js already owns,
  // exactly as receipt-cards.js hands it the same object for the share image.
  // ══════════════════════════════════════════════════════════════════════════
  function head(sub) {
    return '<div class="pdxcc-head"><span class="pdxcc-ico" aria-hidden="true">🧾</span>' +
      '<span class="pdxcc-title">Claim check</span>' +
      (sub ? '<span class="pdxcc-sub">' + esc(sub) + '</span>' : '') + '</div>';
  }

  function offerHtml(claim) {
    return head('') +
      '<p class="pdxcc-copy">That reads like a claim. We can look for a receipt in the ' +
      'record we already hold — the person’s own stated position against their own cited vote.</p>' +
      '<button type="button" class="pdxcc-go" data-pdxcc-go="1">Check this claim against the record</button>' +
      '<p class="pdxcc-fine">We only answer when we can identify the person and the issue with confidence. ' +
      'Otherwise we say so.</p>';
  }

  function loadingHtml() {
    return head('') +
      '<p class="pdxcc-copy pdxcc-busy" role="status">Reading the claim…</p>';
  }

  function unresolvedHtml(reason) {
    return head('couldn’t read it') +
      '<p class="pdxcc-copy">' + esc(reason || 'We could not read that claim reliably.') + '</p>' +
      '<p class="pdxcc-fine">No receipt was pulled. A confident wrong answer about a named person is worse ' +
      'than none, so we stopped. The search results below still apply.</p>';
  }

  function noRecordHtml(reading) {
    var m = STATUS_META.none;
    return head('') + readingHtml(reading) +
      '<div class="pdxcc-status ' + m.cls + '">' +
        '<span class="pdxcc-status-ico" aria-hidden="true">' + m.ico + '</span>' +
        '<span class="pdxcc-status-l">' + esc(m.label) + '</span>' +
      '</div>' +
      '<p class="pdxcc-copy">' + esc(m.note) + '</p>' +
      '<button type="button" class="pdxcc-open" data-pdxcc-pid="' + esc(reading.pid) + '">' +
        'Open ' + esc(reading.politician) + '’s profile →</button>';
  }

  function unavailableHtml(reading) {
    return head('') + (reading ? readingHtml(reading) : '') +
      '<p class="pdxcc-copy">We could not load that record just now. This is a connection problem on our ' +
      'side, not a finding about the claim.</p>' +
      '<button type="button" class="pdxcc-go" data-pdxcc-go="1">Try again</button>';
  }

  function resultHtml(reading, card, status) {
    var m = STATUS_META[status] || null;
    var banner = m
      ? '<div class="pdxcc-status ' + m.cls + '">' +
          '<span class="pdxcc-status-ico" aria-hidden="true">' + m.ico + '</span>' +
          '<span class="pdxcc-status-l">' + esc(m.label) + '</span>' +
          '<span class="pdxcc-status-n">' + esc(m.note) + '</span>' +
        '</div>'
      // No banner rather than a guessed one: the stated position had no direction
      // to compare against, so the card is shown and left to speak for itself.
      : '<div class="pdxcc-status pdxcc-na">' +
          '<span class="pdxcc-status-ico" aria-hidden="true">—</span>' +
          '<span class="pdxcc-status-l">Related record</span>' +
          '<span class="pdxcc-status-n">Their stated position on this issue is not a simple for-or-against, ' +
          'so we are not calling this one either way.</span>' +
        '</div>';

    var cardHtml = '';
    try {
      if (window.PDXReceipts && typeof window.PDXReceipts.cardHTML === 'function') {
        cardHtml = window.PDXReceipts.cardHTML(card, { actions: false }) || '';
      }
    } catch (e) { cardHtml = ''; }

    // The sanctioned share affordance, and the whole point of the success state.
    // buttonHtml() renders hidden and pending; PDXReceiptCards.hydrate() reveals it
    // only if the card clears the public allowlist, so a card that is true but not
    // cleared for publication simply has no share button. We do not decide that here.
    //
    // It is asked for by (pid, issueKey) — the same pair PDXReceiptCards.find()
    // was given to build the card above — and cardsFor() keeps exactly one card per
    // (member, issue). So the button cannot resolve to a different receipt than the
    // one on screen: it is either this card, or it is removed.
    var shareHtml = '';
    try {
      if (window.PDXReceiptCards && typeof window.PDXReceiptCards.buttonHtml === 'function') {
        shareHtml = window.PDXReceiptCards.buttonHtml({
          pid: card.pid, issueKey: card.issueKey, stopKeys: true
        }) || '';
      }
    } catch (e) { shareHtml = ''; }

    // Share leads and "Open the full record" follows. A reader who has just watched
    // a claim resolve is holding the one thing worth passing on, and the action that
    // passes it on should not be the second-quietest control in the row.
    //
    // The share sits in its own wrapper so this surface can give it primary weight
    // (see .pdxcc-share in the stylesheet below) without repainting a component
    // receipt-cards.js owns — and so that when hydrate() REMOVES the button, the
    // wrapper collapses to :empty and the row closes up behind it.
    //
    // The note describing what a share sends ships `hidden` and is revealed by
    // paint(), and only when a button actually survived hydration. Prose that
    // outlived its control would be this surface promising a share it cannot give.
    return head('') + readingHtml(reading) + banner +
      '<div class="pdxcc-card">' + cardHtml + '</div>' +
      '<div class="pdxcc-acts">' +
        '<span class="pdxcc-share">' + shareHtml + '</span>' +
        '<button type="button" class="pdxcc-open" data-pdxcc-pid="' + esc(card.pid) + '">' +
          'Open the full record →</button>' +
      '</div>' +
      '<p class="pdxcc-sharenote" hidden>Share sends the Official Record card as an image — the bill, ' +
        'the question, the vote, the date and the source URL — with a link that opens this exact vote ' +
        'on PolitiDex.</p>' +
      '<p class="pdxcc-fine">One receipt, not a whole record. It cites one vote on one issue — ' +
      'open the profile for everything else we hold.</p>';
  }

  function innerHtml(st) {
    if (!st) return '';
    if (st.phase === 'offer') return offerHtml(st.claim);
    if (st.phase === 'loading') return loadingHtml();
    if (st.phase === 'unresolved') return unresolvedHtml(st.reason);
    if (st.phase === 'unavailable') return unavailableHtml(st.reading);
    if (st.phase === 'no-record') return noRecordHtml(st.reading);
    if (st.phase === 'result') return resultHtml(st.reading, st.card, st.status);
    return '';
  }

  // The whole block, as the eye splices it into its panel. Returns '' for
  // anything that is not paste-shaped, which is what keeps ordinary short
  // searches byte-for-byte what they were.
  function blockHtml(text) {
    var key = keyOf(text);
    if (!looksLikeClaim(key)) return '';
    if (!_state || _state.key !== key) {
      _state = { key: key, claim: key, phase: 'offer' };
    }
    return '<div class="pdxcc" id="pdx-claim-check">' + innerHtml(_state) + '</div>';
  }

  // The share note is revealed from the DOM the hydrator actually left behind,
  // not from the count it resolves with — the count is for the whole root, and
  // only a button still parented under this block is one this surface can honour.
  function syncShareNote(host) {
    if (!host) return;
    var note = host.querySelector('.pdxcc-sharenote');
    if (!note) return;
    var btn = host.querySelector('.pdxcc-share .pdxrc-share-btn:not([data-pdxrc-pending])');
    if (btn) note.removeAttribute('hidden'); else note.setAttribute('hidden', '');
  }

  // Redraw in place. Patching the block rather than asking the eye to re-render
  // keeps the input focused, the caret where it was, and the panel from
  // scrolling — which on a phone is the difference between a result appearing
  // and the page jumping under a thumb.
  function paint() {
    var host = document.getElementById('pdx-claim-check');
    if (!host) return;
    host.innerHTML = innerHtml(_state);
    if (_state && _state.phase === 'result') {
      try {
        if (window.PDXReceiptCards && typeof window.PDXReceiptCards.hydrate === 'function') {
          var p = window.PDXReceiptCards.hydrate(host);
          if (p && typeof p.then === 'function') {
            // Re-read the id rather than closing over `host`: a repaint between
            // the call and the resolve replaces the node, and revealing the note
            // on a detached block would leave the live one silently wrong.
            p.then(function () { syncShareNote(document.getElementById('pdx-claim-check')); },
                   function () {});
          }
        }
      } catch (e) {}
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RUN
  // ══════════════════════════════════════════════════════════════════════════
  function check(text) {
    var key = keyOf(text);
    if (!looksLikeClaim(key)) return Promise.resolve(null);

    var seq = ++_seq;
    _state = { key: key, claim: key, phase: 'loading' };
    paint();

    var stale = function () { return seq !== _seq; };

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claim: key })
    }).then(function (res) {
      // A 502 carries { error } rather than the unresolved envelope — the
      // difference matters to a reader, because one is "we could not read your
      // claim" and the other is "our side is down".
      return res.json().then(function (data) { return { ok: res.ok, data: data }; },
                             function () { return { ok: false, data: null }; });
    }).then(function (r) {
      if (stale()) return _state;
      var d = r.data;
      if (!d || (!r.ok && !d.reason && d.error)) {
        _state = { key: key, claim: key, phase: 'unavailable', reading: null };
        paint();
        return _state;
      }
      if (!d.resolved) {
        _state = { key: key, claim: key, phase: 'unresolved', reason: d.reason || '' };
        paint();
        return _state;
      }

      var reading = {
        pid: String(d.pid || ''),
        issueKey: String(d.issueKey || ''),
        direction: d.direction === 'opposes' ? 'opposes' : 'supports',
        politician: String((d.display && d.display.politician) || d.pid || ''),
        issueLabel: issueLabelFor(d.issueKey, d.display && d.display.issue),
        confidence: Number(d.confidence) || 0
      };
      return finish(key, reading, stale);
    }, function () {
      if (stale()) return _state;
      _state = { key: key, claim: key, phase: 'unavailable', reading: null };
      paint();
      return _state;
    });
  }

  // Hand the resolved address to the receipt machinery and render whatever it
  // agrees to give us. warm() returning null means the record could not be
  // loaded at all, which is a different (and recoverable) thing from a member
  // having no eligible receipt on this issue — conflating them would print
  // "no clear record" over a dropped request.
  function finish(key, reading, stale) {
    var RC = window.PDXReceiptCards;
    if (!RC || typeof RC.find !== 'function' || typeof RC.warm !== 'function') {
      _state = { key: key, claim: key, phase: 'unavailable', reading: reading };
      paint();
      return Promise.resolve(_state);
    }
    return RC.warm(reading.pid).then(function (records) {
      if (stale()) return _state;
      var card = null;
      try { card = RC.find(reading.pid, reading.issueKey); } catch (e) { card = null; }
      if (card) {
        _state = {
          key: key, claim: key, phase: 'result', reading: reading,
          card: card, status: statusFor(card, reading.direction)
        };
      } else if (!records) {
        _state = { key: key, claim: key, phase: 'unavailable', reading: reading };
      } else {
        _state = { key: key, claim: key, phase: 'no-record', reading: reading };
      }
      paint();
      return _state;
    }, function () {
      if (stale()) return _state;
      _state = { key: key, claim: key, phase: 'unavailable', reading: reading };
      paint();
      return _state;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIRING  ·  one document delegate, so the host surface needs no wire() call
  // ══════════════════════════════════════════════════════════════════════════
  if (!window._pdxccBound) {
    window._pdxccBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      var go = t.closest('[data-pdxcc-go]');
      if (go && go.closest('#pdx-claim-check')) {
        e.preventDefault(); e.stopPropagation();
        check(_state ? _state.claim : '');
        return;
      }

      // The card body carries role="button" from cardHTML, but the delegate that
      // makes that real is scoped to the say-vs-do mount. Rather than leave a
      // dead control on this surface, the whole block routes a card click to the
      // profile — the same destination the card promises.
      var open = t.closest('.pdxcc-open');
      var cardEl = open ? null : (t.closest('.pdxcc-card .svd-receipt'));
      var pid = '';
      if (open) pid = open.getAttribute('data-pdxcc-pid') || '';
      else if (cardEl && !t.closest('.pdxrc-share-btn, a')) pid = cardEl.getAttribute('data-pid') || '';
      if (!pid) return;
      e.preventDefault(); e.stopPropagation();
      if (typeof window.showProfile === 'function') window.showProfile(pid);
    });
    // Keyboard parity for the card, which is a div with role="button".
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target;
      if (!t || !t.closest) return;
      var cardEl = t.closest('.pdxcc-card .svd-receipt');
      if (!cardEl) return;
      e.preventDefault();
      var pid = cardEl.getAttribute('data-pid') || '';
      if (pid && typeof window.showProfile === 'function') window.showProfile(pid);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STYLE
  // ──────────────────────────────────────────────────────────────────────────
  // Injected rather than linked: index.html holds a hard budget on
  // render-blocking stylesheets (scripts/test-index-scripts.mjs enforces it) and
  // this block is never on the critical path — it exists only after a reader has
  // pasted something.
  // ══════════════════════════════════════════════════════════════════════════
  (function injectCss() {
    if (document.getElementById('pdx-claim-check-css')) return;
    var css =
      '.pdxcc{border:1px solid rgba(245,200,66,0.28);border-radius:0.7rem;' +
        'background:linear-gradient(180deg,rgba(28,24,10,0.55),rgba(10,15,30,0.5));' +
        'padding:0.75rem 0.8rem;margin:0.5rem 0 0.65rem;}' +
      '.pdxcc-head{display:flex;align-items:center;gap:0.4rem;margin-bottom:0.4rem;}' +
      '.pdxcc-ico{font-size:0.95rem;}' +
      '.pdxcc-title{font-family:\'Barlow Condensed\',sans-serif;letter-spacing:0.08em;' +
        'text-transform:uppercase;font-size:0.82rem;color:#f5c842;font-weight:700;}' +
      '.pdxcc-sub{font-size:0.72rem;color:#9fb4d4;letter-spacing:0.02em;}' +
      '.pdxcc-copy{margin:0.3rem 0;font-size:0.86rem;line-height:1.45;color:#cfdcf0;}' +
      '.pdxcc-fine{margin:0.45rem 0 0;font-size:0.72rem;line-height:1.4;color:#8399b8;}' +
      '.pdxcc-busy::after{content:"";display:inline-block;width:0.5rem;height:0.5rem;' +
        'margin-left:0.4rem;border-radius:999px;background:#f5c842;animation:pdxccPulse 1s infinite ease-in-out;}' +
      '@keyframes pdxccPulse{0%,100%{opacity:0.25;}50%{opacity:1;}}' +
      // Tap targets: 44px minimum on the two controls a thumb reaches for.
      '.pdxcc-go,.pdxcc-open{display:inline-flex;align-items:center;justify-content:center;' +
        'min-height:2.75rem;padding:0.5rem 0.9rem;margin-top:0.35rem;border-radius:0.5rem;' +
        'font-family:\'Barlow\',sans-serif;font-size:0.85rem;font-weight:600;cursor:pointer;' +
        'border:1px solid rgba(245,200,66,0.5);background:rgba(245,200,66,0.12);color:#f5c842;}' +
      '.pdxcc-go:hover,.pdxcc-open:hover{background:rgba(245,200,66,0.2);}' +
      '.pdxcc-open{border-color:rgba(148,163,184,0.35);background:rgba(148,163,184,0.1);color:#cfdcf0;}' +
      '.pdxcc-reading{font-size:0.78rem;line-height:1.5;color:#b7c8e0;margin:0.15rem 0 0.5rem;}' +
      '.pdxcc-reading-k{display:inline-block;font-family:\'Barlow Condensed\',sans-serif;' +
        'text-transform:uppercase;letter-spacing:0.09em;font-size:0.68rem;color:#8399b8;margin-right:0.25rem;}' +
      '.pdxcc-status{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.35rem 0.5rem;' +
        'padding:0.45rem 0.6rem;border-radius:0.5rem;border-left:4px solid currentColor;margin-bottom:0.55rem;}' +
      '.pdxcc-status-ico{font-size:0.9rem;}' +
      '.pdxcc-status-l{font-family:\'Barlow Condensed\',sans-serif;text-transform:uppercase;' +
        'letter-spacing:0.07em;font-size:0.9rem;font-weight:700;}' +
      '.pdxcc-status-n{flex:1 1 100%;font-size:0.75rem;line-height:1.4;color:#b7c8e0;}' +
      '.pdxcc-ok{color:#4ade80;background:rgba(74,222,128,0.1);}' +
      '.pdxcc-no{color:#fb7185;background:rgba(251,113,133,0.1);}' +
      '.pdxcc-na{color:#9fb4d4;background:rgba(159,180,212,0.08);}' +
      '.pdxcc-card{margin:0.15rem 0 0.5rem;}' +
      '.pdxcc-acts{display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;}' +
      // The share is the primary action of the success state, so it is sized like
      // one: taller, wider, filled, and first in the row. What is NOT overridden is
      // the button's border colour — receipt-cards.js paints that from the verdict
      // (--pdxrc-c), and it is thickened here rather than replaced, so the control
      // still carries the colour of the finding it is about to send.
      // :empty is the fail-closed half. hydrate() removes the button outright when
      // no card clears the public allowlist, and an empty wrapper would otherwise
      // hold a gap in the row where a share used to look like it belonged.
      '.pdxcc-share:empty{display:none;}' +
      '.pdxcc-acts .pdxcc-share{display:inline-flex;}' +
      '.pdxcc-acts .pdxcc-share .pdxrc-share-btn{min-height:2.75rem;padding:0.6rem 1.15rem;' +
        'font-size:0.84rem;letter-spacing:0.06em;border-width:2px;color:#ffffff;' +
        'background:rgba(37,71,133,0.95);box-shadow:0 6px 18px rgba(0,0,0,0.35),' +
        'inset 0 1px 0 rgba(255,255,255,0.08);}' +
      '.pdxcc-acts .pdxcc-share .pdxrc-share-btn:hover{background:rgba(48,90,166,0.98);color:#fff;}' +
      // Secondary by contrast, not by shrinking: "Open the full record" keeps its
      // full tap target and simply stops competing for the eye.
      '.pdxcc-sharenote{margin:0.5rem 0 0;font-size:0.72rem;line-height:1.4;color:#9fb4d4;}' +
      '.pdxcc-sharenote[hidden]{display:none;}' +
      // The card's own foot offers a Say-vs-Do share and a "Profile →" hint that
      // belong to the surface it was written for. On this one the share must be
      // the Official Record button (guarded by the public allowlist) and the
      // profile route is the block's own control, so the borrowed pair is hidden
      // rather than left to send a reader somewhere the card did not promise.
      '.pdxcc-card .svd-share-btn,.pdxcc-card .svd-rc-more{display:none !important;}' +
      '@media (max-width:480px){' +
        '.pdxcc{padding:0.65rem 0.6rem;}' +
        '.pdxcc-go,.pdxcc-open{width:100%;}' +
        '.pdxcc-acts{flex-direction:column;align-items:stretch;}' +
        '.pdxcc-acts .pdxcc-share{display:flex;}' +
        '.pdxcc-acts .pdxcc-share .pdxrc-share-btn{width:100%;}' +
      '}';
    var el = document.createElement('style');
    el.id = 'pdx-claim-check-css';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  })();

  window.PDXClaimCheck = {
    looksLikeClaim: looksLikeClaim,
    blockHtml: blockHtml,
    check: check,
    statusFor: statusFor,
    state: function () { return _state; },
    reset: function () { _state = null; _seq++; },
    // Exposed so scripts/test-claim-check.mjs can assert on the thresholds
    // themselves rather than only on their effects.
    MIN_CHARS: MIN_CHARS,
    MIN_WORDS: MIN_WORDS,
    MAX_CHARS: MAX_CHARS,
    ENDPOINT: ENDPOINT
  };
})();
