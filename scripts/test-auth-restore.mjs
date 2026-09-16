/* ═══════════════════════════════════════════════════════════════════════════
   test-auth-restore.mjs — a restored session must not look like a logout
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   Signing in with Google or with email, or simply coming back to /, froze the
   page — Chrome's "Page Unresponsive" dialog, mid sign-in. Walking from /me
   back to Home showed JOIN THE PEOPLE in the top bar for a long beat and then
   the account chip, as though the reader had been logged out and logged back
   in. A second click on the Google button produced auth/cancelled-popup-request
   in the modal, verbatim.

   THREE DEFECTS, ONE SHAPE. All of them are "the app treats not-knowing-yet as
   an answer":

     1. AUTH UNKNOWN WAS PAINTED AS SIGNED OUT. The pre-SDK stub in each shell
        answered every onAuthStateChanged registration with cb(null) during
        parse, and compare-hub.js — a plain sync script, so it runs BEFORE the
        deferred firebase-boot.js — reconciled the chip from that null. The Join
        CTA was therefore painted over a live session on every single load, and
        it was in the static markup of the slot as well, so it was the first
        frame too. There is now a third state: unknown is neither, it says so
        quietly, and signed-out is only ever the SDK's answer.

     2. ONE AUTH EVENT RAN A DOZEN SUBSCRIBERS IN ONE TASK. Firebase calls every
        onAuthStateChanged listener synchronously, in a single task, and this app
        registers about a dozen — the roster warm, the account pull, the local
        rehydrate (three grids, every heart on the page, a directory re-filter),
        the alignment stream, the like/dislike sweep, the me desk, the district
        room, the evidence locker, the admin gate. That is the freeze, and it
        landed on the sign-in click. There is now one real listener and a bus
        that hands every subscriber a task of its own.

     3. TWO POPUPS RACED. signInWithPopup cancels a popup already in flight and
        rejects the FIRST call with auth/cancelled-popup-request, so a double
        click failed the sign-in the reader actually wanted and then printed the
        SDK's code at them. The in-flight promise is now the lock.

   WHAT IS ASSERTED HERE

     1. First paint: no Join CTA and no signed-out copy anywhere in the shell's
        auth slots, and the stub does not answer for the SDK.
     2. A session arriving paints the chip, and paints nothing else on that task.
     3. One Google sign-in in flight at a time, and the button says so.
     4. No Firebase error code ever reaches the modal.
     5. CACHE_VERSION moved, because the shells did.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ auth-restore: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HUB = read('compare-hub.js');
const BOOT = read('firebase-boot.js');
const SW = read('sw.js');
const SHELLS = ['index.html', 'me.html', 'person.html', 'issue.html', 'evidence.html'];
const HTML = read('index.html');

// Brace-balanced source of a named function declaration.
const fnSrc = (src, name) => {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return '';
};
// An element's markup by id, from its opening tag to the matching close.
const slotSrc = (src, id) => {
  const i = src.indexOf(`id="${id}"`);
  if (i < 0) return '';
  const open = src.lastIndexOf('<', i);
  const tag = /^<([a-z0-9-]+)/i.exec(src.slice(open))?.[1];
  if (!tag) return '';
  let depth = 0;
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  re.lastIndex = open;
  let m;
  while ((m = re.exec(src))) {
    if (m[0][1] === '/') { depth--; if (depth === 0) return src.slice(open, m.index + m[0].length); }
    else depth++;
  }
  return '';
};
// Strip HTML comments, so prose about the old CTA is not read as markup.
const noComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

// ═════════════════════════════════════════════════════════════════════════════
section('1 · first paint: unknown is not signed out');

// The static markup of both auth slots is what the reader sees before any
// script has run. It used to be the Join CTA. A CTA in that frame is a claim
// about the session that the page has not checked yet, and on a signed-in
// device it is simply false.
for (const f of ['nav-auth-desktop', 'nav-auth-mobile']) {
  const slot = noComments(slotSrc(HTML, f));
  must(slot.length > 40, `the ${f} slot was not found in index.html`);
  ok(/data-pdx-nav-sig="unknown"/.test(slot),
    `#${f}'s static markup does not declare itself unknown, so the painter cannot tell a first frame from a ` +
    'paint it already did');
  ok(!/JOIN THE PEOPLE/i.test(slot),
    `#${f}'s first frame is the Join CTA again. Nothing has asked Firebase yet at that point; on a returning ` +
    'reader this is the false logout the report was about');
  ok(!/sign(ed)?[ -]?out|log(ged)? out|not signed in/i.test(slot),
    `#${f}'s first frame carries signed-out copy, which is an answer the page does not have yet`);
  ok(/Checking account/i.test(slot),
    `#${f}'s first frame no longer says it is checking, so unknown reads as nothing at all`);
  ok(!/onclick=|href="\/?(login|join|signup)/i.test(slot),
    `#${f}'s first frame hands the reader a control before the session is known`);
}
ok(!/>JOIN THE PEOPLE</.test(noComments(HTML)),
  'JOIN THE PEOPLE is back in index.html markup. The CTA is printed by updateNavAuth once the SDK has answered ' +
  'null — it is not part of the document');

// The pre-SDK stub: it must QUEUE registrations, not answer them. Answering is
// what made every load start as a logout.
for (const f of SHELLS) {
  const src = read(f);
  const i = src.indexOf('onAuthStateChanged: function');
  must(i > 0, `${f} no longer carries the pre-SDK auth stub`);
  const stub = src.slice(i, i + 400);
  ok(!/\bcb\(null\)/.test(stub),
    `${f}'s stub answers cb(null) during parse. That is the false logout at its source: every listener on the ` +
    'page is told "signed out" before Firebase has been asked');
  ok(/__pdxAuthQueue\.push/.test(stub),
    `${f}'s stub does not queue its registrations, so anything that subscribes before the SDK lands never hears ` +
    'the real answer');
  ok(/window\.PDXAuth = window\.PDXAuth \|\| \{ state: 'unknown'/.test(src),
    `${f} does not seed PDXAuth as unknown, so the chrome has only two states again`);

  // And the queue must not be able to strand the page. firebase-boot.js is a
  // runtime cache entry, not a precached one, so a warm device can pair this
  // new shell with the previous copy of the boot file — one that never drains
  // the queue. A late flush is a timeout, not a first guess.
  const heal = src.slice(i, i + 2200);
  ok(/window\.__pdxAuthQueue = null;[\s\S]{0,400}cb\(null\)/.test(heal) ||
     /q\[i\]\.cb\(null\)/.test(heal),
    `${f}'s queue has no self-heal. If firebase-boot.js never arrives to drain it, every subscriber waits for ` +
    'the whole visit and the bar sits on "Checking account…"');
  const ms = /\}, (\d{3,5})\);/.exec(heal);
  ok(ms && Number(ms[1]) >= 2000,
    `${f}'s queue flush fires in under two seconds, which is fast enough to beat a slow SDK and become the same ` +
    'premature "signed out" this pass removed');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2 · a restored session is remembered, not re-earned');

ok(/setPersistence\(firebase\.auth\.Auth\.Persistence\.LOCAL\)/.test(BOOT),
  'local persistence is not set, so the session does not survive the tab closing and the reader signs in again ' +
  'every visit');
const THREE = /state: 'unknown'/.test(BOOT) && /'in'/.test(BOOT) && /'out'/.test(BOOT);
ok(THREE, 'firebase-boot.js does not publish the three chrome states on PDXAuth');

const ANN = fnSrc(BOOT, '_pdxAuthAnnounce');
must(ANN.length > 100, '_pdxAuthAnnounce is gone from firebase-boot.js');
ok(/PDXAuth\.known = true/.test(ANN),
  'the auth event does not mark the session known, so the chrome can never leave unknown');
ok(/PDXAuth\.state = \(user && !user\.isAnonymous\) \? 'in' : 'out'/.test(ANN),
  'an anonymous user is reported as signed in, which paints a chip for an account that does not exist');
ok(/updateNavAuth\(PDXAuth\.user, PDXAuth\.state\)/.test(ANN),
  'the chip is not painted on the auth event itself — it would arrive a task late, which is the long beat the ' +
  'report described');

// The freeze, asserted: the callback paints and returns. Everything heavier is
// a job, and the jobs go through the bus one task each.
ok(/_authFanOut\(jobs\)/.test(ANN),
  '_pdxAuthAnnounce no longer fans its work out through the bus');
ok(!/syncUserDataFromFirestore|_loadLocalUserData|_startVotesListener|_loadCommentCounts/.test(ANN),
  '_pdxAuthAnnounce runs the account pull, the local rehydrate or the listeners inline. Firebase calls this ' +
  'synchronously on the sign-in click — a sync walk of the roster here is the Page Unresponsive dialog');
ok(!/signInAnonymously/.test(ANN),
  '_pdxAuthAnnounce signs in anonymously on its own task, which makes the callback wait on a network round trip');

const BUS = fnSrc(BOOT, '_authPump') + fnSrc(BOOT, '_authFanOut') + fnSrc(BOOT, '_pdxOffTask');
must(BUS.length > 100, 'the auth bus is gone from firebase-boot.js');
ok(/requestIdleCallback/.test(BUS) && /setTimeout/.test(BUS),
  'the bus does not hand its jobs to an idle callback with a timer backstop, so the work is back on the ' +
  'event\'s own task');
ok(/_authJobs\.shift\(\)/.test(BUS),
  'the bus runs its jobs in one batch rather than one at a time — a batch on an idle callback is the same long ' +
  'task, moved');

const SUBS = fnSrc(BOOT, '_pdxAuthSub');
must(SUBS.length > 100, '_pdxAuthSub is gone from firebase-boot.js');
ok(/auth\.onAuthStateChanged = _pdxAuthSub/.test(BOOT),
  'subscribers are not routed through the bus, so every module registers its own real Firebase listener again ' +
  'and one event runs all of them in one task');
ok(/__pdxAuthQueue/.test(BOOT) && /_pdxAuthSub\(_rec\.cb\)/.test(BOOT),
  'firebase-boot.js does not replay the shell\'s pre-SDK queue, so anything that subscribed during parse is ' +
  'never called');
ok(/window\.__pdxAuthQueue = null/.test(BOOT),
  'firebase-boot.js does not null the queue after replaying it, so the shell\'s self-heal flush fires a second ' +
  'null at every subscriber');
const RAW = (BOOT.match(/\.onAuthStateChanged\(/g) || []).length;
ok(RAW <= 1,
  `firebase-boot.js calls the SDK's onAuthStateChanged ${RAW} times. One real listener is the whole point of ` +
  'the bus');

// ═════════════════════════════════════════════════════════════════════════════
section('3 · the chip has three states and paints only on a change');

const NAV = fnSrc(HUB, 'updateNavAuth');
must(NAV.length > 200, 'updateNavAuth is gone from compare-hub.js');
const STATE_OF = fnSrc(HUB, '_navAuthStateOf');
must(STATE_OF.length > 40, '_navAuthStateOf is gone from compare-hub.js');
ok(/A && !A\.known/.test(STATE_OF) && /return 'unknown'/.test(STATE_OF),
  'a null user with no auth event yet is not resolved to unknown, so compare-hub.js paints the Join CTA on ' +
  'every load again — it is a sync script and runs before firebase-boot.js');
ok(/st === 'unknown'/.test(NAV) && /st === 'in'/.test(NAV),
  'updateNavAuth does not branch on three states');
ok(/data-pdx-nav-sig/.test(NAV) && /_navAuthSig/.test(NAV),
  'the paint guard is gone, so an unchanged session repaints the chip');
ok(/'unknown\|'/.test(NAV) || /unknown\|/.test(NAV),
  'the signature does not carry the unknown state, so unknown → in is not seen as a change and the chip never ' +
  'replaces the checking pill');
ok(!/db\.collection|firestore/i.test(NAV),
  'updateNavAuth reads Firestore. The chip is drawn from the user object already in hand');

// Unknown must be quiet: no CTA, and no live control on a chip the page is not
// sure about.
const unknownBranch = NAV.slice(NAV.indexOf("st === 'unknown'"));
ok(/aria-disabled|aria-live|pointer-events-none/.test(NAV),
  'the unknown chip is not marked inert, so the reader can click an account that may not be theirs');
ok(/Checking account/.test(NAV),
  'updateNavAuth never says it is checking, so unknown paints as an empty slot');
ok(/PDXLastAccount/.test(NAV),
  'the last-known account is not used while the session is unknown, so a returning reader watches a generic ' +
  'placeholder instead of their own chip');

const REM = fnSrc(HUB, 'PDXRememberAccount');
must(REM.length > 40, 'PDXRememberAccount is gone from compare-hub.js');
ok(!/getIdToken|\btoken\b|accessToken/i.test(REM),
  'the remembered account carries a token. It is a label for a placeholder chip, not a credential');
ok(/removeItem/.test(REM),
  'the remembered account is never cleared, so a signed-out device keeps flashing the previous reader\'s chip');

// And unknown is bounded: an SDK that never lands must not park the bar there.
ok(/NAV_UNKNOWN_MS/.test(HUB) && /_navUnknownExpired/.test(HUB),
  'unknown has no time limit. Offline, or with the compat bundle 404ing, "Checking account…" would sit there ' +
  'for the whole visit with no way to sign in');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · one Google sign-in at a time');

const GOOGLE = fnSrc(HUB, 'loginWithGoogle');
must(GOOGLE.length > 100, 'loginWithGoogle is gone from compare-hub.js');
ok(/if \(_googleInFlight\) return _googleInFlight;/.test(GOOGLE),
  'a second click reaches signInWithPopup while the first popup is still open. The SDK cancels the first and ' +
  'rejects it with auth/cancelled-popup-request, so the double click breaks the sign-in the reader wanted');
const lockAt = GOOGLE.indexOf('_googleInFlight');
const popupAt = GOOGLE.indexOf('signInWithPopup');
ok(lockAt >= 0 && popupAt > lockAt,
  'the single-flight check does not come before signInWithPopup, so the guard cannot stop the second call');
ok(/_googleInFlight = null/.test(GOOGLE),
  'the lock is never released, so one interrupted attempt disables Google sign-in for the rest of the visit');
ok(/_googleBtnBusy\(true\)/.test(GOOGLE) && /_googleBtnBusy\(false\)/.test(GOOGLE),
  'the button is not disabled while the popup is in flight, so the reader is invited to make the second click');

const BUSY = fnSrc(HUB, '_googleBtnBusy');
must(BUSY.length > 40, '_googleBtnBusy is gone from compare-hub.js');
ok(/btn\.disabled = !!on/.test(BUSY) && /aria-busy/.test(BUSY),
  'the busy state does not actually disable the button or announce itself');
ok(/Waiting for Google/.test(BUSY),
  'the button does not say what it is waiting for, so a pending popup behind the window looks like a dead ' +
  'button');
ok(/id="auth-google-btn"[^>]*type="button"/.test(HTML) && /id="auth-google-label"/.test(HTML),
  'the Google button in index.html lost its type or its swappable label, so disabling it may submit the form ' +
  'or the busy text has nowhere to go');

const OPEN = fnSrc(HUB, 'openAuthModal');
must(OPEN.length > 40, 'openAuthModal is gone from compare-hub.js');
ok(/clearAuthError\(\)/.test(OPEN),
  'reopening the modal keeps the previous error on screen');
ok(/_googleBtnBusy\(!!_googleInFlight\)/.test(OPEN),
  'reopening the modal re-enables the Google button while a popup is still in flight, which is the double call ' +
  'again through a different door');
ok(!/openAuthModal/.test(ANN),
  'a session arriving opens the auth modal. Signing in must not prompt for a sign-in');
// The CTA's own button legitimately carries onclick="openAuthModal()" — that is
// the signed-out branch, and it is the door. What must not exist is a call in
// the painter's own code: updateNavAuth runs on every auth event, and a second
// modal on top of a completed sign-in was one of the reported symptoms.
const navModalCalls = NAV.split('\n').filter((l) => /openAuthModal/.test(l) && !/onclick=/.test(l));
ok(navModalCalls.length === 0,
  'updateNavAuth calls openAuthModal itself rather than only wiring it to the signed-out CTA, so an auth event ' +
  'can raise a second modal over a sign-in that already succeeded');
const unknownFrom = NAV.indexOf("st === 'unknown'");
const unknownPaint = NAV.slice(unknownFrom, NAV.indexOf('} else {', unknownFrom));
ok(unknownPaint.length > 40 && !/openAuthModal/.test(unknownPaint),
  'the unknown chip offers a sign-in door. The page does not know yet whether the reader needs one');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · no Firebase error code reaches the reader');

must(/var AUTH_MSG = \{/.test(HUB), 'the AUTH_MSG table is gone from compare-hub.js');
const TABLE = HUB.slice(HUB.indexOf('var AUTH_MSG = {'), HUB.indexOf('var AUTH_MSG_FALLBACK'));
for (const code of ['auth/cancelled-popup-request', 'auth/popup-closed-by-user', 'auth/popup-blocked',
  'auth/network-request-failed', 'auth/wrong-password', 'auth/email-already-in-use']) {
  ok(TABLE.includes(`'${code}'`), `${code} has no sentence of its own, so the reader gets the code or a shrug`);
}
ok(/Sign-in was interrupted\. Try once\./.test(TABLE),
  'an interrupted popup does not say it was interrupted, which is the one case the reader causes themselves');

const SHOW = fnSrc(HUB, 'showAuthError');
must(SHOW.length > 40, 'showAuthError is gone from compare-hub.js');
ok(/auth\\\/\[a-z-\]\+|firebase:/i.test(SHOW),
  'showAuthError no longer strips Firebase codes. It is the last gate before the modal: anything shaped like ' +
  'auth/… or Firebase: … must never be printed there, whoever passed it in');
ok(!/error\.message/.test(GOOGLE) && !/e\.message/.test(GOOGLE),
  'loginWithGoogle prints the SDK\'s own message, which is where "auth/cancelled-popup-request" came from');
ok((HUB.match(/showAuthError\(authMessage\(/g) || []).length >= 3,
  'not every auth failure path is translated — at least one still hands its raw error to the modal');
ok(!/showAuthError\((?:error|e)\.message\)/.test(HUB),
  'a catch handler still passes error.message straight to showAuthError');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · the shells changed, so the cache did');

const ver = /const CACHE_VERSION = 'v(\d+)'/.exec(SW);
must(!!ver, 'CACHE_VERSION is gone from sw.js');
ok(Number(ver[1]) >= 207,
  `CACHE_VERSION is still v${ver[1]}. All five precached shells changed — the pre-SDK stub in each of them and ` +
  'index.html\'s nav markup — so a warm device would keep painting the Join CTA over a live session');
ok(/v207/.test(SW) && /auth/i.test(SW.slice(SW.indexOf('v207'), SW.indexOf('v207') + 1200)),
  'the version bump has no note saying what moved, which is how the next reader of this file loses the reason');

// ═════════════════════════════════════════════════════════════════════════════
section('7 · nothing else was touched');

const touched = {
  'firebase-boot.js · _pdxAuthAnnounce': ANN,
  'compare-hub.js · updateNavAuth': NAV,
  'compare-hub.js · loginWithGoogle': GOOGLE,
};
for (const [name, src] of Object.entries(touched)) {
  must(src.length > 40, `the ${name} probe matched nothing, so its assertions are vacuous`);
  ok(!/blended|composite score|overall grade/i.test(src), `${name} grew a blended score`);
  ok(!/\/121\b|denominator/.test(src), `${name} reaches into the 121 denominator`);
  ok(!/shapefile|geojson|district-map|courts?\.html/i.test(src), `${name} reaches into geography or courts`);
}
ok(!/OAuthProvider|FacebookAuthProvider|TwitterAuthProvider|GithubAuthProvider|AppleAuthProvider/.test(HUB),
  'a second sign-in provider was added, which is out of scope for this pass');
ok(!/sendPasswordResetEmail\s*=/.test(HUB),
  'the password-reset flow was redesigned, which is out of scope for this pass');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ auth restore: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ auth restore: all ${passed} assertions passed — an unchecked session paints "Checking account…" ` +
  'rather than a Join CTA, the session survives the tab closing, one Firebase listener hands every subscriber ' +
  'its own task so the sign-in click keeps painting, one Google popup is in flight at a time with the button ' +
  'saying so, and no Firebase error code can reach the modal');
