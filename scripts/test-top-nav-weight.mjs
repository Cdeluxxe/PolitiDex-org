#!/usr/bin/env node
/**
 * test-top-nav-weight.mjs — the bar has one ladder, and nothing on it moves at rest.
 *
 * test-top-nav-layout.mjs answers "where does each control sit". This file answers
 * "how loudly does it speak", which was the other half of the report: too many
 * equal-loud controls, and the loudest two were the ones that are not the product.
 *
 * WHAT WAS ACTUALLY LOUD. Read at rest, the bar had five filled controls, and the
 * only two carrying motion were ✊ Mandate (a 4s gradient sweep, a 2.2s box-shadow
 * flash cycling crimson→gold→blue, and a 6s scale jump to 1.09 — three infinite
 * animations at once) and JOIN THE PEOPLE (a 2.2s 36→50px crimson bloom with a 3px
 * white ring, plus its own 6s scale jump). Motion is the first thing an eye
 * resolves, colour second, weight third. So the reliable reading order of the bar
 * was account chrome, then the momentum button, then — if anything was left — the
 * three pills that are the actual front step and the two doors. Mandate also sat at
 * font-weight 800 against the pills' 700, so it outranked them on the one axis
 * motion did not already decide.
 *
 * There is a doctrine reading of the same defect and it points the same way. The
 * formal record needs no account to read, so a permanently pulsing account CTA
 * advertises a gate that does not exist; and Mandate is the people-support lane —
 * momentum, walled off from the ledger — so a flashing Mandate button is the one
 * number on the site nobody earned, rendered as the brightest thing above the
 * record.
 *
 * THE FIX, AND WHAT THIS FILE HOLDS. Nothing is hidden, nothing is removed, nothing
 * is reordered, nothing gets smaller. The glows and the motion are moved to :hover
 * and :focus-visible, where a control has a reader to answer. So this file pins:
 *
 *   1. the block exists, is nav-scoped, and does not disturb the cascade tail
 *   2. no control in the toolbar row animates at rest — in the markup, in app.css,
 *      AND in compare-hub.js, which re-renders the account cluster from JS and is
 *      where a fix applied only to index.html would quietly come back
 *   3. the motion was moved, not deleted; the two pure attention keyframes were
 *      deleted, not parked
 *   4. sign-in survives intact — label, FREE chip, icon, handler, size, DOM place
 *   5. the ladder, as an ordering that can be read off the source
 *   6. reduced motion is honoured
 *   7. no new destinations, no new pills, and the Phase 0 labels still stand
 *
 * No browser, no network. Exit code is non-zero on the first failure.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML = rd('index.html');
const APPCSS = rd('app.css');
const HUB = rd('compare-hub.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (c, m) => {
  if (c) return;
  console.error(`\n  ⚠ STALE TEST: ${m}\n    The source this file reasons about has moved. Re-read it before trusting a green run.\n`);
  process.exit(2);
};
const section = t => console.log(`\n  ── ${t}`);
/* Every assertion about a declaration runs on stripped text. The account of this
   change lives in the comments and names the keyframes it retired — a grep for
   "navSignInAttention" that counts a comment would pass for the wrong reason. */
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripHtml = s => s.replace(/<!--[\s\S]*?-->/g, ' ');
/* index.html carries its own <style> blocks, so "no reference in the markup" has to
   mean the elements — a keyframe named in a stylesheet rule, or in the comment
   explaining where that rule moved to, is the fix, not a survival of the defect. */
const elementsOnly = s => stripHtml(s).replace(/<style[\s\S]*?<\/style>/g, ' ');

/* ───────────────────────────────────────────────────────────────────────────
   0 · THE BLOCK, AND THE SLICES EVERYTHING BELOW READS
   ─────────────────────────────────────────────────────────────────────────── */
section('0 · the block, and where it sits in the cascade');

const wStart = HTML.indexOf('<style id="pdx-topnav-weight">');
must(wStart !== -1, 'no <style id="pdx-topnav-weight"> block in index.html');
const wEnd = HTML.indexOf('</style>', wStart);
must(wEnd !== -1, 'the pdx-topnav-weight block is never closed');
const W = stripCss(HTML.slice(wStart, wEnd));

const layoutAt = HTML.indexOf('<style id="pdx-topnav-layout">');
const bottomAt = HTML.indexOf('<style id="pdx-mobile-bottom-chrome">');
must(layoutAt !== -1 && bottomAt !== -1, 'one of the two neighbouring nav style blocks is gone');
ok(layoutAt < wStart, 'weight is declared after layout, so it can correct a resting shadow without !important');
ok(wStart < bottomAt,
  'and BEFORE pdx-mobile-bottom-chrome, whose own test requires that no <style> follows it');
ok(!/!important/.test(W), 'the block never reaches for !important');

/* Same discipline as the layout block: every rule is anchored on a nav id, so it
   cannot reach a control on the page by accident. */
for (const d of W.split('}').map(x => x.trim()).filter(x => x.includes('{'))) {
  const sel = d.slice(0, d.indexOf('{')).trim();
  if (!sel || sel.startsWith('@')) continue;
  ok(/#pdx-topnav|#nav-auth-desktop/.test(sel), `every rule is nav-scoped — "${sel.slice(0, 70)}" is not`);
}

const navStart = HTML.indexOf('<nav id="pdx-topnav"');
must(navStart !== -1, 'the nav lost its id');
const NAV = HTML.slice(navStart, HTML.indexOf('</nav>', navStart));
/* THE TOOLBAR ROW: the nav up to the Eye's band. This is the scope of every
   "nothing animates" claim below, and the scope is the point — the All-Seeing
   Eye's pupil blinks on a 6.5s loop, deliberately and since long before this
   change. That is the product's own glyph identifying its Door-1 surface in its
   own band, not a control in the toolbar competing for a click, and it is left
   exactly as it was. */
const eyeAt = NAV.indexOf('pdx-eye-row');
must(eyeAt > 0, 'the Eye row is gone from the nav; the toolbar slice below has no end');
const ROW = NAV.slice(0, eyeAt);
const DRAWER = NAV.slice(NAV.indexOf('id="mobileMenu"'));
must(DRAWER.length > 0, 'the mobile drawer is gone from the nav');

/* ───────────────────────────────────────────────────────────────────────────
   1 · NOTHING IN THE TOOLBAR ROW ANIMATES AT REST
   ─────────────────────────────────────────────────────────────────────────── */
section('1 · nothing in the toolbar row animates at rest');

const rowAnims = [...stripHtml(ROW).matchAll(/animation:\s*([^;"']+)/g)].map(m => m[1].trim());
eq(rowAnims.length, 0,
  `no control in the toolbar row declares an inline animation (found ${JSON.stringify(rowAnims)})`);
const drawerAnims = [...stripHtml(DRAWER).matchAll(/animation:\s*([^;"']+)/g)].map(m => m[1].trim());
eq(drawerAnims.length, 0,
  `and neither does the account CTA in the mobile drawer (found ${JSON.stringify(drawerAnims)})`);

/* The two names that used to be there, gone from the markup rather than merely
   shortened. */
for (const kf of ['navSignInGlow', 'navSignInAttention']) {
  eq((elementsOnly(HTML).match(new RegExp(kf, 'g')) || []).length, 0,
    `no element in index.html names ${kf} on an inline style attribute any more`);
}

/* ── AND IN THE JS THAT REBUILDS THE SAME BUTTON ──────────────────────────
   compare-hub.js writes #nav-auth-desktop.innerHTML whenever auth state
   resolves, from a template that carried the identical inline animation. Fixing
   index.html alone would have looked fixed for one paint and then pulsed again a
   few hundred milliseconds later, on every load, which is worse than not fixing
   it: it would have read as a rendering bug rather than a decision. */
must(/#nav-auth-desktop|nav-auth-desktop/.test(HUB) || /desktop\.innerHTML/.test(HUB),
  'compare-hub.js no longer re-renders the account cluster; this section has nothing to guard');
must(HUB.includes('JOIN THE PEOPLE'), 'compare-hub.js no longer renders the JOIN THE PEOPLE button');
const hubAnims = [...HUB.matchAll(/animation:\s*navSignIn[^;"'`]*/g)].map(m => m[0]);
eq(hubAnims.length, 0,
  `the JS re-render carries no resting animation either (found ${JSON.stringify(hubAnims)})`);
eq((HUB.match(/navSignInAttention/g) || []).length, 0, 'and no reference to the retired scale-jump keyframe');

/* ── THE MANDATE BUTTON, AT REST ─────────────────────────────────────────── */
const CSS = stripCss(APPCSS);
const restRule = CSS.match(/\.nav-mandate-btn\s*\{([^}]*)\}/);
must(restRule, '.nav-mandate-btn no longer has a resting rule in app.css');
ok(!/animation\s*:/.test(restRule[1]), 'the Mandate button declares no animation at rest');
const hoverRule = CSS.match(/\.nav-mandate-btn:hover[^{]*\{([^}]*)\}/);
must(hoverRule, '.nav-mandate-btn:hover is gone from app.css');
ok(/animation\s*:/.test(hoverRule[1]), 'and its motion is on :hover, where a reader has reached for it');
ok(/focus-visible/.test(CSS.match(/\.nav-mandate-btn:hover[^{]*\{/)[0]),
  'keyboard focus gets the same answer as a pointer');

/* ───────────────────────────────────────────────────────────────────────────
   2 · MOVED, NOT DELETED — AND THE ATTENTION KEYFRAMES DELETED, NOT PARKED
   ─────────────────────────────────────────────────────────────────────────── */
section('2 · the motion was moved; the attention-grabs were deleted');

ok(/@keyframes\s+navSignInGlow\b/.test(CSS), 'navSignInGlow still exists — the glow was moved, not thrown away');
ok(/@keyframes\s+nav-mandate-flash\b/.test(CSS), 'nav-mandate-flash still exists');
ok(/@keyframes\s+mandate-gradient-sweep\b/.test(CSS), 'mandate-gradient-sweep still exists');
ok(/#nav-auth-desktop > button:hover[\s\S]{0,120}?animation:\s*navSignInGlow/.test(W),
  'the account CTA wears its old glow on hover');
ok(/animation:\s*mandate-gradient-sweep[^;]*nav-mandate-flash/.test(hoverRule[1]),
  'and Mandate wears both of its old effects on hover');

/* A keyframe whose only job is to jerk a settled control back into notice has no
   non-attention-seeking use, so it is deleted rather than left defined. A parked
   keyframe is how one comes back. */
for (const kf of ['navSignInAttention', 'nav-mandate-attention']) {
  eq((CSS.match(new RegExp('@keyframes\\s+' + kf + '\\b', 'g')) || []).length, 0,
    `the ${kf} scale-jump keyframe is gone from app.css, not parked`);
  eq((CSS.match(new RegExp(kf, 'g')) || []).length, 0, `and ${kf} is referenced nowhere in app.css`);
}
/* …and nowhere else in the shipped source either. */
for (const [f, src] of [['index.html', elementsOnly(HTML)], ['compare-hub.js', HUB]]) {
  for (const kf of ['navSignInAttention', 'nav-mandate-attention']) {
    eq((src.match(new RegExp(kf, 'g')) || []).length, 0, `${kf} is gone from ${f}`);
  }
}

/* ───────────────────────────────────────────────────────────────────────────
   3 · SIGN-IN SURVIVES INTACT
   Toning a CTA down is one edit away from quietly demoting it. It is not demoted.
   ─────────────────────────────────────────────────────────────────────────── */
section('3 · sign-in is quieter, not smaller and not gone');

const authAt = ROW.indexOf('id="nav-auth-desktop"');
must(authAt > 0, 'the account cluster is gone from the toolbar row');
const AUTH = ROW.slice(authAt);
ok(/<span>JOIN THE PEOPLE<\/span>/.test(AUTH), 'the button still says JOIN THE PEOPLE');
ok(/>FREE</.test(AUTH), 'the FREE chip is still there');
ok(/openAuthModal\(\)/.test(AUTH), 'and it still opens the auth modal');
ok(/<svg/.test(AUTH), 'its icon is still there');
ok(/font-size:10px/.test(AUTH), 'at the same type size as before');
ok(/padding:4\.5px 10px/.test(AUTH), 'and the same padding — nothing was shrunk to quiet it');
ok(/from-crimson-600/.test(AUTH), 'it keeps its crimson fill: still a filled CTA, just not a beacon');
ok(/hover:scale-105/.test(AUTH), 'and it still answers a pointer');

/* Resting shadow stated, and it is a neutral drop shadow rather than a coloured
   bloom — the account cluster is the bottom of the ladder, not a peer of the
   pills. */
const authRest = W.match(/#nav-auth-desktop > button\s*\{([^}]*)\}/);
must(authRest, 'the weight block no longer states the account button\'s resting shadow');
ok(/box-shadow/.test(authRest[1]), 'the resting state is declared, not left to chance');
ok(!/animation/.test(authRest[1]), 'and it does not animate');
ok(!/rgba\(192,21,42/.test(authRest[1]),
  'the resting shadow carries no crimson bloom — that is what hover is for');

/* The drawer's copy of the same control, likewise intact. */
ok(/<span>JOIN THE PEOPLE<\/span>/.test(DRAWER), 'the drawer CTA still says JOIN THE PEOPLE');
ok(/padding:14px 16px/.test(DRAWER), 'at its full drawer size');

/* ───────────────────────────────────────────────────────────────────────────
   4 · THE LADDER
   ─────────────────────────────────────────────────────────────────────────── */
section('4 · one ladder: the primary path is the loudest thing at rest');

/* Rung 1 — the three primary pills are the ONLY controls in the bar wearing a
   coloured glow at rest, and they are the three the request names. */
const glowing = [...ROW.matchAll(/href="(#[^"]*)"[^>]*box-shadow:0 0 16px/g)].map(m => m[1]);
eq(glowing.length, 3, `exactly three controls in the bar glow at rest (found ${JSON.stringify(glowing)})`);
eq(glowing.slice().sort().join(','), '#my-politicians,#say-vs-do,#who-represents-me',
  'and they are the front step and the two doors — nothing else');

/* Rung 1 vs rung 3 — Mandate used to be heavier than the pills it sat beside. */
const PILL = 'font-condensed font-700 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg';
eq((ROW.match(new RegExp(PILL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 3,
  'the three pills share one signature, at font-weight 700');
const mandateWeight = parseInt((restRule[1].match(/font-weight:\s*(\d+)/) || [])[1], 10);
eq(mandateWeight, 700, 'Mandate is font-weight 700 — level with the pills, no longer above them at 800');
ok(!/box-shadow/.test(restRule[1]), 'and it carries no resting glow of its own');

/* Rung 4 — the gateways are text. No fill, no glow, and their blue/gold coding
   is left alone: it distinguishes three menus, which is meaning, not emphasis. */
const gateways = [...ROW.matchAll(/<a[^>]*class="pdx-navmenu__btn[^"]*"[^>]*>/g)].map(m => m[0]);
eq(gateways.length, 3, 'three gateway triggers');
for (const g of gateways) {
  ok(!/background:/.test(g), 'a gateway trigger carries no fill');
  ok(!/box-shadow:/.test(g), 'and no glow');
  const label = (g.match(/text-(blue|gold)-300/) || [])[0];
  ok(!!label, `and keeps its colour coding (${label || 'none'})`);
}

/* Rung 5 — the bell. Quietest filled thing in the bar, and it stays that way. */
const bell = ROW.match(/<button id="wc-bell"[^>]*>/);
must(bell, 'the bell is gone from the toolbar row');
ok(/background:rgba\(255,255,255,0\.0\d\)/.test(bell[0]), 'the bell rests on a near-transparent fill');
ok(!/animation/.test(bell[0]), 'and does not animate');

/* ───────────────────────────────────────────────────────────────────────────
   5 · REDUCED MOTION
   ─────────────────────────────────────────────────────────────────────────── */
section('5 · a reader who asked for less motion gets none');

const rm = W.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n    \}/);
must(rm, 'the weight block has no prefers-reduced-motion query');
ok(/animation:\s*none/.test(rm[1]), 'the query switches animation off');
for (const sel of ['#nav-auth-desktop > button:hover', '#pdx-topnav .nav-mandate-btn:hover']) {
  ok(rm[1].includes(sel), `it covers ${sel}`);
}
for (const sel of ['focus-visible']) ok(rm[1].includes(sel), 'and the keyboard path too');

/* ───────────────────────────────────────────────────────────────────────────
   6 · THIS IS PAINT, NOT ARCHITECTURE
   ─────────────────────────────────────────────────────────────────────────── */
section('6 · no new destinations, no new pills, Phase 0 labels intact');

/* Counts, not a pinned list of hrefs: the guard is "the bar did not grow", and a
   list would also fail on a dropdown item being reworded. */
eq((ROW.match(new RegExp(PILL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 3, 'still three pills');
eq((ROW.match(/class="nav-link clr-voter/g) || []).length, 3, 'still three ballot-related text links');
eq((ROW.match(/class="pdx-navmenu"/g) || []).length, 3, 'still three gateway menus');
eq((ROW.match(/nav-mandate-btn/g) || []).length, 1, 'still one Mandate button');
eq((ROW.match(/id="wc-bell"/g) || []).length, 1, 'still one bell');
eq((ROW.match(/id="nav-auth-desktop"/g) || []).length, 1, 'still one account cluster');

/* The block is spacing-neutral and stacking-neutral: it changes how loud a control
   is, and nothing else. */
for (const prop of ['display', 'visibility', 'pointer-events', 'opacity', 'z-index', 'position',
                    'transform', 'order', 'width', 'height', 'padding', 'margin', 'font-size',
                    'gap', 'column-gap', 'row-gap']) {
  ok(!new RegExp('[;{]\\s*' + prop + '\\s*:').test(W),
    `the weight block declares no ${prop} — it is loudness, not layout`);
}
/* It must also not touch the measured vertical contract. */
for (const name of ['--pdx-chrome', '--pdx-hero', '#hero', 'scroll-padding-top']) {
  ok(!W.includes(name), `the block never names ${name}`);
}

/* Phase 0 labels. Both retired strings survive in index.html as HTML comments
   that explain the rule — one records that the middle pill used to read "Check a
   Claim", the other states outright that three pills are not three doors. Neither
   is copy, and the assertion is against the markup with comments stripped, which
   is the only version a reader ever sees. */
const VISIBLE = stripHtml(HTML);
ok(ROW.includes('👁️ Find the Record'), 'the middle pill still reads Find the Record');
eq((VISIBLE.match(/Check a Claim/g) || []).length, 0, 'and "Check a Claim" appears in no visible copy');
eq((VISIBLE.match(/three doors/gi) || []).length, 0, 'no "three doors" copy anywhere on the page');
ok((HTML.match(/Check a Claim/g) || []).length > 0,
   'the retired label survives only in the comment that explains why it was retired');

/* Who Represents Me is a front step into the homepage's own front door — a
   same-page fragment plus the shared location picker — not a third product
   surface with a name of its own. */
const wrm = ROW.match(/<a href="#who-represents-me"[^>]*>/);
must(wrm, '🏛️ Who Represents Me is gone from the bar');
ok(/href="#who-represents-me"/.test(wrm[0]), 'it points at a same-page fragment, not a separate route');
ok(/pdxFindMyReps/.test(wrm[0]), 'and opens the same picker the rest of the app uses');

/* No party framing enters through the paint. The block's only colours are the
   crimson brand token, neutral black and a near-white steel — no red/blue pair
   standing for anything. */
const colours = [...W.matchAll(/rgba?\(([^)]*)\)/g)].map(m => m[1].replace(/\s/g, ''));
ok(colours.length > 0, 'the block does state colours');
for (const c of colours) {
  const [r, g, b] = c.split(',').map(Number);
  const neutral = Math.abs(r - g) < 45 && Math.abs(g - b) < 45;
  const crimson = r > 150 && g < 60 && b < 80;
  ok(neutral || crimson, `${c} is a neutral or the crimson brand token — no second party colour`);
}

if (fail) { console.error(`\n✗ top-nav weight: ${fail} of ${pass + fail} assertions failed\n`); process.exit(1); }
console.log(`\n✓ top-nav weight: all ${pass} assertions passed — nothing in the toolbar animates at rest, ` +
            `3 glows and they are the primary path, sign-in intact, motion on hover only\n`);
