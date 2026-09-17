/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE MONEY ROOM (/money)  ·  re-homing, not re-rendering
   ─────────────────────────────────────────────────────────────────────────────

   WHY THIS FILE EXISTS

   Follow the Money's tracker came to /money as a VERBATIM COPY of the block
   index.html shipped: the same section markup, the same inline IIFE, the same
   hand-verified dollar figures, byte for byte, fenced by
   scripts/test-money-shell.mjs so the two copies could not drift.

   THE FIGURES ARE NOT A COPY ANY MORE. They are /ftm-data.js, loaded by this
   room, by the front page and by person.html — one owner, one edit, one answer
   about a person's money. The fence around the tracker is retired with the copy
   it fenced; the section MARKUP above is still index.html's, still byte-checked,
   because markup with one deliberate <h1> swap is a copy and should say so.
   scripts/test-finance-lane.mjs still holds the data seam shut, restated as what
   it always meant: a CLOSED, NAMED set of two files — /ftm-data.js defines the
   filings, finance-lane.js reads them, and no other shipped module can see them.

   WHICH LEAVES ONE PROBLEM, AND IT IS THIS FILE'S WHOLE REASON, UNCHANGED BY ANY
   OF THAT. Three of the controls in a money card are addressed to functions that
   only exist on the front page:

       openMediumModal(pid, event)   profiles-full.js — the person overlay
       showProfile(pid, event)       profiles-full.js — "View Full Profile →"
       window.pdxSharePolitician()   compare-hub.js  — the share glyph
       window._pdxCompareWith()      the Compare Hub — "⚖️ Compare funding"

   A button whose handler is not on the page is a control that lies: it looks
   live, it takes the click, and nothing happens. So this file RE-HOMES them for
   a standalone document rather than shipping 1.4 MB of homepage engine to make
   four onclick attributes true:

     · The card, and the "View Full Profile" button inside it, navigate to the
       person's real address — /p/<pid>, built by person-link.js, which is the
       one owner of "what is this person's URL" — and land on the money section
       that already exists there. A real navigation to a real page is a better
       answer than a modal anyway: it is bookmarkable, it is shareable, and it
       survives a reload.
     · The two controls with no standalone equivalent — the share glyph and
       Compare funding — are NOT PAINTED. Hidden, not faked and not silently
       inert: `hidden` plus `aria-hidden`, so a screen reader is not read a
       control that cannot act either. The front page still has both.

   BOTH GRIDS, ONE RULE. /money is one page with two blocks: campaign filings
   (what a campaign RAISED, rendered by /ftm-data.js into #ftm-grid) and wealth
   disclosures (what a person OWNS, rendered by wealth-lane.js into #wl-grid).
   They are two archives and two claims, and this file takes no position on
   either — but both write the same .dir-card markup with the same three
   homepage-only onclick attributes in it, so both get the same treatment from
   the same place. GRID_IDS below is that list. The wealth block arrived second
   and deliberately did NOT bring its own answer to "what happens when a money
   card is clicked"; a second implementation of that is exactly the thing one
   owner is for.

   IT REWRITES CONTROLS AND NOTHING ELSE. No figure, no composition, no bucket,
   no coverage count, no sentence and no colour on this page is produced here.
   Every one of those comes from /ftm-data.js (the filings), wealth-lane.js (the
   disclosures) or finance-lane.js (the vocabulary, the buckets, the coverage
   sentence, the theme tokens, `scored: false` and the NEVER_FEEDS wall). This
   file could be deleted and /money would still tell the truth — it would just
   have four controls that do nothing.

   THE TWO ADDRESSES IT ANSWERS

     /money?p=<pid>   A JUMP, NOT A SECOND PERSON FILE. Forwarded once, with
                      replace() rather than assign() so the reader's Back button
                      still goes where they came from, to /p/<pid>#money — the
                      money section on the person file that already owns it.
                      Nothing about a person is rendered here.
     /money#follow-the-money
                      The old front-page hash. A bookmark on #follow-the-money
                      used to be a scroll position on the homepage; anyone who
                      followed one after the split would have landed on a
                      fragment that no longer names anything. index.html
                      forwards that hash here, and this file clears it with
                      replaceState in ONE hop so the address bar settles on
                      /money rather than keeping a fragment that is now noise.

   NO SCORE, AND NOTHING HERE CAN MAKE ONE. No 0-100, no grass / mixed / big
   traffic light, no tier, no ramp, no ranking and no sort by dollars. The lane
   publishes `scored: false`; this file reads no figure at all.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // BOTH GRIDS ON THE PAGE, NOT JUST THE FILINGS ONE. /money is one page with
  // two blocks — campaign filings above, wealth disclosures below — and both
  // write .dir-card markup addressing the same three homepage-only functions.
  // The wealth block arrived second; it did NOT arrive with its own answer to
  // "what happens when a money card is clicked", because one owner for that is
  // the whole point of this file. A grid id that is not on the document is
  // skipped, so this list is also the list of documents this file is safe on.
  var GRID_IDS = ['ftm-grid', 'wl-grid'];
  var COVERAGE_ID = 'pdx-money-coverage';

  // The person-file alias for the money section. person-file.js owns the map
  // from alias to element id (SECTION_HASH); this file only spells the alias,
  // so the day that section is renamed there is one place to change.
  var MONEY_HASH = '#money';

  // The front-page fragment this room replaced.
  var OLD_HASH = '#follow-the-money';

  function fn(f) { return typeof f === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }

  function personHref(pid) {
    try {
      var L = window.PDXPersonLink;
      if (L && fn(L.href)) return L.href(pid) || '';
    } catch (e) {}
    return '';
  }

  // ── /money?p=<pid> → the person file's money section ──────────────────────
  // Done before anything paints, and with replace() so this document never
  // becomes a step in the reader's history. A pid person-link.js cannot place
  // is not forwarded anywhere: the reader stays on /money, which is a real page
  // about the lane, rather than being sent to a 404 built out of their typo.
  function forwardPerson() {
    var raw = '';
    try {
      var m = /[?&]p=([^&]+)/.exec(location.search || '');
      raw = m ? decodeURIComponent(m[1]) : '';
    } catch (e) { raw = ''; }
    if (!raw) return false;
    var href = personHref(raw);
    if (!href) return false;
    try { location.replace(href + MONEY_HASH); } catch (e) { return false; }
    return true;
  }

  // ── The old front-page hash, cleared in one hop ───────────────────────────
  function clearOldHash() {
    try {
      if (String(location.hash || '').toLowerCase() !== OLD_HASH) return;
      if (!history || !fn(history.replaceState)) return;
      history.replaceState(null, '', location.pathname + (location.search || ''));
    } catch (e) {}
  }

  // ── COVERAGE, BORROWED WHOLE ──────────────────────────────────────────────
  // finance-lane.js's coverageHtml() is the one owner of the sentence AND of the
  // two counts inside it. This function decides nothing about coverage; it finds
  // the host and asks. Repainted on a bounded schedule because the denominator
  // is the roster, and the roster arrives with firebase-boot.js — "13 filings on
  // file" is what the lane prints until it lands, which is true, rather than a
  // placeholder "13 of 0".
  var _covSig = '';
  function paintCoverage() {
    var host = el(COVERAGE_ID);
    if (!host) return;
    var L = null;
    try { L = window.PDXFinanceLane || null; } catch (e) { L = null; }
    if (!L || !fn(L.coverageHtml)) return;
    var out = '';
    try { out = L.coverageHtml() || ''; } catch (e) { out = ''; }
    if (!out || out === _covSig) return;
    try { host.innerHTML = out; _covSig = out; } catch (e) {}
  }

  // ── RE-HOMING THE CARD CONTROLS ───────────────────────────────────────────
  // The pid comes off the onclick attribute the copied renderer wrote, which is
  // the only place on this document it exists — and it is read with a narrow
  // pattern and then handed to person-link.js, which re-canonicalises it, so a
  // string off an attribute never becomes a path on its own authority.
  var PID_IN_CALL = /^\s*(?:openMediumModal|showProfile)\(\s*'([^']+)'/;

  function pidFromAttr(node) {
    try {
      var a = node.getAttribute('onclick') || '';
      var m = PID_IN_CALL.exec(a);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  function goTo(href) {
    try { location.assign(href); } catch (e) {}
  }

  // One card: its own click, its View Full Profile button, and the two controls
  // that are not painted here. Idempotent — marked when done, so the observer
  // below can run over a grid that is half re-rendered without doubling
  // listeners.
  function rehomeCard(card) {
    if (!card || card.getAttribute('data-pdx-money-rehomed') === '1') return;
    var pid = pidFromAttr(card);
    var href = pid ? personHref(pid) : '';

    // THE CARD. onclick is REMOVED rather than overwritten: leaving the
    // attribute in place and adding a listener means a browser that fires the
    // attribute handler first still throws a ReferenceError into the console on
    // every click.
    try { card.removeAttribute('onclick'); } catch (e) {}
    if (href) {
      card.setAttribute('data-pdx-money-href', href + MONEY_HASH);
      card.style.cursor = 'pointer';
    } else {
      // No address we can defend means no click target. The card still shows
      // everything it showed before; it is just not pretending to be a door.
      card.style.cursor = 'default';
    }

    // The buttons inside it.
    var btns = [];
    try { btns = card.querySelectorAll('button, .pdx-act-share, .pdx-fund-cmp'); } catch (e) { btns = []; }
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var oc = '';
      try { oc = b.getAttribute('onclick') || ''; } catch (e) { oc = ''; }

      if (/pdxSharePolitician|_pdxCompareWith/.test(oc)) {
        // No standalone equivalent on this document. Hidden for both the eye and
        // the screen reader, and the attribute goes with it.
        try {
          b.removeAttribute('onclick');
          b.hidden = true;
          b.setAttribute('aria-hidden', 'true');
          b.setAttribute('tabindex', '-1');
        } catch (e) {}
        continue;
      }

      if (/showProfile|openMediumModal/.test(oc)) {
        var bp = pidFromAttr(b) || pid;
        var bh = bp ? personHref(bp) : '';
        try { b.removeAttribute('onclick'); } catch (e) {}
        if (bh) {
          b.setAttribute('data-pdx-money-href', bh + MONEY_HASH);
        } else {
          try { b.hidden = true; b.setAttribute('aria-hidden', 'true'); } catch (e) {}
        }
      }
    }

    try { card.setAttribute('data-pdx-money-rehomed', '1'); } catch (e) {}
  }

  function rehomeGrid() {
    for (var g = 0; g < GRID_IDS.length; g++) {
      var grid = el(GRID_IDS[g]);
      if (!grid) continue;
      var cards = [];
      try { cards = grid.querySelectorAll('.dir-card'); } catch (e) { cards = []; }
      for (var i = 0; i < cards.length; i++) rehomeCard(cards[i]);
    }
    // The composition block's Compare button is built by the same IIFE into the
    // per-person funding stage, which can be painted outside a card.
    var cmp = [];
    try { cmp = document.querySelectorAll('.pdx-fund-cmp'); } catch (e) { cmp = []; }
    for (var j = 0; j < cmp.length; j++) {
      try {
        cmp[j].removeAttribute('onclick');
        cmp[j].hidden = true;
        cmp[j].setAttribute('aria-hidden', 'true');
        cmp[j].setAttribute('tabindex', '-1');
      } catch (e) {}
    }
  }

  // ONE DELEGATED LISTENER for every re-homed target, rather than a closure per
  // card: the grid re-renders on every sector filter change, and per-node
  // listeners on a node set that is replaced wholesale is how a page starts
  // leaking them.
  function onClick(ev) {
    try {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey ||
          ev.shiftKey || ev.altKey) return;
      var n = ev.target;
      for (var hops = 0; n && hops < 8; hops++, n = n.parentNode) {
        if (!n.getAttribute) continue;
        // A real link inside a card — the OpenSecrets / FEC source line — wins.
        // Its own onclick already stops propagation; this is the second guard.
        if (n.tagName === 'A' && n.getAttribute('href')) return;
        var href = n.getAttribute('data-pdx-money-href');
        if (href) { ev.preventDefault(); goTo(href); return; }
      }
    } catch (e) {}
  }

  // Each grid is written by its own module at DOMContentLoaded and again on
  // every control change — the sector filter above, the tab and sort toggles
  // below — so the re-home has to run on each paint. One observer per grid is
  // cheaper and more certain than hooking two functions this file does not own.
  function watch() {
    if (!window.MutationObserver) return;
    for (var g = 0; g < GRID_IDS.length; g++) {
      var grid = el(GRID_IDS[g]);
      if (!grid) continue;
      try {
        new window.MutationObserver(function () { rehomeGrid(); })
          .observe(grid, { childList: true });
      } catch (e) {}
    }
  }

  var COV_TICKS = [0, 500, 1500, 3500, 6000];

  function boot() {
    clearOldHash();
    rehomeGrid();
    watch();
    for (var i = 0; i < COV_TICKS.length; i++) {
      setTimeout(function () { try { paintCoverage(); } catch (e) {} }, COV_TICKS[i]);
    }
    // One late sweep for a grid that paints after this file runs.
    setTimeout(function () { try { rehomeGrid(); } catch (e) {} }, 0);
    setTimeout(function () { try { rehomeGrid(); } catch (e) {} }, 800);
  }

  // The forward happens FIRST and synchronously. If it takes, nothing else on
  // this document needs to run.
  if (forwardPerson()) return;

  try { document.addEventListener('click', onClick, false); } catch (e) {}

  window.PDXMoneyRoom = {
    GRID_IDS: GRID_IDS,
    COVERAGE_ID: COVERAGE_ID,
    MONEY_HASH: MONEY_HASH,
    OLD_HASH: OLD_HASH,
    rehomeGrid: rehomeGrid,
    paintCoverage: paintCoverage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
