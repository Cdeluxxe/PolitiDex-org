/* ─────────────────────────────────────────────────────────────────────────────
   issue-file.js — the panel /i/<key> opens in
   ─────────────────────────────────────────────────────────────────────────────
   THE FILE HAD AN ADDRESS AND NO STAGE.

   pdx-issue-profile.js gave the child ledger a citation: /i/lands_preserve
   resolves the key, commits the same pick a chip tap commits, warms the same
   record and paints the same census. What it did not have was a DESTINATION. The
   arrival went through window.pdxDoor1Issue and stopped there, and
   pdxDoor1Issue's job is to paint the desk — so a reader who followed a citation
   landed on the homepage: the hero first ("Live from the record"), the whole of
   Door 1's chrome next ("One desk…", the four ways in, the core shelf), the
   ledger they were sent to somewhere below the fold, and a "Next in Door 1"
   footer under it. /p/<pid> does not do that. It hides the homepage and opens a
   file. This module is that stage for /i/.

   WHAT IT IS NOT
     It is NOT a second ledger. There is exactly one builder for an issue's
     census, bands and measures — door1-workspace.js's issueProfileHtml, exported
     as PDXDoor1.issueProfile and delegated by PDXIssueProfile.html — and this
     file calls it and mounts the string it returns. Unmodified: the ledger host
     below holds html(key) and nothing else, which is what lets a test assert
     BYTE EQUALITY between what the panel shows and what the builder returns. No
     count, no order, no band, no percentage and no party token is computed,
     re-ordered or re-worded here. Search this file: there is no arithmetic in it.

   WHAT THE CHROME AROUND IT MAY SAY
     The person file's answer, in the issue file's words. Four things, all of them
     identity, none of them a finding:
       · the surface and its citable address — "Issue file · /i/lands_preserve",
         the pf-kick line's own idea;
       · the issue's label, which is the letterhead;
       · the ⓘ that opens what the key covers — and ONLY when issue-scope.js
         already holds prose for it, because controlHtml() answers '' otherwise
         and a control that explains nothing is worse than no control;
       · the crumb, core → child, as a caption. The LIVE crumb (the one whose
         core half opens the bundle on the desk) is the ledger's own and is
         printed above the census in the body; this one is text, because a file
         should say where it is filed without offering to leave.
     A figure in this bar would outrank the census two lines under it, which is
     the same reason person-file.js's kicker carries no Direction Match.

   THE BAR WEARS THE FAMILY'S COLOUR, FROM THE ONE PALETTE
     A child chip on Door 1's shelf is already painted in its family's hue, and
     following that chip's own citation used to land the reader on a bar in the
     desk's generic blue — the same file, in a different livery, which reads as a
     different surface. So the identity block asks PDXIssueColors.skin(key) for
     the treatment, exactly as the shelf does: `data-ic` plus the four --pdx-ic*
     custom properties, and the family table (PDXIssueFamily.coreOf) handed in as
     the lookup so the file's hue and the chip's hue come off ONE read and cannot
     drift apart. skin() answers an empty attribute for a key that lands on no
     Core National Issue, and an empty attribute is the whole fallback: with no
     `data-ic` on the block, every rule in issue-file.css keyed to it drops out
     and the bar is the chrome it has always been. No hex is authored in this
     module or its stylesheet — a colour on this bar came from issue-colors.js or
     it is not a family colour.

   THE DESK IS STILL PAINTED, BEHIND IT
     Deliberately. The arrival commits through pdxDoor1Issue, so the desk holds
     the same pick and paints the same ledger — which is what makes "the numbers
     at /i/<key>" and "the numbers on the desk" the same numbers by construction
     rather than by agreement. What changed is only which of the two the reader is
     looking at when they arrive by address. A chip tap on / still opens the desk
     in place and is untouched: that is a VIEW of the file, and the desk is where
     views live.

   ONE WAY OUT, THE PERSON FILE'S WAY
     Close is the X, Escape, or the backdrop — and it hands the address back to
     PDXIssueProfile.restore(), which owns the bar for /i/ exactly as
     person-file.js owns it for /p/. This module never writes location itself.

   Z-ORDER, ON PURPOSE
     50, inserted before #modal-overlay. The number clears the homepage's own
     fixed z-50 top nav, which at 49 would float over a file reached by citation.
     The position settles the tie with the person modal, which is also 50: a row
     in this ledger opens a person file, and that file has to land on top of this
     one and reveal it again on close. Every floating rail on the page (45, 47,
     48) stays under both.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueFile) return;

  var ID = 'pdx-issue-file';
  var ID_CHROME = 'pdx-issue-file-chrome';
  var ID_LEDGER = 'pdx-issue-file-ledger';
  var ID_TITLE = 'pdx-issue-file-title';
  var ARROW = ' → ';

  function fn(x) { return typeof x === 'function'; }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function desk() { return window.PDXDoor1 || null; }
  function addr() { return window.PDXIssueProfile || null; }
  function family() { return window.PDXIssueFamily || null; }
  function colors() {
    var C = window.PDXIssueColors;
    return (C && fn(C.skin) && fn(C.styleFor)) ? C : null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  // ── THE ONE LEDGER PAINT ──────────────────────────────────────────────────
  // The address module first, because that is the published door for this string
  // and asking it keeps one caller between this file and the desk. The desk
  // itself is the fallback for a document that somehow has the builder and not
  // the address module. '' means "no single ledger lives at this address" — a
  // bundle key, or no builder on the page — and it is passed straight through as
  // a refusal to open rather than turned into an empty file.
  function ledger(key) {
    var A = addr();
    if (A && fn(A.html)) {
      try {
        var body = A.html(key);
        if (body) return body;
      } catch (e) {}
    }
    var D = desk();
    if (D && fn(D.issueProfile)) {
      try { return D.issueProfile(key) || ''; } catch (e) {}
    }
    return '';
  }

  // ── The chrome's four strings, each from its existing owner ───────────────
  function labelOf(key) {
    var D = desk();
    try { if (D && fn(D.issueLabelFor)) return D.issueLabelFor(key) || key; } catch (e) {}
    return key;
  }
  function crumbOf(key) {
    var F = family();
    if (!F || !fn(F.crumb)) return null;
    try {
      var c = F.crumb(key);
      return (c && c.coreLabel) ? c : null;
    } catch (e) { return null; }
  }
  function arrow() {
    var F = family();
    try { if (F && F.ARROW) return String(F.ARROW); } catch (e) {}
    return ARROW;
  }
  function pathOf(key) {
    var A = addr();
    if (!A || !fn(A.path)) return '';
    try { return A.path(key) || ''; } catch (e) { return ''; }
  }
  // ⓘ, and only where there is something behind it. issue-scope.js answers ''
  // for a key it holds no prose for, which is the whole condition.
  function scopeControl(key) {
    var S = window.PDXIssueScope;
    if (!S || !fn(S.controlHtml)) return '';
    try { return S.controlHtml(key) || ''; } catch (e) { return ''; }
  }

  // ── The family's colour, off the one palette ──────────────────────────────
  // The lookup Door 1 hands the palette for a chip, spelled the same way: a
  // function over PDXIssueFamily.coreOf. undefined when the family table is not
  // on the page, which is not a failure — the palette then falls back to its own
  // globals (window.coreIssueForKey, CORE_NATIONAL_ISSUES) and usually resolves
  // the key anyway.
  function familyLookup() {
    var F = family();
    if (!F || !fn(F.coreOf)) return undefined;
    return function (k) { try { return F.coreOf(k) || ''; } catch (e) { return ''; } };
  }
  // ' data-ic="on" style="--pdx-ic:…"' for a key that lands on a Core National
  // Issue, and '' for every other case — no palette on the page, no resolution,
  // a throw. '' is the fallback the stylesheet is written around: nothing to hook
  // means the bar keeps the chrome it had before the treatment existed.
  function skinAttr(key) {
    var C = colors();
    if (!C || !key) return '';
    try { return (C.skin(key, familyLookup()) || {}).attr || ''; } catch (e) { return ''; }
  }

  function chromeHtml(key) {
    var p = pathOf(key);
    var c = crumbOf(key);
    // ONE ELEMENT CARRIES THE TREATMENT. The four properties are set on the
    // identity block and inherited by the title, the crumb and the rail beside
    // them, so there is exactly one place in this file where a hue is applied
    // and exactly one attribute a test has to read.
    return '<div class="pdxif-bar"' + skinAttr(key) + '>' +
        '<p class="pdxif-kick">' +
          '<span class="pdxif-kick-what">Issue file</span>' +
          (p ? '<a class="pdxif-kick-addr" href="' + esc(p) + '">' + esc(p) + '</a>' : '') +
        '</p>' +
        '<h2 class="pdxif-title" id="' + ID_TITLE + '">' +
          '<span class="pdxif-name">' + esc(labelOf(key)) + '</span>' +
          scopeControl(key) +
        '</h2>' +
        (c
          ? '<p class="pdxif-crumb">' +
              '<span class="pdxif-core">' + esc(c.coreLabel) + '</span>' +
              '<span class="pdxif-arrow" aria-hidden="true">' + esc(arrow()) + '</span>' +
              '<span class="pdxif-child">' + esc(c.childLabel) + '</span>' +
            '</p>'
          : '') +
      '</div>';
  }

  // ── The stage ─────────────────────────────────────────────────────────────
  // Built once, from real elements rather than one innerHTML, for two reasons:
  // the close control keeps its own listener across a chrome repaint (it is a
  // SIBLING of the identity block, not inside it), and the ledger host is a node
  // this module can hand exactly one string to.
  var _key = '';
  var _open = false;
  var _built = false;

  function build() {
    if (_built) return el(ID);
    var d;
    try { d = document; } catch (e) { return null; }
    if (!d || !fn(d.createElement) || !d.body) return null;

    var overlay = d.createElement('div');
    overlay.id = ID;
    overlay.className = 'pdxif';
    overlay.hidden = true;
    try {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', ID_TITLE);
      overlay.setAttribute('aria-hidden', 'true');
    } catch (e) {}
    try { overlay.style.display = 'none'; } catch (e) {}

    var panel = d.createElement('div');
    panel.className = 'pdxif-panel';

    var top = d.createElement('div');
    top.className = 'pdxif-top';

    var idHost = d.createElement('div');
    idHost.id = ID_CHROME;
    idHost.className = 'pdxif-id';

    var x = d.createElement('button');
    x.className = 'pdxif-x';
    try {
      x.setAttribute('type', 'button');
      x.setAttribute('aria-label', 'Close the issue file');
      x.setAttribute('title', 'Close');
    } catch (e) {}
    try {
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    } catch (e) {}
    try { x.addEventListener('click', function () { close(); }); } catch (e) {}

    var body = d.createElement('div');
    body.className = 'pdxif-body';

    var led = d.createElement('div');
    led.id = ID_LEDGER;
    led.className = 'pdxif-led';

    try { body.appendChild(led); } catch (e) {}
    try { top.appendChild(idHost); top.appendChild(x); } catch (e) {}
    try { panel.appendChild(top); panel.appendChild(body); } catch (e) {}
    try { overlay.appendChild(panel); } catch (e) {}
    // WHERE IN THE DOCUMENT, AND WHY IT IS NOT THE END OF IT. This panel and the
    // person modal are both z-index 50, so the one that wins is the one that
    // comes later in <body>. Appending would make that this panel — and a person
    // opened from a row INSIDE this file would then open underneath the file it
    // was opened from. Inserting immediately before #modal-overlay gives the
    // reader the only order that reads: the homepage's fixed nav is covered, the
    // issue file covers it, and a person lands on top of both. Appended at the
    // end only when that overlay is not on the page at all.
    try {
      var host = el('modal-overlay');
      if (host && host.parentNode === d.body && fn(d.body.insertBefore)) {
        d.body.insertBefore(overlay, host);
      } else {
        d.body.appendChild(overlay);
      }
    } catch (e) {
      try { d.body.appendChild(overlay); } catch (e2) { return null; }
    }
    if (!el(ID)) return null;

    // The backdrop, and only the backdrop. A click that started inside the panel
    // must not close the file it is in.
    try {
      overlay.addEventListener('click', function (ev) {
        if (ev && ev.target === overlay) close();
      });
    } catch (e) {}

    _built = true;
    return overlay;
  }

  // ── Open ──────────────────────────────────────────────────────────────────
  // Answers false rather than opening an empty file: a bundle key has no single
  // ledger (its member keys are the records, and which one a reader meant is
  // theirs to say on the desk's sub-key shelf), and a document with no builder on
  // it has nothing to show. Both are the caller's cue to fall back to the desk,
  // which is what pdx-issue-profile.js does with the answer.
  function open(key) {
    var k = String(key == null ? '' : key).trim();
    if (!k) return false;
    var body = ledger(k);
    if (!body) return false;
    var overlay = build();
    if (!overlay) return false;
    var host = el(ID_LEDGER);
    if (!host) return false;

    var idHost = el(ID_CHROME);
    if (idHost) { try { idHost.innerHTML = chromeHtml(k); } catch (e) {} }
    // THE BODY IS THE BUILDER'S STRING AND NOTHING ELSE. Every piece of chrome
    // this module adds is outside this node.
    try { host.innerHTML = body; } catch (e) { return false; }

    _key = k;
    _open = true;
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try {
      overlay.style.setProperty('display', 'flex', 'important');
    } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
    // The page under the file does not scroll while the file is over it — the
    // same lock openModal takes for a person, plus a watch on the one thing that
    // gives it back while this file is still open (see watchModal).
    lock();
    watchModal();
    // A file opens at its top. A second file opened out of the first would
    // otherwise start halfway down the previous one's bands.
    try {
      var scroller = overlay.querySelector ? overlay.querySelector('.pdxif-body') : null;
      if (scroller) scroller.scrollTop = 0;
    } catch (e) {}
    return true;
  }

  // ── RAISING A FILE THAT IS ALREADY OPEN ───────────────────────────────────
  // A reader can ask for a file they are already looking at: the Eye's leaf row
  // tapped from /i/<key>, or tapped twice. Answering "already open" with nothing
  // is indistinguishable from a broken row, so the file is RAISED instead — the
  // display and aria state re-asserted (a surface that hid this overlay without
  // closing it is exactly the case that reads as a dead tap), and the keyboard
  // put inside the panel rather than left wherever the tap came from, which is
  // what makes the raise reach a reader who is not looking at the screen.
  //
  // Nothing is repainted and nothing scrolls back to the top: the ledger under
  // this chrome is where the reader left it, and losing their place would be a
  // worse answer than none. Answers false when there is no open file to raise,
  // so a caller can tell a raise from an open.
  function focus() {
    if (!_open) return false;
    var overlay = el(ID);
    if (!overlay) return false;
    try { overlay.hidden = false; } catch (e) {}
    try { overlay.setAttribute('aria-hidden', 'false'); } catch (e) {}
    try {
      overlay.style.setProperty('display', 'flex', 'important');
    } catch (e) {
      try { overlay.style.display = 'flex'; } catch (e2) {}
    }
    lock();
    // The panel itself, not the close button: focusing the one control in this
    // chrome would put Escape and Enter on "dismiss the thing you just asked
    // for". tabindex is set here rather than in build() because it exists for
    // this call and nothing else.
    try {
      var panel = overlay.querySelector ? overlay.querySelector('.pdxif-panel') : null;
      if (panel) {
        try { panel.setAttribute('tabindex', '-1'); } catch (e) {}
        if (fn(panel.focus)) panel.focus();
      }
    } catch (e) {}
    return true;
  }

  // ── THE LOCK, AND THE ONE THING THAT DROPS IT ─────────────────────────────
  // A ledger row opens a person, and the person file is the modal that has
  // always owned this page: it takes the same body lock on open and CLEARS it on
  // close, because until now nothing else could be underneath it. Opened from
  // inside an issue file, that close would hand the homepage its scroll back
  // while the file is still over it — so the reader's next wheel gesture moves a
  // page they cannot see and the file closes onto somewhere else entirely.
  //
  // The fix is watched rather than negotiated: closeModal is not edited, and this
  // module does not ask it to behave differently. The person overlay's own
  // display attribute is the signal, and the lock is simply re-taken when it goes
  // away. Nothing here reads, paints or closes the person file; it only notices
  // that the page beneath THIS file became scrollable and says no again.
  function lock() {
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  var _watch = null;
  function watchModal() {
    if (_watch) return;
    var M = window.MutationObserver;
    if (!fn(M)) return;
    var over = el('modal-overlay');
    if (!over) return;
    try {
      _watch = new M(function () {
        if (!_open) return;
        try {
          if (document.body && document.body.style.overflow !== 'hidden') lock();
        } catch (e) {}
      });
      _watch.observe(over, { attributes: true, attributeFilter: ['style', 'class'] });
    } catch (e) { _watch = null; }
  }
  function unwatchModal() {
    if (!_watch) return;
    try { _watch.disconnect(); } catch (e) {}
    _watch = null;
  }

  // ── Repaint ───────────────────────────────────────────────────────────────
  // The ledger's roll-call read arrives in batches and fires 'pdx-issue-votes'
  // per batch; the desk re-syncs on it. So does this panel, through the same one
  // builder — otherwise a cold arrival would sit on the census the first batch
  // could see while the desk behind it counted the rest.
  function repaint() {
    if (!_open || !_key) return false;
    var body = ledger(_key);
    if (!body) return false;
    var host = el(ID_LEDGER);
    if (!host) return false;
    try { host.innerHTML = body; } catch (e) { return false; }
    return true;
  }

  // ── Close ─────────────────────────────────────────────────────────────────
  // opts.keepAddress: the bar has already moved (a back/forward pop off /i/), so
  // restoring it would fight the reader's own navigation. Every other close hands
  // the address back to the module that took it.
  function close(opts) {
    opts = opts || {};
    var overlay = el(ID);
    if (overlay) {
      try { overlay.hidden = true; } catch (e) {}
      try { overlay.setAttribute('aria-hidden', 'true'); } catch (e) {}
      try {
        overlay.style.setProperty('display', 'none', 'important');
      } catch (e) {
        try { overlay.style.display = 'none'; } catch (e2) {}
      }
    }
    // The ledger is dropped rather than left behind a hidden overlay: it is a
    // reading of a record that keeps arriving, and a stale one flashing up under
    // the next open is a worse first paint than an empty node.
    var host = el(ID_LEDGER);
    if (host) { try { host.innerHTML = ''; } catch (e) {} }
    _key = '';
    _open = false;
    unwatchModal();
    try { document.body.style.overflow = ''; } catch (e) {}
    if (!opts.keepAddress) {
      var A = addr();
      try { if (A && fn(A.restore)) A.restore(); } catch (e) {}
    }
    return true;
  }

  // ── The keyboard, and the batches ─────────────────────────────────────────
  try {
    document.addEventListener('keydown', function (ev) {
      if (!_open || !ev) return;
      var k = ev.key || '';
      if (k !== 'Escape' && k !== 'Esc') return;
      // A popover inside the file owns Escape first — issue-scope.js's own card
      // is opened from this chrome, and closing the whole file out from under it
      // would take two surfaces down with one key. The card is READ, not closed
      // here: issue-scope.js binds its own Escape when the ⓘ is first built,
      // which is after this listener, so it closes its card on the same keypress
      // this one declines to act on.
      try {
        var card = el('pdxis-card');
        if (card && card.hidden === false) return;
      } catch (e) {}
      close();
    }, false);
  } catch (e) {}

  try { window.addEventListener('pdx-issue-votes', function () { repaint(); }); } catch (e) {}

  window.PDXIssueFile = {
    ID: ID,
    ID_CHROME: ID_CHROME,
    ID_LEDGER: ID_LEDGER,
    ID_TITLE: ID_TITLE,
    open: open,
    focus: focus,
    close: close,
    repaint: repaint,
    isOpen: function () { return !!_open; },
    key: function () { return _key; },
    // The chrome's markup, published for the same reason issue-scope.js publishes
    // cardHtml: the copy in it is part of the deliverable, and a test that can
    // only reach it through a real overlay is a test that does not read the copy.
    _chrome: chromeHtml,
    // The bar's treatment on its own, so a test can compare the token this file
    // would print against PDXIssueColors.styleFor(key) without parsing markup.
    _skin: function (key) {
      var C = colors();
      if (!C || !key) return { on: false, style: '', attr: '' };
      try { return C.skin(key, familyLookup()) || { on: false, style: '', attr: '' }; }
      catch (e) { return { on: false, style: '', attr: '' }; }
    },
    _relock: lock,
    _ledger: ledger,
    _node: function () { return el(ID); }
  };
})();
