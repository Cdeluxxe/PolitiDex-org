/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE INNER SHELL'S ACCOUNT CHIP
   ─────────────────────────────────────────────────────────────────────────────

   WHY THIS FILE EXISTS

   /mandate, /voice and /money are their own documents, and each of them wants
   the one piece of chrome a reader looks for before anything else: whether they
   are signed in. The front page's version of that chip lives inside
   compare-hub.js — 758 KB of homepage engine — so loading it here to paint one
   pill would undo the entire point of the addresses.

   So this is the SMALL owner of the same contract, and there is exactly one of
   it: three shells load this file rather than each carrying its own inline
   painter. A second painter per document is three answers to "am I signed in",
   and the whole reason these rooms moved is that one answer per question is
   cheaper than three.

   ── THE CONTRACT, WHICH IS compare-hub.js's CONTRACT ──────────────────────

   AUTH UNKNOWN IS NOT AUTH SIGNED-OUT. This is the rule the v208 pass was
   written to fix and it is the rule this file exists to keep at the new
   addresses. Three states, read from window.PDXAuth (published by
   firebase-boot.js):

     'unknown'  Firebase has not answered yet, which is the whole of a cold
                load behind a deferred 800 KB SDK. NO Join CTA. The quiet
                "Checking account…" pill, inert (no href, no handler,
                aria-disabled) — or, on a device that has painted a chip
                before, that reader's own label wearing the same caption.
                Nothing here claims anything about the reader that is not
                already true on this device.
     'in'       A real, non-anonymous account. The chip: the label, linked to
                /me, which is the one address that answers "my file".
     'out'      Firebase answered with null, or with the anonymous session the
                roster warm signs in. Join — and only now.

   AND THE ONE BOUND ON 'unknown'. If the SDK never lands at all — blocked,
   offline, a 404 on the compat bundle — "Checking account…" would sit there for
   the whole visit with no way to sign in. So on a device with NO remembered
   account, unknown falls to Join after a grace period; on a device that HAS one
   the disabled chip stays, because for that reader Join is the wrong claim no
   matter how long the wait is. Same bound, same six seconds, same reasoning as
   compare-hub.js's NAV_UNKNOWN_MS.

   ── WHAT THIS FILE IS NOT ALLOWED TO DO ───────────────────────────────────

     · NO SIGN-IN UI. The front page owns the auth modal. Join is a plain
       <a href="/">: a trip to the room that has it. That is the same answer
       your-file.js gives when no opener is on the document, and it works with
       JavaScript off, middle-clicks and cmd-clicks like every other link.
     · NO FIRESTORE READ, NO GRID, NO FAN-OUT. This paints a pill. The whole of
       test-account-chip-cost.mjs §1 is that updateNavAuth paints the chip and
       nothing else, and a small copy of the chip does not get a bigger budget.
     · NO WRITE TO pdx_last_account. compare-hub.js mints that label on the
       front page and firebase-boot.js's announcement is what causes it. This
       file READS it so a cold inner shell has something honest to show, and
       writes nothing — one writer, so a sign-out on the front page cannot leave
       a ghost these pages would keep repainting.
     · NO SECOND updateNavAuth. If the document already has one (it never
       should — these shells do not load compare-hub.js), this file stands down
       rather than shadowing it.

   THE MOUNT is #pdx-shell-acct, which each shell places at the end of its own
   bar. No mount, no paint: the courts.html contract.

   node scripts/test-shell-account-chip.mjs holds all of the above.
   ───────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var MOUNT_ID = 'pdx-shell-acct';
  var ACCT_KEY = 'pdx_last_account';
  var UNKNOWN_MS = 6000;

  var _unknownExpired = false;
  var _sig = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // The last identity this browser painted. A LABEL, not a credential: no
  // token, no email, and it authorises nothing — every read on the site is
  // still gated by the real Firebase session, and the chip it paints is inert
  // until that session arrives.
  function lastAccount() {
    try {
      if (typeof window.PDXLastAccount === 'function') return window.PDXLastAccount();
      var raw = localStorage.getItem(ACCT_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (o && o.uid) ? o : null;
    } catch (e) { return null; }
  }

  // An explicit state wins (firebase-boot passes one on every announcement);
  // otherwise read the published state, and only fall to 'out' when something
  // has actually said so.
  function stateOf(user, state) {
    if (state === 'unknown' || state === 'in' || state === 'out') return state;
    if (user && !user.isAnonymous) return 'in';
    var A = window.PDXAuth;
    if (A && !A.known) return 'unknown';
    return 'out';
  }

  function checkingHtml(label) {
    return '<span class="pdx-acct pdx-acct--wait" aria-live="polite" aria-disabled="true">' +
      '<span class="pdx-acct-dot" aria-hidden="true"></span>' +
      '<span class="pdx-acct-lb">' + (label ? esc(label) : 'Checking account&hellip;') + '</span>' +
      '</span>';
  }

  function chipHtml(label) {
    return '<a class="pdx-acct pdx-acct--in" href="/me" ' +
      'title="Your file — your positions, your starred issues, your ballot picks and your saved evidence">' +
      '<span class="pdx-acct-av" aria-hidden="true">' +
      esc(String(label || 'M').charAt(0).toUpperCase()) + '</span>' +
      '<span class="pdx-acct-lb">' + esc(label) + '</span></a>';
  }

  // Join is a trip to the front page, which owns the sign-in modal. The label
  // is the front page's own label, so a reader who has seen one has seen both.
  function joinHtml() {
    return '<a class="pdx-acct pdx-acct--join" href="/" ' +
      'title="Join the People — free. Sign-in opens on the front page.">' +
      '<span class="pdx-acct-lb">Join the People</span></a>';
  }

  function paint(user, state) {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    var st = stateOf(user, state);
    var last = (st === 'unknown') ? lastAccount() : null;
    // The bound: no remembered account and the wait has run out → give the
    // reader a control instead of a spinner.
    if (st === 'unknown' && !last && _unknownExpired) st = 'out';

    var label = '';
    if (st === 'in') {
      label = user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
    } else if (st === 'unknown' && last) {
      label = last.label || 'Member';
    }

    var sig = st + '|' + label;
    if (sig === _sig && mount.getAttribute('data-pdx-acct-sig') === sig) return;
    _sig = sig;
    try { mount.setAttribute('data-pdx-acct-sig', sig); } catch (e) {}

    mount.innerHTML = (st === 'in') ? chipHtml(label)
      : (st === 'unknown') ? checkingHtml(label)
      : joinHtml();
  }

  // ── PUBLISH ───────────────────────────────────────────────────────────────
  // firebase-boot.js calls window.updateNavAuth(user, state) on every
  // announcement, and the inline auth stub on each shell calls it once with
  // (null, 'out') if the SDK never lands. Both arrive here.
  if (typeof window.updateNavAuth !== 'function') {
    window.updateNavAuth = paint;
  }
  window.PDXShellChip = { paint: paint, state: stateOf };

  function first() {
    var A = window.PDXAuth;
    paint((A && A.user) || null, (A && A.state) || 'unknown');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', first);
  else first();

  setTimeout(function () {
    _unknownExpired = true;
    var A = window.PDXAuth;
    if (!A || !A.known) { _sig = null; first(); }
  }, UNKNOWN_MS);
})();
