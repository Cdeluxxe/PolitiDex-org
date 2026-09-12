/* ═══════════════════════════════════════════════════════════════════════════
   test-mobile-body-lock.mjs — the panel scrolls, the page behind it does not
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   From a phone, on a 390×844 screen: "#support-politidex and the 'Your
   positions on eight issues' overlay are jumpy, lag, and stop scrolling."
   Support was a QR code with nothing tappable. And a 📡 "You're offline" banner
   sat at the bottom of the page while the device was on working cell data.

   Four separate defects wore one symptom, and this file pins each one so it
   cannot come back quietly:

     · A PANEL SIZED BY THE LARGE VIEWPORT. `position: fixed; inset: 0` lays out
       against the fixed-position viewport — the height the page would have with
       the toolbar HIDDEN, which is also what `100vh` reports. A panel capped at
       `calc(100vh - 48px)` inside that box is taller than the glass the moment
       the toolbar shows, so its last rows are behind the toolbar and the reader
       reads that as "stops scrolling". This is the doctrine
       test-mobile-bottom-chrome.mjs states at length; this file applies it to
       the two surfaces in the report.

     · NO OWNER FOR THE SCROLL. If the panel has no bounded height and no
       `overflow-y`, the DOCUMENT is the scroller — and the document scroller is
       the one the browser's own toolbar gesture competes with. Two things
       claiming one gesture is the "jumpy".

     · A TAP THAT REMOUNTS THE LIST IT WAS GIVEN ON. Replacing a scroller's
       children empties it for one layout and the engine clamps `scrollTop` to
       zero, so the pick jumped the scroll; and the node under the finger was
       destroyed mid-gesture, so the next scroll went nowhere.

     · AN EDGE-TRIGGERED OFFLINE DETECTOR. A banner driven only by the
       `online`/`offline` event pair holds a stale state forever if the matching
       edge arrived while the tab was frozen. `navigator.onLine === true` has to
       be a hard refusal to paint it.

   There is no browser here. Sections 1–7 are cascade and source facts. Section
   8 is a geometry model: the same arithmetic the cascade will do, run over real
   phone viewports including the 390 and 360 widths the brief names, so a
   regression reports as pixels off the bottom of a named device.

   Sections:
     1. The Your File panel is bounded by the VISIBLE viewport
     2. .pdxyf-body is the only scroller, and it owns the gesture
     3. A pick patches one row — it does not remount the list
     4. The donate card hosts its own scroll on a phone
     5. Support has a real tap target, and it is not QR-only
     6. The offline banner cannot paint while the browser says online
     7. None of these surfaces gained a score, a party read or a DM
     8. The geometry, at 390 and 360 and four more
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ mobile-body-lock: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HTML = read('index.html');
const YFCSS = read('your-file.css');
const YFJS = read('your-file.js');
const MPCSS = read('mobile-polish.css');
const APPCSS = read('app.css');
const STAB = read('pdx-stability.js');
const SW = read('sw.js');

// Comments carry the doctrine, and the doctrine quotes the very declarations
// being checked for. Every cascade assertion reads the STRIPPED text so a rule
// can never be "found" inside the paragraph explaining it.
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const YFC = strip(YFCSS);
const MPC = strip(MPCSS);
const APC = strip(APPCSS);

/* Every declaration this stylesheet makes for one selector, concatenated in
   source order. Deliberately NOT "the last match": each of these selectors is
   re-declared inside a phone media block to adjust padding, so taking the last
   body finds a three-line padding override and reports the base rule missing.
   Concatenating answers the question these assertions actually ask — does the
   sheet declare this anywhere for this selector — and source order is preserved
   so the vh-before-dvh fallback ordering is still checkable. */
function rule(css, selector) {
  const needle = selector + ' {';
  const bodies = [];
  let at = -1;
  for (;;) {
    const i = css.indexOf(needle, at + 1);
    if (i === -1) break;
    at = i;
    const end = css.indexOf('}', i);
    if (end !== -1) bodies.push(css.slice(i + needle.length, end));
  }
  return bodies.length ? bodies.join('\n') : null;
}

/* The bodies of every `@media (max-width: N)` block whose query covers `w`. */
function mediaFor(css, w) {
  const out = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const q = m[1].trim().replace(/\s+/g, ' ');
    const mw = /max-width\s*:\s*(\d+)px/.exec(q);
    const body = css.slice(re.lastIndex, i - 1);
    re.lastIndex = i;
    if (mw && Number(mw[1]) >= w && !/hover|pointer|prefers-/.test(q)) out.push({ q, mw: Number(mw[1]), body });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section('1. The Your File panel is bounded by the VISIBLE viewport');
// ═════════════════════════════════════════════════════════════════════════════
const box = rule(YFC, '.pdxyf');
must(box, 'your-file.css no longer declares a `.pdxyf` rule');
const panel = rule(YFC, '.pdxyf-panel');
must(panel, 'your-file.css no longer declares a `.pdxyf-panel` rule');

ok(/height:\s*100dvh/.test(box),
  '.pdxyf does not set `height: 100dvh` — a fixed box sized any other way is the large viewport, ' +
  'and the bottom of the panel goes behind the browser toolbar');
ok(/height:\s*100vh/.test(box),
  '.pdxyf has no `height: 100vh` line before the dvh one — engines without dynamic viewport units ' +
  'would get no height at all, which is worse than the bug being fixed');
ok(box.indexOf('100vh') < box.indexOf('100dvh'),
  '.pdxyf declares 100dvh BEFORE 100vh, so the fallback overrides the real rule');

// The bug that was reported, stated as the thing that must never return: the
// panel may not be capped against a viewport unit at all. It is bounded by its
// parent box, and its parent box is the one thing that knows the visible height.
ok(!/max-height:\s*calc\(100vh/.test(YFC),
  '.pdxyf-panel is capped with `calc(100vh - …)` again — that is the original defect verbatim: ' +
  'a vh-capped panel inside a dvh box is taller than the glass whenever the toolbar shows');
ok(/max-height:\s*100%/.test(panel),
  '.pdxyf-panel does not set `max-height: 100%`, so nothing bounds it to the box that knows the screen height');
ok(/min-height:\s*0/.test(panel),
  '.pdxyf-panel does not set `min-height: 0` — a flex child defaults to min-content, which lets the ' +
  'eight rows push the panel past its own max-height and the scroller never engages');
ok(/flex-direction:\s*column/.test(panel),
  '.pdxyf-panel is not a column flex container, so .pdxyf-body cannot take the remaining height');

// The safe area, paid once. `calc(gap + env(inset))` double-pays and is the
// error test-mobile-bottom-chrome.mjs pins across the modal stack.
const insetSites = (YFC.match(/env\(safe-area-inset/g) || []).length;
ok(insetSites >= 2, `your-file.css reserves the safe area at only ${insetSites} site(s) — expected top and bottom`);
ok(!/calc\([^)]*env\(safe-area-inset/.test(YFC),
  'your-file.css pays for the safe area with `calc(gap + env(inset))` somewhere — the control\'s own air and ' +
  'the home-indicator clearance are ONE gap: `max(gap, env(inset))`');
ok(/max\(\s*\d+px\s*,\s*env\(safe-area-inset/.test(YFC),
  'your-file.css does not use the `max(gap, env(inset))` form anywhere');

// ═════════════════════════════════════════════════════════════════════════════
section('2. .pdxyf-body is the only scroller, and it owns the gesture');
// ═════════════════════════════════════════════════════════════════════════════
const bodyRule = rule(YFC, '.pdxyf-body');
must(bodyRule, 'your-file.css no longer declares a `.pdxyf-body` rule');
ok(/overflow-y:\s*auto/.test(bodyRule), '.pdxyf-body does not own `overflow-y: auto`');
ok(/overscroll-behavior-y:\s*contain/.test(bodyRule),
  '.pdxyf-body does not contain its overscroll — a fling that runs out of range is handed to the document ' +
  'and to the toolbar show/hide gesture, which is the reported "jumpy"');
ok(/touch-action:\s*pan-y/.test(bodyRule),
  '.pdxyf-body does not declare `touch-action: pan-y`, so the browser may claim the vertical gesture');
ok(/min-height:\s*0/.test(bodyRule),
  '.pdxyf-body has no `min-height: 0`; as a flex child it will refuse to shrink below its content and never scroll');
ok(/overflow:\s*hidden/.test(box),
  '.pdxyf (the box) does not clip its own overflow, so it can become a second scroller behind the panel');

// The document must not be the scroller while the panel is up, and the only
// thing that can promise that is the shared lock refusing to release.
ok(/pdx-your-file/.test(STAB),
  'pdx-stability.js does not know about #pdx-your-file — any other module\'s `overflow = \'\'` will unlock the ' +
  'document while the eight-issue panel is open and the page will drift behind it');
const anyOverlay = STAB.slice(STAB.indexOf('function anyOverlayOpen'));
ok(anyOverlay.indexOf('pdx-your-file') !== -1 &&
   anyOverlay.indexOf('pdx-your-file') < anyOverlay.indexOf('\n  }'),
  'the #pdx-your-file check is not inside anyOverlayOpen(), which is the function the lock consults before releasing');
ok(/html\.pdx-scroll-locked\s*\{[^}]*overflow:\s*hidden/.test(MPC),
  'mobile-polish.css no longer makes `html.pdx-scroll-locked` stop scrolling — the lock has nothing to apply');
ok(/document\.body\.style\.overflow/.test(YFJS),
  'your-file.js no longer writes document.body.style.overflow, so it no longer routes through the shared lock seam');

// ═════════════════════════════════════════════════════════════════════════════
section('3. A pick patches one row — it does not remount the list');
// ═════════════════════════════════════════════════════════════════════════════
must(/function patchRow\s*\(/.test(YFJS), 'your-file.js no longer defines patchRow()');
const setFn = YFJS.slice(YFJS.indexOf('function set('), YFJS.indexOf('function set(') + 1400);
must(setFn.length > 100, 'your-file.js no longer defines set()');
ok(/patchRow\(/.test(setFn),
  'set() does not call patchRow() — if it calls render() again, every pick rewrites all eight rows, ' +
  'the engine clamps the scroller to 0 and the node under the finger is destroyed mid-gesture');
ok(!/(^|[^a-zA-Z])render\(\);/.test(setFn),
  'set() still calls render() — that is the remount this fix removed');

const patchFn = YFJS.slice(YFJS.indexOf('function patchRow('), YFJS.indexOf('function patchRow(') + 1800);
ok(!/innerHTML/.test(patchFn),
  'patchRow() writes innerHTML — replacing markup under the finger is the whole defect, whether it is one row or eight');
ok(/aria-pressed/.test(patchFn),
  'patchRow() does not move aria-pressed, so a screen reader keeps announcing the old answer');
ok(/data-pdxyf-row/.test(patchFn) && /data-pdxyf-set/.test(patchFn),
  'patchRow() no longer finds its row and its controls by the data attributes the renderer writes');
ok(/scrollTop/.test(YFJS) === true,
  'your-file.js mentions no scrollTop at all, so nothing preserves the reader\'s place');

// The count updates on its own node. The whole point of the id.
must(/ID_COUNT/.test(YFJS), 'your-file.js no longer declares ID_COUNT');
ok(/ID_COUNT[\s\S]{0,200}textContent/.test(patchFn) || /el\(ID_COUNT\)/.test(patchFn),
  'patchRow() does not update the count node — "2 answers of 8" would go stale, or the list would be remounted to fix it');
ok(/function countSentence/.test(YFJS),
  'your-file.js has no countSentence() — the head and the patch would each format the count their own way');

// render(), for the wholesale paths that remain, must restore the offset it
// destroys. Same task: a scroll restored on a later frame is a visible jump.
const renderFn = YFJS.slice(YFJS.indexOf('function render()'), YFJS.indexOf('function render()') + 900);
must(renderFn.length > 100, 'your-file.js no longer defines render()');
ok(/scrollTop/.test(renderFn),
  'render() does not read or restore scrollTop, so any wholesale repaint still drops the reader at the top');
ok(renderFn.indexOf('innerHTML') < renderFn.lastIndexOf('scrollTop'),
  'render() restores scrollTop BEFORE it rewrites the body, which restores it onto the markup it is about to destroy');
ok(/patchRow:\s*patchRow/.test(YFJS),
  'window.PDXYourFile does not export patchRow, so no suite can exercise a pick without the overlay');

// The tap has to land on the first touch. Without touch-action the engine holds
// the event ~300ms waiting for a possible double-tap.
const opt = rule(YFC, '.pdxyf-opt');
must(opt, 'your-file.css no longer declares a `.pdxyf-opt` rule');
ok(/touch-action:\s*manipulation/.test(opt),
  '.pdxyf-opt has no `touch-action: manipulation` — the browser waits out the double-tap window before ' +
  'dispatching the click, which reads exactly as "my tap did not register"');
ok(/min-height:\s*4[4-9]px|min-height:\s*5\dpx/.test(opt),
  '.pdxyf-opt is under the 44px touch target floor');

// ═════════════════════════════════════════════════════════════════════════════
section('4. The donate card hosts its own scroll on a phone');
// ═════════════════════════════════════════════════════════════════════════════
must(/id="support-politidex"/.test(HTML), 'index.html no longer has #support-politidex');
must(/class="pdx-donate /.test(HTML), '#support-politidex no longer carries the .pdx-donate hook class');
must(/pdx-donate-scroll/.test(HTML), 'the donate card has no .pdx-donate-scroll wrapper');

// The scroll contract, in the phone media blocks that cover BOTH widths named
// in the brief. Checked per width rather than once, because a rule behind
// `max-width: 380px` would pass a single spot-check and miss the 390 screen.
for (const w of [390, 360]) {
  const bodies = mediaFor(MPC, w).map((b) => b.body).join('\n');
  const has = (re) => re.test(bodies);
  ok(has(/\.pdx-donate-scroll\s*\{[^}]*overflow-y:\s*auto/),
    `at ${w}px the donate card's inner panel does not own \`overflow-y: auto\`, so the DOCUMENT is the scroller ` +
    'and it is competing with the browser toolbar for the same gesture');
  ok(has(/\.pdx-donate-scroll\s*\{[^}]*max-height:\s*calc\(100dvh/),
    `at ${w}px the donate panel has no dvh-bounded height — an unbounded panel cannot scroll, and a vh-bounded ` +
    'one is bounded by the wrong viewport');
  ok(has(/\.pdx-donate-scroll\s*\{[^}]*--pdx-chrome/),
    `at ${w}px the donate panel's height does not subtract var(--pdx-chrome), so it runs under the fixed nav`);
  ok(has(/\.pdx-donate-scroll\s*\{[^}]*overscroll-behavior-y:\s*contain/),
    `at ${w}px the donate panel does not contain its overscroll — the page behind it will move`);
  ok(has(/\.pdx-donate-scroll\s*\{[^}]*touch-action:\s*pan-y/),
    `at ${w}px the donate panel does not claim the vertical pan`);
  ok(has(/\.venmo-qr-frame\s*\{[^}]*animation:\s*none/),
    `at ${w}px the QR frame still animates — venmoGlow repaints a 300% gradient on a shadowed box every frame, ` +
    'forever, on or off screen, which is the reported lag');
  ok(has(/\.pdx-donate-glow\s*\{[^}]*filter:\s*none/),
    `at ${w}px the two 256px decoration circles still carry blur(64px), which is two large composited layers ` +
    'of permanent work behind a scroller');
}
// The chrome variable has to exist for the bound above to mean anything.
ok(/--pdx-chrome/.test(MPC) && /--pdx-chrome/.test(HTML),
  '--pdx-chrome is not both declared in mobile-polish.css and published by index.html\'s measurer');
// The fallback must exist AND be the one literal index.html declares on :root.
// test-top-chrome.mjs calls this "one offset" and pins it across every sheet: a
// second number here, however reasonable, is first paint disagreeing with the
// second frame about where the page starts. This pass originally wrote 56px and
// that suite caught it.
const declaredChrome = /--pdx-chrome\s*:\s*([^;}]+)/.exec(HTML.replace(/\/\*[\s\S]*?\*\//g, ''));
must(declaredChrome, 'index.html no longer declares --pdx-chrome, so the donate panel has nothing to subtract');
const chromeLit = declaredChrome[1].trim();
const fb = [...MPC.matchAll(/var\(\s*--pdx-chrome\s*,\s*([^)]+)\)/g)].map((m) => m[1].trim());
ok(fb.length > 0,
  'the donate panel spends var(--pdx-chrome) with no fallback — a warm device holding one file and not the other ' +
  'would get an unbounded panel, which is the bug');
ok(fb.every((v) => v === chromeLit),
  `a --pdx-chrome fallback in mobile-polish.css is not the literal index.html declares (${chromeLit}) — found ` +
  `${JSON.stringify([...new Set(fb)])}. Two numbers for one offset is first paint disagreeing with the second frame.`);
// The keyframes and the base declaration STAY. This card's frame is a gradient
// and that is its identity; the stand-downs below are additive overrides, so a
// `.venmo-qr-frame` used anywhere other than the donate card is untouched.
ok(/animation:\s*venmoGlow/.test(APC),
  'the venmoGlow animation was deleted outright rather than stood down — the stand-down is supposed to be additive');
ok(/@keyframes\s+venmoGlow/.test(APC),
  'the venmoGlow keyframes were deleted — the stand-down is an override, not a removal');
ok(/prefers-reduced-motion[^{]*\{[\s\S]{0,400}?\.venmo-qr-frame\s*\{[^}]*animation:\s*none/.test(MPC),
  'a reader who asked for less motion still gets the gradient sweep at desktop widths');

// ── AND IT STANDS DOWN AT EVERY WIDTH ────────────────────────────────────────
// THE REPORT: "the donate hash is still hitchy on phone and a bit on desktop."
// Phones were covered above, reduced-motion readers by the block above that.
// The case left over was a desktop reader who had not asked for less motion,
// and it is the case the report names. The brief's condition was "stand down
// unless you can prove 0 extra layer", and neither of these can be:
//
//   · `background-position` is not a transform or an opacity, so a
//     background-position animation cannot be handed to the compositor. Every
//     frame is a main-thread paint of the element — the same thread the arrival
//     scroll and the card's layout are on.
//   · A `filter` other than `none` is a stacking context and a new layer by
//     the spec's own definition, and a 64px Gaussian expands that layer well
//     past its own 256px box. Two of them, for a tint.
//
// Asserted OUTSIDE every media block: the rule has to apply unconditionally,
// so a rule that only exists at ≤640px does not satisfy this.
{
  // mobile-polish.css with every @media block cut out — what applies at all widths.
  let unconditional = MPC;
  for (;;) {
    const at = unconditional.search(/@media[^{]*\{/);
    if (at === -1) break;
    const open = unconditional.indexOf('{', at);
    let depth = 1, i = open + 1;
    while (i < unconditional.length && depth > 0) {
      if (unconditional[i] === '{') depth++;
      else if (unconditional[i] === '}') depth--;
      i++;
    }
    unconditional = unconditional.slice(0, at) + unconditional.slice(i);
  }
  must(!/@media/.test(unconditional), 'the media-block stripper left an @media behind — this probe is unreliable');
  ok(/\.pdx-donate\s+\.venmo-qr-frame\s*\{[^}]*animation:\s*none/.test(unconditional),
    'the QR frame still sweeps a 300% gradient at desktop widths — background-position cannot be composited, so ' +
    'every frame is a main-thread paint on the thread the arrival scroll is on');
  ok(/\.pdx-donate\s+\.pdx-donate-glow\s*\{[^}]*filter:\s*none/.test(unconditional),
    'the two 256px decoration circles still carry blur(64px) at desktop widths — a filter is a new layer by ' +
    'definition, so "0 extra layer" cannot be proven for it');
  // Scoped to the donate card, so nothing else that uses the frame is restyled.
  ok(!/(?:^|[};])\s*\.venmo-qr-frame\s*\{[^}]*animation:\s*none/.test(unconditional),
    'the all-width stand-down is not scoped to .pdx-donate — it would restyle a QR frame anywhere on the site');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4b. "Loading the latest roster…" is a background warm, not a control');
// ═════════════════════════════════════════════════════════════════════════════
// THE REPORT: the phone could not finish the eight Your File issues, and the
// donate card was hitchy. This pill was in the way of both, literally.
//
// It is `position: fixed; bottom: 18px; left: 50%; z-index: 9000` — the bottom
// centre of the glass, over the Your File panel's last rows and over the donate
// card's Venmo button and QR. With no pointer-events rule it took every tap
// that landed on it, so a reader answering the eight bottom-up, or reaching for
// Donate, was tapping a status message. And its `backdrop-filter: blur(10px)`
// re-blurred a fresh sample of the page behind it on every scrolled frame, at
// 92% background opacity, where there was almost nothing showing through.
{
  const pill = rule(APC, '.pdx-roster-status');
  must(pill, 'app.css no longer declares .pdx-roster-status');
  must(/position:\s*fixed/.test(pill) && /z-index:\s*9000/.test(pill),
    'the roster pill is no longer a fixed z-index:9000 overlay — re-check whether it can still take a tap');
  ok(/pointer-events:\s*none/.test(pill),
    'the roster toast still takes taps — a fixed z-index:9000 pill at the bottom centre of the glass sits over ' +
    'the Your File panel\'s last rows and over the donate card\'s Venmo button');
  ok(!/backdrop-filter/.test(pill),
    'the roster toast still carries a backdrop-filter — it re-blurs a sample of the page on every scrolled frame, ' +
    'for a pill whose own background is already 92% opaque');
  // Its one real control opts back in, or Retry becomes unclickable.
  const pillBtn = rule(APC, '.pdx-roster-status button');
  must(pillBtn, 'app.css no longer declares .pdx-roster-status button');
  ok(/pointer-events:\s*auto/.test(pillBtn),
    'the pill is pointer-events:none and its Retry button does not opt back in — the retry cannot be tapped');
}
// AND THE WARM DOES NOT HOLD A LOCK OR REPAINT THE PANEL. The directory read
// calls signInAnonymously(), which fires onAuthStateChanged; your-file.js's
// listener compares the uid signature first, so an anonymous session — which is
// not a member, so nothing about the eight rows changes — repaints nothing.
// (test-your-file.mjs section 7 drives that listener directly.)
{
  const BOOT = read('firebase-boot.js');
  must(/Loading the latest roster/.test(BOOT), 'firebase-boot.js no longer paints the roster toast');
  ok(!/body\.style\.overflow/.test(BOOT),
    'the roster warm locks the document body — a background warm must not take the scroll lock');
  ok(!/PDXStability[\s\S]{0,40}lock/.test(BOOT),
    'the roster warm takes a stability lock — that would block the donate scroll');
  ok(!/PDXYourFile/.test(BOOT),
    'the roster warm reaches into Your File — it must not repaint the panel it is loading behind');
  ok(/if \(sig === _authSig\) return;/.test(YFJS),
    'your-file.js repaints on every auth event again — the roster warm\'s anonymous session remounts all eight rows');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5. Support has a real tap target, and it is not QR-only');
// ═════════════════════════════════════════════════════════════════════════════
const cardStart = HTML.indexOf('id="support-politidex"');
const CARD = HTML.slice(cardStart, HTML.indexOf('<!-- Share toast', cardStart) > -1
  ? Math.min(cardStart + 6000, HTML.length) : cardStart + 6000);
must(CARD.length > 500, 'could not slice the donate card out of index.html');

const anchors = CARD.match(/<a\b[^>]*href="([^"]+)"/g) || [];
ok(anchors.length >= 1, 'the donate card contains no <a href> at all — it is still QR-only, which is a donate path ' +
  'that works on every device except the one the reader is holding');
ok(/<a\b[^>]*href="https:\/\/venmo\.com\/u\/[A-Za-z0-9_-]+"/.test(CARD),
  'the donate card has no https://venmo.com/u/<handle> link — the universal link is the fallback that works ' +
  'with no app installed, and the app claims the same address when it is');
ok(/href="venmo:\/\//.test(CARD),
  'the donate card offers no venmo:// app-scheme deep link');
ok(/Donate with Venmo/.test(CARD),
  'the tap target is not labelled "Donate with Venmo"');
// The primary control is the one that cannot fail silently.
ok(CARD.indexOf('https://venmo.com/u/') < CARD.indexOf('href="venmo://'),
  'the bare venmo:// scheme is offered BEFORE the universal link — a custom scheme does nothing at all on a ' +
  'device without the app, and a control that sometimes does nothing must not be the first one offered');
ok(/rel="[^"]*noopener/.test(CARD), 'the outbound donate link has no rel="noopener"');
// One address. The QR, the button and the typed handle must agree.
const handles = new Set((CARD.match(/venmo\.com\/u\/([A-Za-z0-9_-]+)/g) || []).map((s) => s.split('/u/')[1]));
ok(handles.size === 1, `the donate card names ${handles.size} different Venmo handles — the scan, the tap and the ` +
  'typed handle would land in three different places');
ok(!/data=https:\/\/venmo\.com\/[A-Za-z0-9_-]+(&|")/.test(CARD) || /data=https:\/\/venmo\.com\/u\//.test(CARD),
  'the QR payload still points at the old venmo.com/<handle> form while the buttons use venmo.com/u/<handle>');
ok(/venmo-qr-frame/.test(CARD), 'the QR was removed — the brief said keep it; it is the right affordance for a ' +
  'laptop screen somebody points a phone at');
// No new processor, and no score.
for (const word of ['stripe', 'paypal', 'cash.app', 'gofundme', 'donorbox', 'patreon']) {
  ok(!CARD.toLowerCase().includes(word), `the donate card mentions "${word}" — no new payment processor was asked for`);
}
ok(!/\bgoal\b|\braised\b|progress-bar|pdx-donate-total/i.test(CARD),
  'the donate card publishes a total, goal or progress bar — a donation is not a score');
// The button styles exist, or the tap target renders as a bare blue link.
ok(/\.pdx-donate-btn\s*\{/.test(APC), 'app.css has no .pdx-donate-btn rule, so the tap target has no target to tap');
const btn = rule(APC, '.pdx-donate-btn');
ok(/min-height:\s*(4[4-9]|5\d)px/.test(btn || ''), '.pdx-donate-btn is under the 44px touch floor');
ok(/touch-action:\s*manipulation/.test(btn || ''), '.pdx-donate-btn does not remove the double-tap delay');
ok(/focus-visible/.test(APC.slice(APC.indexOf('.pdx-donate-btn'))),
  'the donate controls have no :focus-visible ring — a keyboard reader cannot see where they are');

// ═════════════════════════════════════════════════════════════════════════════
section('6. The offline banner cannot paint while the browser says online');
// ═════════════════════════════════════════════════════════════════════════════
must(/pdx-offline-banner/.test(HTML), 'index.html no longer has the #pdx-offline-banner block');
const sbAt = HTML.indexOf('function showBanner()');
must(sbAt !== -1, 'index.html no longer defines showBanner()');
const SHOW = HTML.slice(sbAt, HTML.indexOf('function hideBanner()', sbAt));
must(SHOW.length > 40, 'could not slice showBanner()');

ok(/navigator\.onLine\s*!==\s*false/.test(SHOW),
  'showBanner() does not check navigator.onLine — ANY caller, or one stale `offline` edge received while the ' +
  'tab was frozen, paints "You\'re offline" over a working connection. That is the reported bug.');
ok((SHOW.match(/navigator\.onLine/g) || []).length >= 2,
  'showBanner() checks the flag once, outside its requestAnimationFrame — the radio can return between the call ' +
  'and the paint, which is the same bug one frame later');
ok(/requestAnimationFrame/.test(SHOW) &&
   SHOW.indexOf('navigator.onLine') < SHOW.indexOf('requestAnimationFrame'),
  'the guard runs after the frame is scheduled rather than before it');
ok(/return;/.test(SHOW), 'showBanner() never returns early, so the guard cannot actually stop it');

// The state has to be RE-READ at each moment an edge could have been missed.
const PWA = HTML.slice(HTML.indexOf('Offline status banner'), HTML.indexOf('Service worker registration'));
must(PWA.length > 500, 'could not slice the PWA/offline block');
for (const ev of ['visibilitychange', 'pageshow', 'focus']) {
  ok(PWA.includes(`'${ev}'`),
    `the block never re-reads the connection on ${ev} — a tab frozen through the matching \`online\` event ` +
    'wakes up holding a state that stopped being true minutes ago, and nothing takes the banner down');
}
ok(/visibilityState\s*===\s*'visible'/.test(PWA),
  'the visibilitychange handler syncs on hide as well as show, which is work for a page nobody is looking at');
ok(/falseOfflineRefusals/.test(PWA),
  'the block counts no refusals — there is no way to tell from the console whether a false offline was caught');
ok(/isOnline/.test(PWA), 'window.PDXNet.isOnline was dropped; other modules read it');
// No probe. A fetch to second-guess a correct flag spends the reader's data.
ok(!/fetch\(/.test(PWA),
  'the offline block added a connectivity probe — a background fetch spends the reader\'s cell data to ' +
  'second-guess a flag that is already correct in the case being fixed, and keeps spending it on exactly the ' +
  'slow connection where a timeout looks like an outage');

// Touching a SHELL file obliges a version bump, or a warm phone keeps the bug.
const ver = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
must(ver, 'sw.js no longer declares CACHE_VERSION in the expected form');
const vn = Number(ver[1].slice(1));
ok(vn >= 178, `CACHE_VERSION is ${ver[1]}; this pass changed the shell (/, /app.css, /mobile-polish.css, ` +
  '/pdx-stability.js) and a warm device would keep serving the old one');
ok(SW.includes(`// ${ver[1]} -`), `sw.js has no version-log entry for ${ver[1]}`);
const logEntry = SW.slice(SW.indexOf(`// ${ver[1]} -`), SW.indexOf('const CACHE_VERSION'));
for (const f of ['index.html', 'app.css', 'mobile-polish.css', 'pdx-stability.js']) {
  ok(logEntry.includes(f), `the ${ver[1]} log entry does not name ${f}, which this pass changed`);
}
// The two Your File files are deliberately NOT precached; if that ever changes
// they have to travel with a bump like everything else.
const shellList = SW.slice(SW.indexOf('const SHELL_ASSETS = ['), SW.indexOf('];', SW.indexOf('const SHELL_ASSETS = [')));
ok(!/'\/your-file\.(js|css)'/.test(shellList),
  'your-file.js / your-file.css were added to SHELL_ASSETS — they are a coupled pair kept out on purpose, and ' +
  'precaching them makes a half-updated device possible');

// ═════════════════════════════════════════════════════════════════════════════
section('7. None of these surfaces gained a score, a party read or a DM');
// ═════════════════════════════════════════════════════════════════════════════
// The brief's standing wall: no districts, Voice replies, scores, party metrics
// or mappings on any surface this pass touched.
// A BARE '%' IS NOT THE THING TO BAN. CSS is full of legitimate percentages —
// `max-height: 100%` is the fix in section 1 — and the donate card's own copy
// has read "PolitiDex is 100% community-funded" since long before this pass. The
// banned thing is a percentage presented as a FINDING about somebody, which is
// what a number next to "match", "aligned" or "score" is. Checked as a pair of
// adjacency patterns rather than as a character.
const SCORE_PCT = [
  /\b\d{1,3}\s*%\s*(match|aligned|alignment|agree|agreement|score|rating|support)/i,
  /(match|alignment|score|rating|direction)[^<>{}]{0,24}\b\d{1,3}\s*%/i
];
const BANNED = [
  ['directionMatch', 'Direction Match'],
  ['DirectionMatch', 'Direction Match'],
  ['partyLean', 'a party lean'],
  ['party_lean', 'a party lean'],
  ['(R)', 'a party letter'],
  ['(D)', 'a party letter'],
  ['districtVoice', 'the Voice path'],
  ['district-voice', 'the Voice path']
];
for (const [needle, what] of BANNED) {
  ok(!CARD.includes(needle), `the donate card prints ${what} ("${needle}")`);
  ok(!YFC.includes(needle), `your-file.css introduces ${what} ("${needle}")`);
}
for (const re of SCORE_PCT) {
  ok(!re.test(CARD), `the donate card prints a percentage as a finding (matched ${re})`);
  ok(!re.test(YFCSS), `your-file.css prints a percentage as a finding (matched ${re})`);
  ok(!re.test(strip(MPCSS)), `mobile-polish.css §7g prints a percentage as a finding (matched ${re})`);
}
// The donate card's own copy must stay free of the vocabulary too.
ok(!/\bscore\b|\brating\b|\brank(ed|ing)?\b/i.test(CARD), 'the donate card uses scoring vocabulary');
// door2-spine's two new views describe a job; they must not compute one.
const SPINE = read('door2-spine.js');
must(/evidence-for-my-vote/.test(SPINE) && /'my-saved'/.test(SPINE),
  'door2-spine.js does not carry evidence-for-my-vote and my-saved as views, so the two mid-page surfaces still ' +
  'read as separate ballot products');
const viewsBlock = SPINE.slice(SPINE.indexOf('var VIEWS = ['), SPINE.indexOf('var DEMOTE = ['));
const ids = (viewsBlock.match(/id: '([a-z-]+)'/g) || []).map((s) => s.split("'")[1]);
ok(ids.length === 5, `door2-spine.js declares ${ids.length} views; expected the original three plus the two ghosts`);
ok(!/%|directionMatch|partyLean/.test(viewsBlock), 'a view description carries a score or party read');
ok(/_decided\(\)/.test(SPINE) && /_seats\(\)/.test(SPINE),
  'door2-spine.js stopped reading its count from the workspace, which means it is computing one');
// No seventh destination: the strip's only control goes to the workspace.
ok(/toWorkspace/.test(SPINE) && !/window\.location\s*=/.test(SPINE),
  'door2-spine.js navigates somewhere of its own rather than jumping to the existing workspace');
ok(/View of your ballot workspace/.test(SPINE),
  'the view strip no longer says what it is a view OF, which is the whole relabel');

// ═════════════════════════════════════════════════════════════════════════════
section('8. The geometry, at 390 and 360 and four more');
// ═════════════════════════════════════════════════════════════════════════════
/* The model. `lvh` is the large viewport (toolbar hidden) — what a fixed box and
   `100vh` are both laid out against. `dvh` is the visible one. The defect was a
   panel bounded by lvh−48 inside an lvh box while the reader could only see dvh;
   the fix bounds it by the dvh box itself. Numbers are the real reported
   viewports for each device with its toolbar showing. */
const DEVICES = [
  { name: 'iPhone 12/13/14 (390×844)', w: 390, lvh: 844, dvh: 752, inset: 34 },
  { name: 'Galaxy S8 / small Android (360×740)', w: 360, lvh: 740, dvh: 674, inset: 0 },
  { name: 'iPhone SE 2/3 (375×667)', w: 375, lvh: 667, dvh: 559, inset: 0 },
  { name: 'iPhone 15 Pro Max (430×932)', w: 430, lvh: 932, dvh: 833, inset: 34 },
  { name: 'Pixel 7 (412×915)', w: 412, lvh: 915, dvh: 841, inset: 0 },
  { name: 'iPhone 5/SE1 (320×568)', w: 320, lvh: 568, dvh: 519, inset: 0 }
];
/* The chrome depth, taken from the literal index.html declares rather than typed
   here as a second number. It is the PRE-MEASUREMENT value, which is the honest
   one to model with: the inline measurer publishes the real depth once it runs,
   and until then this is what every sheet subtracts — so it is also the largest
   the subtraction ever is, and therefore the worst case for "does the panel still
   have room to be a panel". */
const REM = 16;
const CHROME = /rem\s*$/.test(chromeLit) ? Math.round(parseFloat(chromeLit) * REM) : parseInt(chromeLit, 10);
must(CHROME > 20 && CHROME < 200, `--pdx-chrome reads as ${CHROME}px, which is not a plausible nav depth`);
const CARD_MARGIN = 40;       // §7g's own margin, so the card ends inside the screen

let reproduced = 0;
for (const d of DEVICES) {
  // BEFORE: the panel was capped at 100vh − 48, i.e. lvh − 48, inside a fixed
  // (lvh-tall) box that centred it from the top of the large viewport.
  const before = d.lvh - 48;
  const cut = Math.max(0, before - d.dvh);
  if (cut > 0) reproduced++;

  // AFTER: the box is dvh tall, the panel is 100% of the box minus the safe-area
  // padding the box pays once at each end.
  const pad = Math.max(12, d.inset);
  const after = d.dvh - pad * 2;
  ok(after <= d.dvh,
    `${d.name}: the Your File panel still ends ${Math.round(after - d.dvh)}px below the visible screen`);
  ok(after > 240,
    `${d.name}: the panel collapses to ${after}px, which is not enough to show an issue card and its four controls`);

  // The donate card's own bound, from §7g.
  const donate = d.dvh - CHROME - CARD_MARGIN;
  ok(donate <= d.dvh - CHROME,
    `${d.name}: the donate panel runs under the fixed nav by ${Math.round(donate - (d.dvh - CHROME))}px`);
  ok(donate > 200, `${d.name}: the donate panel collapses to ${donate}px`);

  console.log(`      ${d.name.padEnd(34)} panel was ${String(cut).padStart(3)}px past the glass → 0px, ` +
    `donate scroller ${donate}px` + (d.inset ? `, ${d.inset}px indicator cleared` : ''));
}
ok(reproduced >= 5,
  'the model no longer reproduces the defect on any device, which means it stopped modelling it — if lvh and dvh ' +
  'are equal across this whole table there is nothing here to prove');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ mobile body lock: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ mobile body lock: all ${passed} assertions passed — the panel scrolls, the page behind it does not, ` +
  'Support has a button, and the banner tells the truth');
