/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE DOOR TO /me
   ─────────────────────────────────────────────────────────────────────────────

   WHAT WAS REPORTED. On a phone, a tap on anything that opens /me did nothing
   visible until the desk painted, which was long enough to read as frozen. The
   gap had no state: no pressed control, no words, nothing.

   WHAT THIS DOES. It is the one owner of "a control that opens /me answers the
   tap". Every such control on the site is a plain <a href="/me…"> — the account
   chip (compare-hub.js on the front page, shell-account-chip.js everywhere
   else), the mobile menu row, Who Represents Me's "Your file", the workspace
   card, the studio's "Your file" — so one delegated listener covers all of them
   and none of them needed an edit:

     pointerdown  the control takes a PRESSED state at once (.pdx-me-pressed).
     click        the control stays pressed and goes busy (.pdx-me-opening,
                  aria-busy), and ONE LINE appears at the top of the screen:
                  "Opening your desk…". A line with words in it, not a bare
                  spinner, and not a second page — the navigation is still the
                  anchor's own, so Back, cmd-click and middle-click are exactly
                  what they were.
     a second tap while it is opening is swallowed: one tap, one load.
     on /me itself a tap on a control to /me opens no load at all — the desk is
                  already open. A ?tab= scrolls to that region (the desk's own
                  goTab); a bare /me goes to the top. A same-page #fragment is
                  left to the browser, which never loads for one.

   WHAT IT DOES NOT DO. It does not navigate for an anchor (the browser does),
   it does not prefetch, it reads no store and no session, and it never blocks a
   modified click. If the trip stalls or is cancelled the state clears itself,
   and a Back into a cached page (pageshow) clears it too, so a reader is never
   left looking at "Opening your desk…" over a page they are standing on.

   window.PDXMeDoor.open(href) is the same thing for an opener that is not an
   anchor: it marks the trip, assigns once, and swallows a repeat.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';
  if (window.PDXMeDoor) return;

  var LINE = 'Opening your desk…';
  var LINE_ID = 'pdx-me-door-line';
  var STYLE_ID = 'pdx-me-door-style';
  // A trip that has not left the page by now was stopped, failed, or was a
  // download; release the latch and take the line down rather than leave it.
  var STALL_MS = 15000;

  var _opening = false;
  var _control = null;
  var _pressed = null;
  var _stall = null;

  function isMePath(p) { return p === '/me' || p === '/me/'; }
  function onDesk() {
    try { return !!window.__PDX_ME_DOC || isMePath(location.pathname); } catch (e) { return false; }
  }

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      'a.pdx-me-pressed,a.pdx-me-opening{opacity:.72;transform:scale(.97);transition:transform .08s ease,opacity .08s ease;}' +
      'a.pdx-me-opening{cursor:progress;}' +
      '#' + LINE_ID + '{position:fixed;left:0;right:0;top:0;z-index:2147483000;margin:0;' +
        'padding:calc(env(safe-area-inset-top,0px) + .55rem) 1rem .55rem;' +
        'background:#0a0f1e;color:#fff7dc;border-bottom:1px solid rgba(245,200,66,.55);' +
        "font:600 .95rem/1.2 'Barlow',system-ui,sans-serif;letter-spacing:.01em;text-align:center;" +
        'box-shadow:0 6px 18px rgba(0,0,0,.35);pointer-events:none;}' +
      '#' + LINE_ID + '::after{content:"";position:absolute;left:0;bottom:-1px;height:2px;width:40%;' +
        'background:#f5c842;animation:pdx-me-door-run 1.1s ease-in-out infinite;}' +
      '@keyframes pdx-me-door-run{0%{transform:translateX(-100%);}100%{transform:translateX(250%);}}' +
      '@media (prefers-reduced-motion:reduce){a.pdx-me-pressed,a.pdx-me-opening{transform:none;transition:none;}' +
        '#' + LINE_ID + '::after{animation:none;width:100%;opacity:.6;}}';
    (document.head || document.documentElement).appendChild(s);
  }

  // The anchor a tap landed on, when it opens /me on this origin in this tab.
  function deskLink(t) {
    var a = (t && t.closest) ? t.closest('a[href]') : null;
    if (!a) return null;
    var tgt = a.getAttribute('target');
    if (tgt && tgt !== '_self') return null;
    if (a.hasAttribute('download')) return null;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !isMePath(u.pathname)) return null;
    return { a: a, url: u };
  }

  function unpress() {
    if (_pressed && _pressed !== _control) {
      try { _pressed.classList.remove('pdx-me-pressed'); } catch (e) {}
    }
    _pressed = null;
  }

  function showLine() {
    css();
    var p = document.getElementById(LINE_ID);
    if (!p) {
      p = document.createElement('p');
      p.id = LINE_ID;
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      (document.body || document.documentElement).appendChild(p);
    }
    p.textContent = LINE;
  }

  function clear() {
    _opening = false;
    if (_stall) { clearTimeout(_stall); _stall = null; }
    if (_control) {
      try {
        _control.classList.remove('pdx-me-opening', 'pdx-me-pressed');
        _control.removeAttribute('aria-busy');
      } catch (e) {}
    }
    _control = null;
    unpress();
    var p = document.getElementById(LINE_ID);
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }

  // Marks the trip. Returns false when one is already under way, which is the
  // caller's cue not to start a second load.
  function begin(control) {
    if (_opening) return false;
    _opening = true;
    _control = control || null;
    if (_control) {
      try {
        css();
        _control.classList.add('pdx-me-pressed', 'pdx-me-opening');
        _control.setAttribute('aria-busy', 'true');
      } catch (e) {}
    }
    showLine();
    _stall = setTimeout(clear, STALL_MS);
    return true;
  }

  // On /me: the desk is already open, so nothing loads. Returns true when the
  // tap was answered here.
  function onDeskTap(url) {
    var here = location.pathname + location.search;
    if (url.hash && (url.pathname + url.search) === here) return false;   // the browser's own scroll
    try {
      var D = window.PDXMeDesk;
      var t = (D && typeof D.tabOf === 'function') ? D.tabOf(url.search) : '';
      if (t && D.goTab(t)) return true;
    } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e2) {}
    return true;
  }

  function open(href) {
    var to = String(href || '/me');
    if (onDesk()) {
      var u;
      try { u = new URL(to, location.href); } catch (e) { u = null; }
      if (u && onDeskTap(u)) return true;
    }
    if (!begin(null)) return true;
    try { location.assign(to); } catch (e) { try { location.href = to; } catch (e2) { clear(); return false; } }
    return true;
  }

  // ── THE TAP ───────────────────────────────────────────────────────────────
  try {
    document.addEventListener('pointerdown', function (ev) {
      if (_opening || !ev || (ev.button && ev.button !== 0)) return;
      var hit = deskLink(ev.target);
      if (!hit) return;
      unpress();
      css();
      _pressed = hit.a;
      try { hit.a.classList.add('pdx-me-pressed'); } catch (e) {}
    }, true);
    // A scroll that began on the control, or a press dragged off it, is not a tap.
    document.addEventListener('pointercancel', unpress, true);
    document.addEventListener('pointerup', function () {
      // The click (if any) follows pointerup in the same turn; let it claim the
      // control before the press is released.
      setTimeout(function () { if (!_opening) unpress(); }, 0);
    }, true);

    // BUBBLE PHASE, so any handler that claims the click first (and calls
    // preventDefault) is honoured — the mobile menu's own onclick only closes
    // the sheet and claims nothing.
    document.addEventListener('click', function (ev) {
      if (!ev || ev.defaultPrevented) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
      var hit = deskLink(ev.target);
      if (!hit) return;
      if (onDesk()) {
        if (onDeskTap(hit.url)) { ev.preventDefault(); unpress(); }
        return;
      }
      // One tap, one load.
      if (!begin(hit.a)) { ev.preventDefault(); return; }
      // The browser navigates on the anchor's own href from here.
    }, false);

    // Back into this page from the bfcache: it is not opening anything now.
    window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) clear(); });
  } catch (e) {}

  window.PDXMeDoor = { LINE: LINE, open: open, isOpening: function () { return _opening; }, clear: clear };
})();
