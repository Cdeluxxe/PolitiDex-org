#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   test-mobile-profile-hierarchy.mjs — what a phone meets, and in what order
   ────────────────────────────────────────────────────────────────────────────
   A profile on a phone is a single column, so its running order IS its
   information architecture: whatever is declared first is what a reader meets,
   and anything below the second screen effectively does not exist. The order
   this file pins is:

     identity → compact Direction Match + tally → shape strip → ONE full bucket
     list → tap a row → the assembled dossier → the deeper reads, collapsed

   Each of these had failed at least once by drifting rather than by breaking,
   which is why they are pinned as facts rather than left to review:

     · THE SHAPE REACHES THE FIRST SCREEN. Four counts beside the number, in the
       index's own vocabulary, each one a door into that bucket. Counts only —
       one percentage per profile, and it is the one they sit beside.
     · AND IT REACHES THE LETTERHEAD, which is the first screen a DESKTOP reader
       gets: the ring sits in the header there, not a scroll above §1. Same four
       counts, same doors, nothing at all below the two-issue floor.
     · THE STRIP HANDS STRAIGHT TO THE LIST IT OPENS. The strip is a navigator —
       every segment and count selects a bucket in the index below it — and the
       basis table plus the three sharpest rows used to sit in between. On a phone
       that put the destination a screen and a half below the control. The strip's
       OWN closing prose was the last thing left in that gap, and it went too.
     · THE GRAPH IS A CONTROL, AT CONTROL SIZE. The wiring was always right; the
       segments were ten pixels tall, which is a hit rate, not a bug report.
     · THE ROW FACE IS A SUMMARY, AND THE FIGURE ON IT IS THE ISSUE'S OWN. One
       profile, one score. A row may print its own Direction Match, scoped and
       labelled, and only when the FORMAL lane decided that row.
     · NO BUCKET IS TRUNCATED. Every issue filed under the open bucket is listed.
     · THE DEEP READS ARE COLLAPSED, NOT DELETED. Bio, the brief's two columns and
       the three sharpest rows are all still there, all one tap away.
     · CANDIDATE SNAPSHOT IS FOR THIN RECORDS ONLY, and sits below Word vs Action.
     · THE FIXED CHROME IS MEASURED, NOT GUESSED. --pdx-chrome is written from the
       rendered nav, and the nav clears the notch itself.
     · THE DECK RESERVES ITS BOTTOM GAP ONCE, AND IS AS SHORT AS ITS TARGETS ALLOW.

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

const ORDER = ['tallyHtml', 'meansHtml', 'scopeStripHtml', 'compositionHtml', 'outcomesHtml',
               'shapeNotesHtml', 'basisHtml', 'topRowsHtml', 'gapsHtml', 'feedsHtml', 'methodHtml'];
const seq = (bodySrc.match(/\b[a-zA-Z]+Html\s*\(/g) || []).map((s) => s.replace(/\s*\($/, ''));
for (const name of ORDER) {
  must(seq.indexOf(name) !== -1, `headlineHtml no longer calls ${name}`);
}
const pos = (n) => seq.indexOf(n);

// The score's own explanation comes before anything that could be read as a second
// finding.
ok(pos('meansHtml') < pos('compositionHtml'),
  'order: the shape strip is declared before the line that says what the score measures');

// THE SHAPE REACHES THE FIRST SCREEN. On a phone the graph is a screen below the
// fold — the reader meets the percentage, the "what this measures" line and the
// scope strip first. The tally is the same four counts in the same vocabulary,
// declared immediately after the number they qualify, so "how much of this record
// pulls against itself" is answered on the first screen rather than the second.
eq(pos('tallyHtml'), 0,
  'order: the tally is no longer the first thing after the headline number. It exists to put the\n' +
  '    shape beside the figure it qualifies; anything declared in front of it pushes four counts\n' +
  `    off the first screen and back below the fold (sequence: ${seq.join(' → ')})`);
ok(pos('tallyHtml') < pos('compositionHtml'),
  'order: the tally is declared below the graph, where it repeats a picture the reader has\n' +
  '    already seen instead of previewing one they have not');

// THE ONE THAT KEEPS BREAKING: nothing between the navigator and its destination.
eq(pos('outcomesHtml'), pos('compositionHtml') + 1,
  'order: a block is declared between the shape strip and the issue index. The strip is a\n' +
  '    navigator — its segments and counts select a bucket in that index — and on a phone\n' +
  '    anything in this gap is a screen the reader crosses between tapping and arriving\n' +
  `    (sequence: ${seq.join(' → ')})`);

// The strip's own prose is part of that gap, and it went the same way as the rest.
ok(pos('shapeNotesHtml') > pos('outcomesHtml'),
  'order: the shape note is back above the issue index. It is three or four lines of reading\n' +
  '    between a control and the list it opens, which is the same failure as the basis table —\n' +
  '    it was simply inside compositionHtml rather than beside it, so the order check passed\n' +
  '    while the phone still showed the gap');

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

// ═════════════════════════════════════════════════════════════════════════════
// 8. The graph is a control, at control size
// ═════════════════════════════════════════════════════════════════════════════
// Every segment of the bar carries data-pdxwa-seg and switches the open bucket —
// that wiring was already correct and is driven in scripts/test-issue-index.mjs.
// What was wrong was the size: the segments rendered at 0.3rem of vertical
// padding, roughly ten device pixels, and a thumb aimed at a 10px band misses it
// more often than it hits. The miss is silent — nothing moves — so the strip read
// as decoration and a reader stopped trying. This pins the tap target instead of
// the wiring, because the wiring is not what failed on glass.
const segRule = /\.pdxwa-comp-seg\s*\{([^}]*)\}/.exec(WACSS);
must(segRule, 'word-action.css no longer has a .pdxwa-comp-seg rule');
const segMin = /min-height:\s*([\d.]+)rem/.exec(segRule[1]);
ok(segMin && parseFloat(segMin[1]) >= 2.75,
  'tap: a bar segment is under the 44px threshold on a phone. It is a button into a bucket, and\n' +
  '    the base rules in this file are the PHONE rules — the desktop query below may slim it\n' +
  `    back down, but the default has to be hittable (found: ${segRule[1].replace(/\s+/g, ' ').trim()})`);
ok(/touch-action:\s*manipulation/.test(segRule[1]),
  'tap: the bar does not opt out of double-tap zoom, so every tap on it waits ~300ms for a\n' +
  '    second one that is not coming');
for (const cls of ['.pdxwa-comp-b', '.pdxwa-tally-b']) {
  const r = new RegExp(cls.replace('.', '\\.') + '\\s*\\{([^}]*)\\}').exec(WACSS);
  must(r, `word-action.css no longer has a ${cls} rule`);
  ok(/min-height:\s*2\.75rem/.test(r[1]), `tap: ${cls} is under the 44px threshold`);
  ok(/touch-action:\s*manipulation/.test(r[1]), `tap: ${cls} does not opt out of double-tap zoom`);
}
// Tapping a count scrolls the index into view. Without a scroll margin the first
// bucket heading arrives under the modal's own sticky header, and the reader
// lands on rows with nothing saying which bucket they belong to.
ok(/\.pdxwa-oc\s*\{[^}]*scroll-margin-top:/.test(WACSS),
  'tap: the issue index reserves no scroll margin, so the destination of every count in the\n' +
  '    strip and the tally lands under the modal header');

// ═════════════════════════════════════════════════════════════════════════════
// 9. The deep sections are collapsed, not deleted
// ═════════════════════════════════════════════════════════════════════════════
// Three things sat above the fold that are context rather than findings: the bio,
// the brief's two columns, and the three sharpest rows. All three are still on
// the card in full; all three now open on a tap instead of by default.
must(WA.indexOf('function topRowsHtml') !== -1, 'word-action.js no longer has topRowsHtml');
const topSrc = WA.slice(WA.indexOf('function topRowsHtml'), WA.indexOf('function topRowsHtml') + 9000);
ok(/<details class="pdxwa-rows">/.test(topSrc),
  'collapse: the three sharpest rows render open again. Each is a full Said → Did → Standing →\n' +
  '    Receipts chain, so open they are roughly a phone screen of prose sitting between the\n' +
  '    reader and the list they had just filtered');
ok(/Where this number comes from/.test(topSrc),
  'collapse: the sharpest-rows disclosure lost its heading, so nothing says what is behind it');
ok(/pdxwa-rows-l/.test(topSrc) && /See the full breakdown/.test(topSrc),
  'collapse: the rows or the way onward were dropped rather than folded — nothing is deleted by\n' +
  '    this pass, it is all one tap away');

ok(/<details class="pdxbio"/.test(PF),
  'collapse: the biography renders open again. A bio is six to twelve lines above the record on\n' +
  '    every profile, which on a phone is most of the first screen spent on prose the reader can\n' +
  '    already see the name and office of');
ok(/-webkit-line-clamp:\s*3/.test(/\.pdxbio:not\(\[open\]\)\s*\.pdxbio-t\s*\{([^}]*)\}/.exec(CSS)?.[1] || ''),
  'collapse: the closed biography is not clamped to three lines, so the disclosure saves nothing');
ok((PF.match(/\$\{p\.bio\}/g) || []).length === 1,
  'collapse: the bio text is printed more than once — the clamp works by rendering one copy\n' +
  '    inside the <summary>, and a second copy is a screen reader reading the bio twice');
const bioCue = /\.pdxbio-cue\s*\{([^}]*)\}/.exec(CSS);
must(bioCue, 'app.css no longer has a .pdxbio-cue rule');
ok(/min-height:\s*2\.75rem/.test(bioCue[1]), 'collapse: the biography\'s expand control is under 44px');

const SPINE = read('profile-spine.js');
const SPINECSS = read('profile-spine.css');
ok(/<details class="pdxbr-fold">/.test(SPINE),
  'collapse: the brief\'s two blocks render open again — three issue buttons with a sentence of\n' +
  '    rationale each, and a tension card with a badge, headline, paragraph and control, all of\n' +
  '    it above the graph');
ok(/What defines them/.test(SPINE) && /Where the tension is/.test(SPINE),
  'collapse: a brief block lost its label, so a closed row says nothing about what it holds');
ok(/pdxbr-sigs/.test(SPINE) && /tensionCard\(pid, p, t\)/.test(SPINE),
  'collapse: the signature issues or the tension card were dropped rather than folded');
const foldRule = /\.pdxbr-fold-s\s*\{([^}]*)\}/.exec(SPINECSS);
must(foldRule, 'profile-spine.css no longer has a .pdxbr-fold-s rule');
ok(/min-height:\s*2\.75rem/.test(foldRule[1]), 'collapse: a brief row is under 44px');

// ═════════════════════════════════════════════════════════════════════════════
// 10. The deck came down again
// ═════════════════════════════════════════════════════════════════════════════
// The index lists its open bucket in full and untruncated by design, so the thing
// sitting closest to the deck on a phone is routinely the last row of a twenty-row
// list — a real control with a real destination. A deck overlapping it by ten
// pixels does not look broken; it quietly fails to open.
const NAKED = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const ctaMins = NAKED.match(/#modal-addteam-btn\s*\{[^}]*min-height:\s*(\d+)px/g) || [];
must(ctaMins.length > 0, '#modal-addteam-btn no longer sets a min-height in app.css');
const lastCta = parseInt(/min-height:\s*(\d+)px/.exec(ctaMins[ctaMins.length - 1])[1], 10);
eq(lastCta, 44,
  'deck: the primary CTA is not at the 44px threshold. Above it, the extra pixels buy nothing a\n' +
  '    reader can use and cost the last rows of the list below; under it, the control itself\n' +
  '    stops meeting the target');
// index.html holds the same button at its own width and is later in the document,
// so a trim in app.css alone changes nothing at all.
const htmlCta = (HTML.match(/#modal-addteam-btn[^{]*\{[^}]*min-height:\s*(\d+)px/g) || []);
must(htmlCta.length > 0, 'index.html no longer sets #modal-addteam-btn min-height');
ok(htmlCta.every((r) => parseInt(/min-height:\s*(\d+)px/.exec(r)[1], 10) <= 44),
  'deck: index.html still holds the CTA above 44px. Its <style> block is later in the document\n' +
  '    than the app.css link, so it wins on file order and a trim in app.css alone is invisible\n' +
  `    (found: ${htmlCta.join(' | ')})`);
// Everything that is still a target is still a target.
ok(/#modal-action-strip\s*>\s*\*\s*\{[^}]*min-height:\s*44px/.test(NAKED),
  'deck: an engagement control dropped below 44px — the deck got shorter by trimming air, not\n' +
  '    by shrinking controls');
const footFloor = /#modal-footer\s*\{\s*padding-bottom:\s*max\(([\d.]+)rem/.exec(NAKED);
must(footFloor, 'the deck\'s bottom reservation is no longer a max() with a rem floor');
ok(parseFloat(footFloor[1]) <= 0.2,
  'deck: the deck\'s bottom floor went back up. On a flat-bottomed phone the CTA row\'s own\n' +
  `    padding already separates the last button from the edge (found: ${footFloor[1]}rem)`);

// ═════════════════════════════════════════════════════════════════════════════
// 11. The shape is in the letterhead, on both layouts
// ═════════════════════════════════════════════════════════════════════════════
// Section 1 pins the tally's place INSIDE the card, which is what a phone reader
// meets: the ring drops to a full-width hero row and ⚖️ Word vs Action is the
// next screen. A desktop reader meets neither. The ring sits in the letterhead
// beside the photo and the name and the shape behind it was a section away, so
// the first glance — the only glance most visitors take — showed an average with
// nothing said about whether the record it averages agrees with itself.
//
// The counts, their equality with the graph and the taps are all driven in
// scripts/test-issue-index.mjs against the real modules. What is a property of
// the SOURCE, and pinned here, is where it mounts and what it refuses to do.
must(WA.indexOf('function headerTallyHtml') !== -1, 'word-action.js no longer has headerTallyHtml');
ok(/headerTallyMount:\s*headerTallyMount/.test(WA),
  'header: the letterhead tally is not published on PDXWordAction, so the profile builder has\n' +
  '    nothing to mount');
const htMount = PF.indexOf('PDXWordAction.headerTallyMount(');
must(htMount !== -1, 'profiles-full.js no longer mounts headerTallyMount');

// Placement: after the letterhead closes, before the quick-jump rail, and long
// before the section it drives. "Near the ring" is the whole requirement — a
// tally that renders below the nav rail is just a second copy of §1's block.
const heroScore = PF.indexOf('class="profile-hero-score"');
const navMount = PF.indexOf('${_navBar}');
const sectionMount = PF.indexOf('PDXWordAction.sectionHtml(');
must(heroScore !== -1 && navMount !== -1 && sectionMount !== -1,
  'the hero score block, the nav rail or the ⚖️ section mount moved out of profiles-full.js');
ok(htMount > heroScore,
  'header: the letterhead tally is declared before the ring it qualifies — four counts arriving\n' +
  '    ahead of the number they are the shape of');
ok(htMount < navMount,
  'header: the letterhead tally renders below the quick-jump rail, which is not the letterhead —\n' +
  '    it is the top of the body, and the reader has already left the header zone');
ok(htMount < sectionMount,
  'header: the letterhead tally renders after ⚖️ Word vs Action, which is the position it exists\n' +
  '    to avoid');

// A SIBLING OF THE LETTERHEAD, NOT A FOURTH COLUMN IN IT. .profile-hero is a flex
// row on a desktop and a two-column grid with a full-width score row on a phone.
// Mounted inside it, the strip is squeezed beside the ring on one layout and
// orphaned on the other; mounted under it, both layouts get the same thing.
const heroBlock = PF.slice(PF.indexOf('<div class="profile-hero">'), htMount);
const heroCloses = (heroBlock.match(/<div/g) || []).length - (heroBlock.match(/<\/div>/g) || []).length;
eq(heroCloses, 0,
  'header: the tally is mounted INSIDE the .profile-hero grid rather than under it. The hero is a\n' +
  '    flex row on a desktop and a two-column grid on a phone, and a fourth child is crushed on\n' +
  '    one layout and stranded on the other');

// NO INVENTED SHAPE. Same floor as the graph, so a profile the engine has not
// tested gets nothing rather than four zeroes under its name.
const htSrc = WA.slice(WA.indexOf('function headerTallyHtml'), WA.indexOf('function bindHeaderTally'));
must(htSrc.length > 200, 'headerTallyHtml is no longer a readable function body');
ok(/if \(!b \|\| b\.total < 2\) return '';/.test(htSrc),
  'header: the letterhead tally does not fail closed below the two-issue floor. Four greyed zeroes\n' +
  '    under a letterhead read as four findings about the person, when what is true is that the\n' +
  '    engine has not tested enough of the record to have a shape at all');
ok(/outcomeBuckets\(pid\)/.test(htSrc) && !/rankedRows|read\(|scopedRead/.test(htSrc),
  'header: the letterhead tally derives its own numbers instead of reading the one bucketing the\n' +
  '    graph and the index read — which is how the header comes to disagree with the card');
ok(!/%/.test(htSrc),
  'header: a percent sign appears in the letterhead tally. One score per profile, and it is the\n' +
  '    ring this block sits directly beneath');

// The plumbing that makes a control mounted outside the section work at all.
ok(/selectDetached\(uid, tok\);/.test(WA.slice(WA.indexOf('function selectBucket'), WA.indexOf('function armIndex'))),
  'header: selectBucket no longer moves the controls mounted outside the section, so the\n' +
  '    letterhead keeps reporting whichever bucket it painted with while the list shows another');
ok(/document\.getElementById\(uid\)/.test(WA.slice(WA.indexOf('function armIndex'), WA.indexOf('function armIndex') + 4000)),
  'header: the click handler cannot resolve an index from a uid, so a count with no section\n' +
  '    ancestor is inert — it reports a state and moves nothing');

// It is the shared tally component, so its 44px targets and its colours are the
// ones section 8 already pins. What this file adds is that an empty host takes up
// no room: the host is emitted on every profile, shape or not, so the warm
// repaint has somewhere to land.
ok(/\.pdxwa-htally-host:empty\s*\{[^}]*display:\s*none/.test(WACSS),
  'header: an empty letterhead-tally host still occupies space, so a profile with no shape yet\n' +
  '    carries a gap and a rule under its name saying nothing');
ok(/\.pdxwa-htally\s*\{/.test(WACSS),
  'header: the letterhead tally has no layout rule of its own');
ok(!/\.pdxwa-htally[^{]*\{[^}]*min-height:\s*[01](\.\d+)?rem/.test(WACSS),
  'header: the letterhead copy shrinks the shared tap target below the threshold section 8 pins');

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
