#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   test-mobile-profile-hierarchy.mjs — what a phone meets, and in what order
   ────────────────────────────────────────────────────────────────────────────
   A profile on a phone is a single column, so its running order IS its
   information architecture: whatever is declared first is what a reader meets,
   and anything below the second screen effectively does not exist. The order
   this file pins is:

     identity → brief → ⚖️ Direction Match → shape strip → ONE full bucket list
     → tap a row → the assembled dossier

   Each of these had failed at least once by drifting rather than by breaking,
   which is why they are pinned as facts rather than left to review:

     · THE STRIP HANDS STRAIGHT TO THE LIST IT OPENS. The strip is a navigator —
       every segment and count selects a bucket in the index below it — and the
       basis table plus the three sharpest rows used to sit in between. On a phone
       that put the destination a screen and a half below the control.
     · THE ROW FACE IS A SUMMARY, AND THE FIGURE ON IT IS THE ISSUE'S OWN. One
       profile, one score. A row may print its own Direction Match, scoped and
       labelled, and only when the FORMAL lane decided that row.
     · NO BUCKET IS TRUNCATED. Every issue filed under the open bucket is listed.
     · CANDIDATE SNAPSHOT IS FOR THIN RECORDS ONLY, and sits below Word vs Action.
     · THE FIXED CHROME IS MEASURED, NOT GUESSED. --pdx-chrome is written from the
       rendered nav, and the nav clears the notch itself.
     · THE DECK RESERVES ITS BOTTOM GAP ONCE.

   Source-level checks against the shipped files. The behaviour of the switcher,
   the four buckets and the dossier trip is covered by scripts/test-issue-index.mjs,
   which drives the real modules in a sandbox; this file pins the ORDER and the
   contracts that ordering rests on, which are properties of the source.

     node scripts/test-mobile-profile-hierarchy.mjs
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
  console.error(`\n✗ mobile-profile-hierarchy: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const WA = read('word-action.js');
const WACSS = read('word-action.css');
const PF = read('profiles-full.js');
const HTML = read('index.html');
const CSS = read('app.css');

must(WA.indexOf('function headlineHtml') !== -1, 'word-action.js no longer has headlineHtml');
must(PF.indexOf('_renderCandidateSnapshot') !== -1, 'profiles-full.js no longer has _renderCandidateSnapshot');
must(HTML.indexOf('--pdx-chrome') !== -1, 'index.html no longer declares --pdx-chrome');

// ═════════════════════════════════════════════════════════════════════════════
// 1. The card's running order — the strip hands straight to the list
// ═════════════════════════════════════════════════════════════════════════════
// headlineHtml assembles the card as one concatenation of block builders. Read the
// call sequence out of it, with comments stripped so a comment naming a builder
// cannot be mistaken for a call to it.
const bodyStart = WA.indexOf('var body = ', WA.indexOf('function headlineHtml'));
must(bodyStart !== -1, 'headlineHtml no longer assembles its card into `var body`');
const bodySrc = WA.slice(bodyStart, WA.indexOf('\n      return ', bodyStart))
  .replace(/\/\/[^\n]*/g, '');
must(bodySrc.length > 100 && bodySrc.length < 4000, 'the headlineHtml body block did not slice cleanly');

const ORDER = ['meansHtml', 'scopeStripHtml', 'compositionHtml', 'outcomesHtml',
               'basisHtml', 'topRowsHtml', 'gapsHtml', 'feedsHtml', 'methodHtml'];
const seq = (bodySrc.match(/\b[a-zA-Z]+Html\s*\(/g) || []).map((s) => s.replace(/\s*\($/, ''));
for (const name of ORDER) {
  must(seq.indexOf(name) !== -1, `headlineHtml no longer calls ${name}`);
}
const pos = (n) => seq.indexOf(n);

// The score's own explanation comes before anything that could be read as a second
// finding.
ok(pos('meansHtml') < pos('compositionHtml'),
  'order: the shape strip is declared before the line that says what the score measures');

// THE ONE THAT KEEPS BREAKING: nothing between the navigator and its destination.
eq(pos('outcomesHtml'), pos('compositionHtml') + 1,
  'order: a block is declared between the shape strip and the issue index. The strip is a\n' +
  '    navigator — its segments and counts select a bucket in that index — and on a phone\n' +
  '    anything in this gap is a screen the reader crosses between tapping and arriving\n' +
  `    (sequence: ${seq.join(' → ')})`);

// The supporting reads follow the thing they support.
ok(pos('basisHtml') > pos('outcomesHtml'),
  'order: the basis table is back above the issue index — it answers a question a reader asks\n' +
  '    after the issues, and it used to be the block sitting in the navigator gap');
ok(pos('topRowsHtml') > pos('outcomesHtml'),
  'order: the three sharpest rows are back above the issue index. They are rows the index\n' +
  '    lists again, so leading with them meets the same issues twice before the navigator');
ok(pos('methodHtml') === seq.length - 1 || pos('methodHtml') > pos('feedsHtml'),
  'order: the method note is no longer last');

// ═════════════════════════════════════════════════════════════════════════════
// 2. The row face — a summary, with the issue's own figure on it
// ═════════════════════════════════════════════════════════════════════════════
const rowSrc = WA.slice(WA.indexOf('function _outcomeRow'), WA.indexOf('function _outcomeRow') + 6000);
must(rowSrc.indexOf('pdxwa-oc-row') !== -1, '_outcomeRow no longer builds the row button');

// Required on the face.
ok(/pdxwa-oc-issue/.test(rowSrc), 'face: the row does not print the issue name');
// The spine is the issue's own colour, carried by issueSkin() — the same source the
// dossier header and the stance cards read, so healthcare looks like healthcare in
// every bucket it appears in rather than taking the colour of the bucket it fell into.
ok(/issueSkin\(r\.key\)/.test(rowSrc) && /skin\.cls/.test(rowSrc) && /skin\.style/.test(rowSrc),
  'face: the row lost its issue-colour spine — without it the only colour on the line is the\n' +
  '    bucket\'s, and the same issue reads as unrelated to itself one bucket over');
ok(/pdxwa-oc-said/.test(rowSrc), 'face: the row does not print what they said — the stated direction is half of\n' +
  '    "word vs action" and a result without it is a verdict with no claim attached');
ok(/pdxwa-oc-cue/.test(rowSrc), 'face: the row does not print the bucket result cue');
ok(/_outcomePct\(/.test(rowSrc), 'face: the row does not carry the per-issue figure');
ok(/pdxwa-oc-meta/.test(rowSrc), 'face: the row prints no evidence counts');
ok(/pdxwa-oc-go/.test(rowSrc), 'face: the row lost the affordance that says it opens something');

// The cue and the figure are one unit. Split across two flex children they can wrap
// apart, and a bare percentage on a line of its own is the one reading of this that
// looks like a score.
ok(/pdxwa-oc-res/.test(rowSrc),
  'face: the result cue and the per-issue figure are no longer wrapped in one group, so the\n' +
  '    word that qualifies the number can wrap away from it');

// NOT on the face. The dossier is one tap away and holds all of this.
for (const [needle, what] of [['mechanism', 'mechanism paragraphs'], ['instrument', 'instrument lists']]) {
  ok(rowSrc.toLowerCase().indexOf(needle) === -1,
    `face: the row face reaches for ${what} — the face is a summary and the dossier is one tap away`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. One score on a profile — the row figure is the issue's, and formal-lane only
// ═════════════════════════════════════════════════════════════════════════════
const pctSrc = WA.slice(WA.indexOf('function _outcomePct'), WA.indexOf('function _outcomeRow'));
must(pctSrc.indexOf('pdxwa-oc-pct') !== -1, '_outcomePct no longer renders the per-issue figure');

// It reads the shared helper rather than deriving a second answer.
ok(/PDXConsistency/.test(pctSrc) && /rowResult/.test(pctSrc),
  'score: the row figure is computed here instead of read from PDXConsistency.rowResult — two\n' +
  '    implementations of "what is this issue\'s percentage" is how one issue comes to carry two');

// The lane gate. rowResult also answers for a row the PUBLIC record decided, under
// its own metric name; that figure belongs on the stance row, not inside the
// score's own section, where a number appearing because receipts landed is
// indistinguishable from the public lane entering the score.
ok(/metric\s*!==\s*'Direction match'/.test(pctSrc),
  'score: the row figure is drawn for a row the formal lane did not decide — inside ⚖️ Word vs\n' +
  '    Action that reads as public items entering the Direction Match');

// Fail closed on an untested row rather than printing a 0 or a dash.
ok(/state\s*!==\s*'tested'/.test(pctSrc),
  'score: an untested row prints a figure — a 0% and "no record to test this" are different\n' +
  '    claims and the first one is a finding we do not have');

// Always scoped, in text, not only in a tooltip.
ok(/pdxwa-oc-pct-l/.test(pctSrc) && /this issue/.test(pctSrc),
  'score: the per-issue figure lost its visible scope label');
ok(/on this issue alone/.test(pctSrc),
  'score: the figure is not scoped in the accessible name — a bare "78%" read out after an\n' +
  '    issue name is the one form of this that can be heard as the profile\'s score');

// …and it is drawn small. The headline is the loudest number on the card; this one
// has to lose to it at a glance, which is a CSS fact, not a claim.
const sizeOf = (sel) => {
  const m = new RegExp('\\' + sel + '\\s*\\{[^}]*font-size:\\s*([\\d.]+)rem').exec(WACSS);
  return m ? parseFloat(m[1]) : NaN;
};
const headline = sizeOf('.pdxwa-num-v');
const rowPct = sizeOf('.pdxwa-oc-pct-v');
must(!Number.isNaN(headline) && !Number.isNaN(rowPct), 'the two figure sizes are no longer readable from word-action.css');
ok(headline >= rowPct * 3,
  `score: the per-issue figure has grown into the headline's range (${rowPct}rem vs ${headline}rem).\n` +
  '    The only thing stopping a row figure from reading as the profile score is that it is\n' +
  '    plainly a smaller number in a smaller place');
// It also has to lose to the issue name it qualifies, or the row reads as a number
// with a label rather than an issue with a result.
const issueName = sizeOf('.pdxwa-oc-row');
must(!Number.isNaN(issueName), '.pdxwa-oc-row no longer sets a font-size');
ok(rowPct < issueName, 'score: the per-issue figure is set larger than the row it sits on');

// ═════════════════════════════════════════════════════════════════════════════
// 4. One full bucket list, never truncated
// ═════════════════════════════════════════════════════════════════════════════
const panelSrc = WA.slice(WA.indexOf('var panels = live.map'), WA.indexOf('var panels = live.map') + 2000);
must(panelSrc.indexOf('_outcomeRow') !== -1, 'the bucket panels no longer render rows through _outcomeRow');
ok(/list\.map\(_outcomeRow\)/.test(panelSrc),
  'bucket: the open bucket no longer lists every row it holds. A capped bucket is a fold, and a\n' +
  '    fold is where reading stops — the issues past it are the ones nobody sees');
ok(!/\.slice\(\s*0\s*,/.test(panelSrc),
  'bucket: a panel truncates its list');
// The count in the heading is the length of the list under it, so a truncation
// anywhere would show up as a heading that disagrees with what is below it.
ok(/pdxwa-oc-n">' \+ list\.length/.test(panelSrc),
  'bucket: the panel heading no longer counts the rows it actually rendered');

// ═════════════════════════════════════════════════════════════════════════════
// 5. Candidate Snapshot — thin records only, and below Word vs Action
// ═════════════════════════════════════════════════════════════════════════════
const snapAt = PF.indexOf('window._renderCandidateSnapshot');
must(snapAt !== -1, 'profiles-full.js no longer defines window._renderCandidateSnapshot');
ok(/isThin\)\s*return\s*'';/.test(PF.slice(snapAt, snapAt + 600)),
  'snapshot: the card no longer bails on a profile with a scorable record — it is the block that\n' +
  '    used to sit between a reader and the product on every profile');

// One invocation, so there is one gate. (The definition is an assignment —
// `window._renderCandidateSnapshot = function` — so it does not match this.)
const callSites = (PF.match(/_renderCandidateSnapshot\(/g) || []).length;
eq(callSites, 1,
  'snapshot: the card is invoked from more than one place. A second call site is a second copy of\n' +
  '    the thin-record gate, and the gate is the only thing keeping this card off a scorable profile');
ok(/_renderCandidateSnapshot\(id,\s*p,\s*\{\s*isThin:\s*_isThinProfile\s*\}\)/.test(PF),
  'snapshot: the mount no longer passes the thin-record gate');
ok(/_isThinProfile\s*=\s*scoreNum === null/.test(PF),
  'snapshot: "thin" no longer means "has no score" — a profile with a Direction Match is not thin\n' +
  '    however little else is on it');

const mountAt = PF.indexOf('${candidateSnapshot || thinNotice}');
const waAt = PF.indexOf('PDXWordAction.sectionHtml(');
must(mountAt !== -1 && waAt !== -1, 'the snapshot mount or the Word vs Action mount was renamed');
ok(waAt < mountAt,
  'snapshot: the Candidate Snapshot is mounted above ⚖️ Word vs Action again — on a phone that is\n' +
  '    the whole first screen spent on a placeholder for the section below it');

// ═════════════════════════════════════════════════════════════════════════════
// 6. The fixed chrome is measured, not guessed
// ═════════════════════════════════════════════════════════════════════════════
ok(/<nav id="pdx-topnav"/.test(HTML),
  'chrome: the fixed nav has no id, so nothing can measure it');
ok(/#pdx-topnav\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/.test(HTML),
  'chrome: the nav does not clear the notch itself. This document is viewport-fit=cover, so a\n' +
  '    fixed top:0 element starts under the status bar and pushes its own rows down the page');
ok(/setProperty\('--pdx-chrome'/.test(HTML),
  'chrome: --pdx-chrome is never written from a measurement, so it is back to being a constant\n' +
  '    that is wrong by exactly the safe-area inset on the phones that reported the clipped brand');
ok(/ResizeObserver/.test(HTML.slice(HTML.indexOf('setProperty(\'--pdx-chrome\'') - 3000,
                                    HTML.indexOf('setProperty(\'--pdx-chrome\'') + 2000)),
  'chrome: the measurement does not observe the nav, so it only ever runs on resize');

// Every consumer still reads the variable. A literal clearance anywhere is a second
// guess that the measurement cannot correct.
const heroPads = HTML.match(/#hero\s*\{[^}]*padding-top:[^;]+;/g) || [];
must(heroPads.length >= 2, 'the hero clearance rules were renamed');
ok(heroPads.every((r) => r.indexOf('var(--pdx-chrome') !== -1),
  'chrome: a #hero clearance is stated as a literal instead of chrome + air. Both of the hand-\n' +
  '    written values this replaced were smaller than the chrome they were clearing, which is\n' +
  `    exactly how POLITIDEX ended up under the search bar (found: ${heroPads.join(' | ')})`);
ok(/scroll-padding-top:\s*calc\(var\(--pdx-chrome/.test(CSS),
  'chrome: html no longer offsets its scroll padding by the chrome, so an in-page jump lands its\n' +
  '    target under the nav');

// ═════════════════════════════════════════════════════════════════════════════
// 7. The deck's bottom gap is reserved once and sized once
// ═════════════════════════════════════════════════════════════════════════════
// The single-reservation rule itself is pinned by scripts/test-modal-bottom-chrome.mjs.
// What this adds is that the deck's own air and the safe-area inset stopped being
// additive, and that the targets sit at the 44px threshold rather than above it.
ok(/#modal-footer\s*\{\s*padding-bottom:\s*max\([^)]*safe-area-inset-bottom/.test(CSS.replace(/\/\*[\s\S]*?\*\//g, '')),
  'deck: the bottom reservation is not a max() of the deck\'s air and the inset, so a notched\n' +
  '    phone pays for both — the same stacking bug one level down');
const stripPads = (CSS.replace(/\/\*[\s\S]*?\*\//g, '').match(/#modal-action-strip\s*\{[^}]*padding-bottom:[^;]+;/g) || []);
must(stripPads.length > 0, '#modal-action-strip no longer sets a bottom padding anywhere');
ok(/padding-bottom:\s*0\s*!important/.test(stripPads[stripPads.length - 1]),
  'deck: the engagement strip reserves its own bottom padding again, on top of the deck\'s');

console.log(
  failures.length
    ? ''
    : `✓ mobile profile hierarchy: all ${passed} assertions passed — strip → list with nothing between them`
);
if (failures.length) {
  console.error(`\n✗ mobile profile hierarchy: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
