/* ═══════════════════════════════════════════════════════════════════════════
   test-chrome-gesture-cost.mjs — the tap gets the frame it landed in
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   From a phone: the hamburger, the account sheet and closing a profile all
   "feel seconds late". None of the handlers are expensive. Four other things
   were, and each one was invisible at the call site:

     1. THE FIRST TAP PAID FOR TWO MEGABYTES. pdx-lazy-data.js registered
        onFirstInteraction in CAPTURE phase on window for pointerdown, keydown,
        touchstart, wheel and scroll, and called ensureAll() inline. So the very
        first tap anywhere injected spotlights-data.js, acct-spotlight-data.js
        and cmp-data-detail.js — about 2 MB of script — BEFORE the tapped
        control's own handler ran. Tapping the hamburger meant compiling two
        megabytes and only then toggling a class.

     2. THE DRAWER BLURRED THE WHOLE SCREEN, FROM AN INLINE STYLE. #mobileMenu
        carried style="backdrop-filter:blur(20px)" in the markup. It is
        near-viewport-height and 98% opaque, so the blur is a full-screen
        rasterisation nobody can see — paid on every open AND every close. Being
        inline, it was also out of reach of mobile-polish.css §7d, the pass
        whose entire subject is this cost: the one blur that pass was written
        for was the one it could not turn off.

     3. THE PROFILE OVERLAY BLURRED A PAGE ALREADY HIDDEN. #modal-overlay is
        bg-black/85 AND backdrop-blur-md. At 85% opacity the blur is all but
        invisible and costs a full-viewport raster on open and on close.

     4. CLOSING A PROFILE SCALED WITH THE COMMENT ARCHIVE, AND LEFT THE FILE
        BEHIND. _pdxRefreshCommentChips walked Object.keys(_commentCounts) and
        ran a document-wide querySelectorAll per key — O(commented politicians)
        × O(document), where the first factor is the site's whole discussion
        history and the second grew every time a profile closed, because
        closeModal hid the overlay and never emptied #modal-content.

   WHAT IS NOT THE PROBLEM, pinned so a later pass does not re-spend the day on
   it: tap delay. app.css already sets touch-action: manipulation on every
   button, anchor and [role="button"], so there is no 300 ms double-tap wait on
   the chrome. Section 5 asserts that rather than repeating the folk diagnosis.

   Sections:
     1. The first interaction arms the loader; it does not run it
     2. #mobileMenu's blur is a rule, above phone width, not an inline style
     3. The profile overlay does not blur on a phone
     4. Closing a profile is one pass, and the file leaves the document
     5. touch-action was never the defect
     6. Nothing here gained a score, a party read or a second record client

     node scripts/test-chrome-gesture-cost.mjs
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
  console.error(`\n✗ chrome-gesture-cost: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HTML = read('index.html');
const LAZY = read('pdx-lazy-data.js');
const APPCSS = read('app.css');
const MPCSS = read('mobile-polish.css');
const LIKE = read('like-dislike.js');
const PROF = read('profiles-full.js');

// ═════════════════════════════════════════════════════════════════════════════
section('1 · the first interaction arms the loader; it does not run it');
// ═════════════════════════════════════════════════════════════════════════════
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

const FIRST = fnSrc(LAZY, 'onFirstInteraction');
must(FIRST, 'onFirstInteraction is gone from pdx-lazy-data.js — the loader was removed, not deferred');

ok(!/^\s*ensureAll\(/m.test(FIRST),
  'onFirstInteraction still calls ensureAll() as a statement of its own body — that is ~2 MB of script ' +
  "injection inside the tap's own task, which is the defect");
// P1b: the deferral and the loader call live one level down, in the warm the
// arming function delegates to. TWO RULES, BOTH ASSERTED BELOW, and the second
// one is the P1b correction:
//
//   NOT ON THE CLICK. The gesture's own task must not inject anything — that is
//   the original defect and it stays fixed.
//
//   AND NOT A THREE-SLICE CHAIN. The first fix then asked for a fresh idle slice
//   BETWEEN bundles and waited on each one's onload before requesting the next.
//   That serialised ~2 MB of fetch-and-execute across three to six seconds, so
//   every consumer stayed empty and every transition competed with a bundle
//   landing — reported as the whole site being ~10× slower. The warm must hand
//   the loader all of its keys in ONE task.
const WARM = fnSrc(LAZY, 'warmSoon');
must(WARM, 'warmSoon is gone from pdx-lazy-data.js — the deferred warm was removed, not refined');
const ARMED = FIRST + '\n' + WARM;

ok(/requestIdleCallback|setTimeout/.test(ARMED),
  'the arming path defers nothing. The injection has to land in a LATER task than the gesture, so the ' +
  'browser can paint what the reader touched first');
ok(/requestIdleCallback/.test(ARMED) && /timeout:/.test(ARMED),
  'the deferral has no requestIdleCallback timeout, so a permanently busy main thread can starve the load ' +
  'that every consumer of this data is waiting on');
const warmTimeout = Number((WARM.match(/timeout:\s*(\d+)/) || [])[1] || 0);
ok(warmTimeout > 0 && warmTimeout <= 1000,
  `the warm's idle timeout is ${warmTimeout} ms. The point of deferring is to miss the gesture's task, not to ` +
  'wait out a main thread that on this page may never go quiet — a long timeout is how the warm came to trail ' +
  'seconds behind the tap');
ok(/setTimeout/.test(ARMED),
  'there is no setTimeout fallback for engines without requestIdleCallback');
ok(/ensure(All)?\(/.test(ARMED),
  'the arming path no longer loads the data at all — this pass moves the loader off the finger, it does ' +
  'not delete it');

// ALL THE BUNDLES, ONE TASK. Explicitly NOT one-key-per-slice: the warm hands
// every key it was given to the loader together, and does not re-enter itself
// or wait on a bundle's promise before asking for the next slice.
ok(/ensureAll\(/.test(WARM),
  'the warm no longer hands its whole key list to ensureAll(), so the bundles are being injected one at a time ' +
  'again — three ~megabyte fetches head-to-tail is the multi-second dead visit, not a fix for it');
ok(!/warmSoon\(/.test(WARM.slice(WARM.indexOf('{'))),
  'the warm re-enters itself — it is a chain again, which spreads ~2 MB across as many idle gaps as there are ' +
  'files');
ok(!/\.then\(/.test(WARM),
  "the warm waits for a bundle to land before scheduling more work. Script tags with async=false already " +
  'execute in order; gating the next request on the previous onload only serialises the network');
const firstCall = (FIRST.match(/warmSoon\(\s*\[[^\]]*\]/) || [])[0] || '';
ok(firstCall.split("'").length - 1 >= 4,
  'onFirstInteraction no longer hands the warm the bulk data keys it is responsible for warming');

// The post-load net for a visitor who never taps is the same shape: one task.
const FALLBACK = fnSrc(LAZY, 'idleFallback');
must(FALLBACK, 'idleFallback is gone from pdx-lazy-data.js');
ok(/ensureAll\(/.test(FALLBACK) && !/warmSoon\(/.test(FALLBACK),
  'the post-load fallback warms one bundle per slice. A reader who has not interacted is exactly the reader who ' +
  'should not be handed a staggered multi-second warm the moment they finally do');

// The listener set. pointerdown and touchstart both fire for one tap, and both
// fire BEFORE click, which is what put the injection ahead of the handler.
const ixLine = (LAZY.match(/var IX = \[([^\]]*)\]/) || [])[1] || '';
must(ixLine, 'the IX listener list is not an array literal any more');
const ix = ixLine.match(/'([^']+)'/g).map((s) => s.slice(1, -1));
ok(!ix.includes('pointerdown'), "'pointerdown' still arms the loader — it precedes the tapped control's handler");
ok(!ix.includes('touchstart'), "'touchstart' still arms the loader — it precedes the tapped control's handler");
ok(ix.length <= 3, `${ix.length} interaction events still arm the loader (${ix.join(', ')}) — one tap fired several`);
ok(ix.includes('scroll') || ix.includes('click'),
  'neither a scroll nor a click arms the loader any more, so a visitor who engages may never warm the data');

// Capture phase on window is what ran this ahead of everything else.
ok(!/addEventListener\(ev, onFirstInteraction, true\)/.test(LAZY),
  'the arming listener is still registered in capture phase, which runs it before the tapped element');
ok(/addEventListener\(ev, onFirstInteraction, IX_OPTS\)/.test(LAZY) && /IX_OPTS = \{ passive: true \}/.test(LAZY),
  'the arming listener is not registered passively in bubble phase');
ok(/removeEventListener\(ev, onFirstInteraction, false\)/.test(LAZY),
  'the removal does not match the registration\'s capture flag, so the listener is never actually removed');

// The other two triggers are the reason dropping events is safe at all.
ok(/IntersectionObserver/.test(LAZY) && /rootMargin/.test(LAZY),
  'the section-approaching IntersectionObserver is gone — below-the-fold data would arrive late or never');
ok(/requestIdleCallback/.test(LAZY) && /idleFallback/.test(LAZY),
  'the post-load idle fallback is gone — a visitor who never taps would see empty surfaces');
console.log(`      arming events: ${ix.join(', ')} (was pointerdown, keydown, touchstart, wheel, scroll — in capture)`);

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the drawer blur is a rule above phone width, not an inline style');
// ═════════════════════════════════════════════════════════════════════════════
const menuTag = (HTML.match(/<div id="mobileMenu"[^>]*>/) || [])[0] || '';
must(menuTag, '#mobileMenu is no longer a div with that id');

ok(!/backdrop-filter/i.test(menuTag),
  'the mobile drawer still declares backdrop-filter inline. An inline declaration cannot be overridden by ' +
  'mobile-polish.css without an !important war — the fix is to delete it, not to out-shout it');
ok(!/style="/.test(menuTag) || !/blur/i.test(menuTag),
  '#mobileMenu still carries a blur in its style attribute');
ok(/lg:hidden/.test(menuTag),
  '#mobileMenu is no longer lg:hidden, so the min-width rule below may now apply on a desktop that also ' +
  'shows the full nav');

// Given back above phone width only — the drawer is lg:hidden, so this is the
// tablet band that still shows it and can still afford it.
const minW = APPCSS.match(/@media \(min-width: 641px\) \{\s*#mobileMenu \{([\s\S]*?)\}\s*\}/);
ok(minW, 'app.css has no @media (min-width: 641px) rule giving #mobileMenu its blur back');
ok(minW && /backdrop-filter:\s*blur\(/.test(minW[1]), 'the min-width rule sets no backdrop-filter');
ok(minW && /-webkit-backdrop-filter/.test(minW[1]), 'the min-width rule has no -webkit- prefix for Safari');

// The nav's own blur removal, which the drawer used to sit outside of.
ok(/nav\.nav-blur \{[\s\S]{0,120}backdrop-filter: none/.test(MPCSS),
  "mobile-polish.css §7d no longer removes the sticky nav's blur on phones");

// ═════════════════════════════════════════════════════════════════════════════
section('3 · the profile overlay does not blur on a phone');
// ═════════════════════════════════════════════════════════════════════════════
const overlayTag = (HTML.match(/<div id="modal-overlay"[^>]*>/) || [])[0] || '';
must(overlayTag, '#modal-overlay is no longer a div with that id');
must(/bg-black\/8\d/.test(overlayTag),
  'the overlay is no longer ~85% opaque black — if the page behind it is now visible, the blur is doing ' +
  'visible work and this section needs rewriting rather than re-passing');

const phoneBlock = (MPCSS.match(/@media \(max-width: 640px\) \{[\s\S]*?#modal-overlay \{([\s\S]*?)\}/) || [])[1] || '';
ok(/backdrop-filter:\s*none/.test(phoneBlock),
  'there is no max-width: 640px rule taking backdrop-filter off #modal-overlay. Under bg-black/85 the blur ' +
  'is invisible and costs a full-viewport raster on every profile open and close');
ok(/-webkit-backdrop-filter:\s*none/.test(phoneBlock),
  'the phone rule has no -webkit- prefix, so iOS Safari keeps rasterising the blur');
// Tablet and desktop keep it: the rule is scoped, not deleted.
ok(/backdrop-blur-md/.test(overlayTag),
  'backdrop-blur-md was stripped from the markup instead of overridden on phones — the brief scoped this to ' +
  'max-width 640px, and a tablet can afford it');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · closing a profile is one pass, and the file leaves the document');
// ═════════════════════════════════════════════════════════════════════════════
const refresh = (LIKE.match(/window\._pdxRefreshCommentChips = function\(\) \{([\s\S]*?)\n  \};/) || [])[1] || '';
must(refresh, '_pdxRefreshCommentChips is not assigned in the shape this probe reads');

const queries = (refresh.match(/querySelectorAll\(/g) || []).length;
ok(queries === 1,
  `_pdxRefreshCommentChips runs ${queries} querySelectorAll calls. It must run exactly one: the per-pid ` +
  'loop cost O(commented politicians) × O(document) on a gesture that should be free');
ok(!/Object\.keys\(_commentCounts\)/.test(refresh),
  '_pdxRefreshCommentChips still iterates Object.keys(_commentCounts) — that key set is the whole comment ' +
  'archive, and it is filled from an unbounded collection read');
ok(/querySelectorAll\('\[data-comment-pid\]'\)/.test(refresh),
  "_pdxRefreshCommentChips does not query the chips that exist ('[data-comment-pid]') and read each one's " +
  'own pid off the element, which is what _pdxRefreshVoteChips already does');
ok(/getAttribute\('data-comment-pid'\)/.test(refresh),
  'the pid is not read from the element, so the query cannot be pid-agnostic');

// The sibling this was made to match. If it regresses, the shape stops being
// self-evident to the next reader.
const voteRefresh = (LIKE.match(/window\._pdxRefreshVoteChips = function\(\) \{([\s\S]*?)\n  \};/) || [])[1] || '';
must(voteRefresh, '_pdxRefreshVoteChips is not assigned in the shape this probe reads');
ok((voteRefresh.match(/querySelectorAll\(/g) || []).length === 1,
  '_pdxRefreshVoteChips grew a second document-wide query');

// closeModal: the file itself has to go.
const CLOSE = fnSrc(PROF, 'closeModal');
must(CLOSE, 'closeModal is gone from profiles-full.js');
ok(/getElementById\('modal-content'\)/.test(CLOSE) && /innerHTML = ''/.test(CLOSE),
  'closeModal does not empty #modal-content. Hiding the overlay leaves every person file ever opened in the ' +
  'tree, hidden, and counted by every document-wide querySelectorAll after it — which is why closing the ' +
  'second profile hitched worse than the first');

// Order matters: teardown → hide → unlock scroll → clear → history restore.
const at = (needle) => CLOSE.indexOf(needle);
const iTeardown = at('_pdxNavTeardown()');
const iHide = at("setProperty('display', 'none', 'important')");
const iUnlock = at("document.body.style.overflow = ''");
const iClear = at("innerHTML = ''");
const iRestore = at('PDXPerson.restore');
must(iTeardown > 0 && iHide > 0 && iUnlock > 0 && iClear > 0 && iRestore > 0,
  'one of the five closeModal steps this order is about is no longer findable');
ok(iTeardown < iHide, "closeModal hides the overlay before the rail's observers are disconnected");
ok(iHide < iUnlock, 'closeModal unlocks page scroll before hiding the overlay, so a frame shows the page jump');
ok(iUnlock < iClear, 'closeModal empties #modal-content before the overlay is hidden and scroll unlocked — a ' +
  'frame can show the emptying');
ok(iClear < iRestore, 'closeModal restores the address before emptying the node');
ok(at('__wealthChartInstance') < iClear && at('_pdxResetChartQueue()') < iClear,
  'the charts are destroyed after the node holding their canvases is thrown away');

// The paint hold. _alignRefreshAll is sixteen document-wide passes and an open
// file covers all sixteen; the warm queue fires it while the file is up.
const OPEN = fnSrc(PROF, 'openModal');
must(OPEN, 'openModal is gone from profiles-full.js');
ok(/_pdxHoldAlign\(true\)/.test(OPEN), 'openModal takes no alignment paint hold');
ok(/_pdxHoldAlign\(false\)/.test(CLOSE), 'closeModal never releases the alignment paint hold');
const holdFn = fnSrc(PROF, '_pdxHoldAlign');
must(holdFn, '_pdxHoldAlign is gone');
ok(/_pdxAlignHeld/.test(holdFn) && /if \(_pdxAlignHeld\) return/.test(holdFn),
  'the hold is not idempotent. openModal is RE-ENTRANT (the loading-shell path calls itself) and ' +
  'alignRefreshHold counts holders, so an unpaired take suppresses every later refresh for the life of the page');
ok(CLOSE.lastIndexOf('_pdxHoldAlign(false)') > at('_pdxRefreshVoteChips'),
  'the hold is released before the chip refreshes, so the one flushed pass runs against a document that ' +
  'still holds the closed file');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · touch-action was never the defect');
// ═════════════════════════════════════════════════════════════════════════════
ok(/button, \[role="button"\], a, \.btn, summary, label\[for\] \{ touch-action: manipulation; \}/.test(APPCSS),
  'the global touch-action: manipulation rule is gone from app.css. It is what removes the 300 ms ' +
  'double-tap-zoom wait from the hamburger and all 38 drawer links — and its presence is why "tap delay" ' +
  'is not what made the chrome feel late');
ok(/touch-action: manipulation/.test(MPCSS),
  "mobile-polish.css's per-component touch-action opt-ins are gone");
const hamburger = (HTML.match(/<button[^>]*onclick="document\.getElementById\('mobileMenu'\)[^>]*>/) || [])[0] || '';
must(hamburger, 'the hamburger button no longer toggles #mobileMenu from an inline onclick');
ok(/classList\.toggle\('hidden'\)/.test(hamburger),
  'the hamburger does something other than toggle one class — anything more belongs off the gesture');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · nothing here gained a score, a party read or a second record client');
// ═════════════════════════════════════════════════════════════════════════════
// Scoped to what this pass actually wrote. A file-wide grep would flag the
// existing lines in these files that DISCLAIM a party read, which is the
// opposite of the thing being guarded against.
const touched = {
  'pdx-lazy-data.js': fnSrc(LAZY, 'onFirstInteraction'),
  'mobile-polish.css': (MPCSS.match(/#modal-overlay \{[\s\S]*?\}/) || [''])[0],
  'app.css': (APPCSS.match(/@media \(min-width: 641px\) \{\s*#mobileMenu \{[\s\S]*?\}\s*\}/) || [''])[0],
};
for (const [name, src] of Object.entries(touched)) {
  must(src.length > 20, `the ${name} probe matched nothing, so its assertions are vacuous`);
  ok(!/\bparty\b/i.test(src), `${name} grew a party read`);
  ok(!/blended|composite score|overall grade/i.test(src), `${name} grew a blended score`);
  ok(!/\bscore\b|\bgrade\b|\bpercent/i.test(src), `${name} grew a rated read`);
}
ok(!/fetch\(|XMLHttpRequest/.test(FIRST + CLOSE),
  'the gesture paths grew a network call — the deferral moves work off the frame, it does not add any');
ok(!/voting-record\/member/.test(LAZY),
  'pdx-lazy-data.js now reaches for the formal record. There is one record client (voting-record.js) and ' +
  'this loader is for curated data files');
ok(/_pdxRefreshCommentChips/.test(CLOSE) && /_pdxRefreshVoteChips/.test(CLOSE),
  'closeModal no longer refreshes the listing chips, so a comment or vote cast inside the profile stops ' +
  'showing on the cards');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ chrome gesture cost: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ chrome gesture cost: all ${passed} assertions passed — the first tap arms the loader instead of ` +
  'paying for it, neither the drawer nor the overlay blurs a phone, and closing a profile is one pass over a ' +
  'document the file has left');
