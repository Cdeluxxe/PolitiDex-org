// ─────────────────────────────────────────────────────────────────────────────
// 🔴 Live proof — the record, as the browser actually has it
// ─────────────────────────────────────────────────────────────────────────────
// A small strip under Door 1 that names the newest publishable Official Record
// cards THIS PAGE has genuinely built, newest vote first. It exists to answer the
// one question a static homepage cannot: "is any of this actually live?"
//
// WHAT IT IS NOT
// It is not a content system, a feed, or a second engine. It has no seed file, no
// editorial list and no verdict logic of its own. Every item is a card that
// PDXReceiptCards built from the roll-call record and that then cleared the same
// public share gate a share button clears — publicCardsFor() + publicTier(). If
// that gate ever tightens, this strip shrinks with it, automatically, because
// there is no stored list of blessed items to go stale.
//
// IT COSTS NOTHING TO FETCH
// It deliberately does not call warm(). hero-showcase.js already warms a capped
// set of members for the hero card, through the queue consistency.js debounces;
// this reads whatever that warming left behind and nothing else. So the strip is
// free, and — more importantly — "live" here means "built from a record this page
// really loaded", not "we went and got something to look busy".
//
// FAIL CLOSED
// No engine, no warm records, no publishable cards, or fewer than MIN_ITEMS of
// them → the host stays [hidden] and nothing paints. A rebuild that comes back
// empty re-hides a strip that was showing. There is no placeholder, no skeleton,
// no example and no "loading receipts…" state: an empty proof slot is honest, and
// a promise of proof with no proof under it is the one thing this product cannot
// ship.
//
// WHY 'core' ONLY, AND WHY TWO
// publicTier() separates cards backed by two or more judged votes ('core') from
// ones true but a single roll call deep ('thin'). A thin card is not false, it is
// thin, and this strip's whole claim is depth — so it publishes from 'core' only.
// And it needs at least two members: one card is what #hero-receipt already
// shows, and a "strip" of one reprints it under a heading that implies a set.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var host = document.getElementById('live-proof');
  if (!host) return;

  var MAX_ITEMS = 3;   // one per member, newest vote first
  var MIN_ITEMS = 2;   // below this it is not a strip, it is a repeat

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function RC() {
    var rc = window.PDXReceiptCards;
    return (rc && typeof rc.publicCardsFor === 'function' &&
            typeof rc.publicTier === 'function') ? rc : null;
  }

  // ── Collect ────────────────────────────────────────────────────────────────
  // Candidates are the homepage's own invitation list (hero-showcase-data.js) —
  // the same members hero-showcase.js warms. Being on that list is permission to
  // be CONSIDERED and nothing more; the public gate below decides everything that
  // matters. One card per member, so the strip can never read as a pile-on.
  function collect() {
    var rc = RC();
    if (!rc) return [];
    var pool = Array.isArray(window.PDX_HERO_SHOWCASE) ? window.PDX_HERO_SHOWCASE : [];
    if (!pool.length) return [];

    var out = [];
    pool.forEach(function (entry) {
      var pid = entry && entry.pid;
      if (!pid) return;
      var cards = [];
      try { cards = rc.publicCardsFor(pid) || []; } catch (e) { return; }
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var tier = '';
        try { tier = rc.publicTier(c); } catch (e) { tier = ''; }
        // Re-assert the three things this strip PRINTS, on the finished card
        // rather than on trust: a name, a dated vote, and a hash that opens the
        // record it names. publicCardsFor already guarantees all three; a
        // renderer that quietly lost one would otherwise paint a dead chip.
        if (tier !== 'core') continue;
        if (!c || !c.name || !c.date || !c.hash) continue;
        if (!c.verdict || !c.verdict.label) continue;
        out.push(c);
        return; // one per member
      }
    });

    // Newest vote first. `date` is the ISO day the card prints, so this is the
    // real chronology of the record, not an arrival order or a shuffle.
    out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return out.slice(0, MAX_ITEMS);
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  function when(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(iso || '');
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var mi = parseInt(m[2], 10) - 1;
    if (mi < 0 || mi > 11) return String(iso || '');
    return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function chip(c) {
    var vkey = String((c.verdict && c.verdict.key) || 'note').replace(/[^a-z]/gi, '');
    var party = (c.party && c.party.label)
      ? '<span class="pdxlp-party" style="--p:' + esc(c.party.color || '#94a3b8') + '">' +
          esc(c.party.label) + '</span>'
      : '';
    var issue = (c.issue && c.issue.label)
      ? '<span class="pdxlp-issue">' + esc(c.issue.icon || '') + ' ' + esc(c.issue.label) + '</span>'
      : '';
    // The measure and the day, which is what makes this a receipt rather than a
    // claim about one. Both come off the card; neither is composed here.
    var meta = [c.measureNumber ? esc(c.measureNumber) : '', when(c.date) ? esc(when(c.date)) : '']
      .filter(Boolean).join(' · ');

    return '' +
      '<button type="button" class="pdxlp-chip pdxlp-v-' + esc(vkey) + '"' +
        ' data-pdxlp-hash="' + esc(c.hash) + '">' +
        '<span class="pdxlp-stamp"><span aria-hidden="true">' +
          esc((c.verdict && c.verdict.ico) || '') + '</span>' +
          esc(c.verdict.label) + '</span>' +
        '<span class="pdxlp-who">' + esc(c.name) + party + '</span>' +
        issue +
        (meta ? '<span class="pdxlp-meta">' + meta + '</span>' : '') +
        '<span class="pdxlp-go">See the vote <span aria-hidden="true">→</span></span>' +
      '</button>';
  }

  var _shown = '';

  function draw() {
    var items = collect();
    if (items.length < MIN_ITEMS) {
      // Re-hide, not just "don't show": the gate has to survive a rebuild that
      // came back empty after a good one.
      if (_shown) { host.innerHTML = ''; _shown = ''; }
      host.hidden = true;
      return;
    }

    var key = items.map(function (c) { return c.pid + '~' + c.issueKey; }).join('|');
    if (key === _shown) return;   // nothing changed; don't churn the DOM
    _shown = key;

    host.innerHTML =
      '<div class="pdxlp-head">' +
        '<span class="pdxlp-kicker"><span class="pdxlp-dot" aria-hidden="true"></span>Live from the record</span>' +
        '<p class="pdxlp-sub">Built in this browser from roll-call votes this page loaded — ' +
          'newest vote first, nobody picked them. Tap one for the bill, the question, ' +
          'the date and the source.</p>' +
      '</div>' +
      '<div class="pdxlp-row">' + items.map(chip).join('') + '</div>';
    host.hidden = false;
  }

  // ── Open ───────────────────────────────────────────────────────────────────
  // The card's own `hash` is the address — the same one a shared image carries.
  // Setting it hands off to receipt-cards.js's arrival handler, which opens the
  // Official Record gap view. Deliberately NOT PDXReceipts.open(): a formal
  // legislative action must not open on a Say-vs-Do surface.
  host.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.pdxlp-chip');
    if (!btn) return;
    var hash = btn.getAttribute('data-pdxlp-hash') || '';
    if (!hash) return;
    if (location.hash === hash) {
      // Same address twice fires no hashchange, so re-open it directly.
      var rc = window.PDXReceiptCards;
      if (rc && typeof rc.handleHash === 'function') { try { rc.handleHash(); } catch (err) {} }
      return;
    }
    location.hash = hash;
  });

  // ── Styles ─────────────────────────────────────────────────────────────────
  // Injected rather than shipped as a stylesheet: this file is optional by
  // design, and an empty strip should cost the page nothing, including a request.
  (function () {
    if (document.getElementById('pdxlp-css')) return;
    var st = document.createElement('style');
    st.id = 'pdxlp-css';
    st.textContent = [
      '#live-proof[hidden]{display:none!important;}',
      '#live-proof{max-width:64rem;margin:0 auto 1.1rem;padding:0 1.25rem;}',
      '.pdxlp-head{text-align:center;margin:0 0 0.75rem;}',
      '.pdxlp-kicker{display:inline-flex;align-items:center;gap:0.45rem;' +
        "font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:0.2em;" +
        'text-transform:uppercase;font-size:0.66rem;color:#9fb4d4;}',
      '.pdxlp-dot{width:7px;height:7px;border-radius:9999px;background:#f87171;' +
        'box-shadow:0 0 0 0 rgba(248,113,113,0.5);animation:pdxlpDot 3.2s infinite;}',
      '@keyframes pdxlpDot{0%{box-shadow:0 0 0 0 rgba(248,113,113,0.45);}' +
        '70%{box-shadow:0 0 0 6px rgba(248,113,113,0);}100%{box-shadow:0 0 0 0 rgba(248,113,113,0);}}',
      '@media (prefers-reduced-motion:reduce){.pdxlp-dot{animation:none;}}',
      ".pdxlp-sub{font-family:'Barlow',sans-serif;font-size:0.8rem;line-height:1.5;" +
        'color:#8aa0c4;max-width:34rem;margin:0.35rem auto 0;}',
      '.pdxlp-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));' +
        'gap:0.6rem;align-items:stretch;}',
      '.pdxlp-chip{display:flex;flex-direction:column;align-items:flex-start;gap:0.3rem;' +
        'text-align:left;cursor:pointer;width:100%;min-height:3rem;' +
        'padding:0.75rem 0.9rem;border-radius:0.85rem;' +
        'border:1px solid rgba(148,163,184,0.22);border-left:3px solid var(--lp,#94a3b8);' +
        'background:rgba(255,255,255,0.035);' +
        'transition:transform 0.2s ease,border-color 0.2s ease,background 0.2s ease;}',
      '.pdxlp-chip:hover{transform:translateY(-2px);background:rgba(255,255,255,0.07);' +
        'border-color:rgba(148,163,184,0.4);border-left-color:var(--lp,#94a3b8);}',
      '.pdxlp-chip:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}',
      '@media (prefers-reduced-motion:reduce){.pdxlp-chip{transition:none;}' +
        '.pdxlp-chip:hover{transform:none;}}',
      '.pdxlp-v-contradicts{--lp:#f87171;}',
      '.pdxlp-v-consistent{--lp:#4ade80;}',
      '.pdxlp-v-mixed{--lp:#fbbf24;}',
      '.pdxlp-stamp{display:inline-flex;align-items:center;gap:0.35rem;' +
        "font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:0.12em;" +
        'text-transform:uppercase;font-size:0.6rem;color:var(--lp,#94a3b8);}',
      ".pdxlp-who{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:0.02em;" +
        'color:#fff;display:inline-flex;align-items:center;gap:0.4rem;line-height:1.15;}',
      ".pdxlp-party{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.6rem;" +
        'letter-spacing:0.1em;color:var(--p,#94a3b8);border:1px solid currentColor;' +
        'border-radius:0.3rem;padding:0 0.25rem;line-height:1.35;}',
      ".pdxlp-issue{font-family:'Barlow',sans-serif;font-size:0.76rem;color:#cbd5e1;line-height:1.35;}",
      ".pdxlp-meta{font-family:'Barlow Condensed',sans-serif;font-size:0.68rem;" +
        'letter-spacing:0.08em;text-transform:uppercase;color:#7b8db0;}',
      ".pdxlp-go{margin-top:0.15rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;" +
        'font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:#9ec8ff;}',
      '@media (max-width:640px){#live-proof{padding:0 1rem;}' +
        '.pdxlp-row{grid-template-columns:1fr;}}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  })();

  // ── When to look again ─────────────────────────────────────────────────────
  // The record lands one member at a time. These are the same signals
  // hero-showcase.js and profile-card.js re-settle on, plus a couple of cheap
  // backstops for the case where no event ever arrives (offline, failing
  // endpoint, a member with no roll-call rows) — in which case draw() simply
  // keeps finding nothing and the strip stays hidden.
  function later() { try { draw(); } catch (e) {} }
  try {
    window.addEventListener('pdx-consistency-warm', later);
    window.addEventListener('pdx-voting-warm', later);
    document.addEventListener('pdx:data:acctSpotlight', later);
  } catch (e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', later);
  }
  [1200, 4000, 9000, 15000].forEach(function (ms) { setTimeout(later, ms); });
  later();
})();
