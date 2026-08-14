/* ═══════════════════════════════════════════════════════════════════════════
   test-modal-bottom-chrome.mjs — the profile modal's bottom edge
   ────────────────────────────────────────────────────────────────────────────
   The profile modal is a flex column: a fixed header, a scrolling body, and a
   sticky footer deck pinned at the end. Because the panel is full-screen on a
   phone, the footer deck's bottom edge IS the bottom of the screen — there is
   nothing under it. That makes the deck's position entirely a function of how
   much bottom chrome the CSS reserves, and reserving it in the wrong place is
   invisible on a desktop browser and obvious on a notched phone.

   Two failures put the deck over the reader's content, and both had shipped:

     · The safe-area inset applied more than once down the same stack. It was
       reserved on #modal-panel, again on #modal-body, again on #modal-footer
       and again on #modal-action-strip — four times, roughly 130px of dead
       chrome on a notched phone. Worse, the one on #modal-panel is padding on
       the element that CONTAINS the footer, so it lifted the whole deck up off
       the true bottom of the screen. The last stance row, the last issue-index
       row and the dossier entry points sat underneath it.

     · The panel sized to 100vh with no 100dvh alongside it. On iOS Safari,
       100vh is the LARGE viewport — the height the page would have if the
       browser's own toolbar were hidden. A panel that tall ends below the
       visible screen, and a footer pinned to the end of it ends up under the
       toolbar rather than above it.

   The rule this file pins is narrow and mechanical: the bottom safe-area inset
   is reserved EXACTLY ONCE for this modal, on the deck itself, and the panel's
   phone-width height is expressed in dvh with vh kept only as the fallback.
   Neither is checkable by rendering here — there is no browser in this suite —
   so both are checked as CSS-cascade facts against the stylesheet.

   Sections:
     1. The inset is reserved exactly once, and on the footer
     2. The panel does not pad its own bottom
     3. Phone-width height is dvh, with vh as the fallback beneath it
     4. The deck is still the last child of the panel in the DOM
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ modal-bottom-chrome: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const CSS = read('app.css');
const HTML = read('index.html');

must(CSS.length > 100000, 'app.css did not load');
must(HTML.indexOf('id="modal-panel"') !== -1, 'index.html no longer has #modal-panel');

// A declaration list, stripped of comments, keyed by the selector block it sits
// in. Crude on purpose: this file asks "which rules mention X", not "what is the
// computed style", and a real parser would be a larger surface than the check.
const NAKED = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

// Every declaration that reserves the bottom safe-area inset, with the selector
// text immediately preceding it.
function insetSites() {
  const out = [];
  const re = /safe-area-inset-bottom/g;
  let m;
  while ((m = re.exec(NAKED)) !== null) {
    const open = NAKED.lastIndexOf('{', m.index);
    const selStart = Math.max(
      NAKED.lastIndexOf('}', open - 1),
      NAKED.lastIndexOf('{', open - 1),
      NAKED.lastIndexOf(';', open - 1),
    );
    out.push({
      selector: NAKED.slice(selStart + 1, open).trim().replace(/\s+/g, ' '),
      decl: NAKED.slice(open, NAKED.indexOf('}', m.index) + 1).replace(/\s+/g, ' '),
    });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. The inset is reserved exactly once, and on the footer
// ═════════════════════════════════════════════════════════════════════════════
const MODAL_SEL = /#modal-(panel|body|footer|content|action-strip)/;
const modalInsets = insetSites().filter((s) => MODAL_SEL.test(s.selector));

eq(modalInsets.length, 1,
  'the bottom safe-area inset is reserved more than once down the modal stack — each copy is\n' +
  '    real dead space, and one of them lifts the whole deck off the bottom of the screen\n' +
  '    (found: ' + modalInsets.map((s) => s.selector).join(' | ') + ')');
ok(modalInsets.length === 1 && /#modal-footer/.test(modalInsets[0].selector),
  'the one reservation is not on #modal-footer — it belongs on the deck itself, which is the\n' +
  '    element actually sitting against the bottom edge');

// ═════════════════════════════════════════════════════════════════════════════
// 2. The panel does not pad its own bottom
// ═════════════════════════════════════════════════════════════════════════════
// #modal-panel is the flex container. Bottom padding here is OUTSIDE the footer,
// so it does not protect the footer from the home indicator — it pushes the
// footer up and away from the edge it is supposed to be flush against.
const panelBlocks = [];
{
  const re = /#modal-panel[^{}]*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(NAKED)) !== null) panelBlocks.push(m[1]);
}
must(panelBlocks.length > 0, 'no #modal-panel rule found in app.css');
ok(!panelBlocks.some((b) => /padding-bottom\s*:/.test(b) || /(^|;)\s*padding\s*:/.test(b)),
  '#modal-panel pads its own bottom again — that padding sits outside the sticky footer and\n' +
  '    lifts the deck off the true bottom of the screen, which is the bug this pins');

// ═════════════════════════════════════════════════════════════════════════════
// 3. Phone-width height is dvh, with vh as the fallback beneath it
// ═════════════════════════════════════════════════════════════════════════════
// dvh is the SMALL/dynamic viewport — the part of the screen actually visible with
// the browser toolbar showing. vh stays in the file first so a browser without dvh
// support still gets a full-screen panel; the dvh rule must come after it to win.
const dvhAt = NAKED.search(/#modal-panel[^{}]*\{[^}]*dvh/);
ok(dvhAt !== -1,
  '#modal-panel no longer sizes in dvh — on iOS Safari 100vh is the LARGE viewport, so the\n' +
  '    panel ends below the visible screen and the footer deck goes under the toolbar');
ok(panelBlocks.some((b) => /\bmax-height\s*:\s*100dvh/.test(b)),
  '#modal-panel has no max-height in dvh');
ok(panelBlocks.some((b) => /\bheight\s*:\s*100dvh/.test(b)),
  '#modal-panel has no height in dvh');
ok(panelBlocks.some((b) => /100vh/.test(b)),
  'the 100vh fallback was removed — a browser without dvh support gets no full-screen panel');

// Both dvh rules have to live inside a phone-width media query. A global dvh panel
// would make the desktop modal full-bleed, which is not what this fixes.
{
  const idx = NAKED.indexOf('100dvh');
  const before = NAKED.slice(0, idx);
  const lastMedia = before.lastIndexOf('@media');
  const mediaText = NAKED.slice(lastMedia, NAKED.indexOf('{', lastMedia));
  ok(lastMedia !== -1 && /max-width\s*:\s*(4\d\d|[5-7]\d\d)px/.test(mediaText),
    'the dvh sizing is not inside a phone-width media query, so it would resize the desktop\n' +
    '    modal too (nearest @media: ' + mediaText.trim().replace(/\s+/g, ' ') + ')');
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. The deck is still the last child of the panel
// ═════════════════════════════════════════════════════════════════════════════
// All of the above only holds if the footer really is the element at the end of
// the flex column. If a sibling is appended after it, the deck stops being the
// bottom edge and every reservation above is aimed at the wrong element.
const panelAt = HTML.indexOf('id="modal-panel"');
const footAt = HTML.indexOf('id="modal-footer"', panelAt);
const bodyAt = HTML.indexOf('id="modal-body"', panelAt);
must(footAt !== -1 && bodyAt !== -1, 'index.html no longer has #modal-body / #modal-footer');
ok(bodyAt < footAt, 'the scrolling body no longer precedes the footer deck in the panel');
ok(HTML.indexOf('id="modal-action-strip"', footAt) !== -1,
  'the action strip is no longer inside the footer deck, so the footer padding no longer\n' +
  '    protects it');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ modal bottom chrome: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`✓ modal bottom chrome: all ${passed} assertions passed — one inset, on the deck, at the true bottom`);
