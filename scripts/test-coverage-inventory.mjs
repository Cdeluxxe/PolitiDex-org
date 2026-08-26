/* ═══════════════════════════════════════════════════════════════════════════
   test-coverage-inventory.mjs — counts beside the findings, never a grade
   ────────────────────────────────────────────────────────────────────────────
   Phase 4 put one line under the headline findings: how much formal record we
   hold on this official, how much of their own word we have tested against it,
   how many gaps are still open, and when the file last grew.

   That line is the single most tempting place in the product to grow a second
   score. It sits beside a percentage, it is made of counts, and the distance
   between "18 formal acts across 6 issues" and "coverage: 62% (fair)" is one
   helpful-seeming commit. So this suite is not about whether the line renders.
   It is about the four things it must never become:

     1. A GRADE. No tier, no adjective, no letter, no "data quality" verdict.
        A reader decides for themselves what a four-act file is worth; packaging
        that judgement as ours would turn our own coverage into a finding about
        the politician.
     2. A SECOND PERCENTAGE. The profile carries exactly one, and it is Direction
        Match. A number with a % beside it reads as a competing figure whatever
        the label says.
     3. A RATIO OVER THE ISSUE VOCABULARY. "6 of 118 issues" measures the size of
        our vocabulary, not the depth of the file. consistency.js's formal index
        has refused that denominator since it was written; the inventory carries
        no denominator at all.
     4. AN ESTIMATE. Every clause is read off a surface that already computed and
        already prints it. A cold source drops its clause — it is never guessed,
        and it is never backfilled with a zero standing in for a fact.

   And one honesty rule that is not about scoring: with nothing held, the line
   renders nothing at all, because the surface's own refusal sentence ("We do not
   yet hold documented word for this record…") is the correct answer and a
   "0 · 0 · 0" line would be furniture standing where an admission belongs.

   Sections:
     1. Load + shape
     2. The clauses are counts, in print order
     3. NOT A GRADE — the source-level wall
     4. NO PERCENTAGE, NO RATIO, NO DENOMINATOR
     5. Cold sources drop clauses, they never estimate
     6. Nothing held → nothing printed
     7. `omit` — no surface prints one fact twice
     8. The gaps clause is a door, not a verdict
     9. Freshness is the record's date, never the clock
    10. Wiring: script tag, precache, mount points, one composer
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg}\n    missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg}\n    found ${JSON.stringify(needle)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ coverage inventory: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

const INV_SRC = read('inventory.js');
const CONS_SRC = read('consistency.js');
const WA_SRC = read('word-action.js');
const CARD_SRC = read('profile-card.js');
const INDEX = read('index.html');
const SW = read('sw.js');

// ═════════════════════════════════════════════════════════════════════════════
// A world whose four sources can each be made cold
// ═════════════════════════════════════════════════════════════════════════════
// The inventory is a pure function of what four already-shipped surfaces return,
// so the world is exactly those four stubs. Each can be set to null to model the
// module not being on the page — which is the normal state on a first paint, and
// the state section 5 is about.
function build({
  formal = { issues: 6, judged: 18 },     // PDXConsistency.formalPatternIndex.shape()
  word = { word: 9, tested: 4, untested: 5 }, // PDXWordAction.read().coverage
  gaps = 3,                                // PDXGaps.count()
  records = [{ date: '2026-03-11' }, { date: '2025-12-02' }],
  person = { name: 'Cory Booker' },
  gapsJump = null
} = {}) {
  const win = {};
  const styles = [];
  const jumps = [];
  const el = () => {
    const e = { id: '', textContent: '', _kids: [] };
    e.appendChild = (k) => { e._kids.push(k); return k; };
    return e;
  };
  const head = el();
  const ctx = {
    window: win,
    navigator: {},
    document: {
      head,
      getElementById: (id) => styles.find((s) => s.id === id) || null,
      createElement: () => el(),
      querySelector: () => null,
      querySelectorAll: () => []
    },
    setTimeout: (fn) => { return 0; },
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.addEventListener = () => {};
  head.appendChild = (n) => { styles.push(n); return n; };

  if (formal) win.PDXConsistency = { formalPatternIndex: { shape: () => formal } };
  if (word) win.PDXWordAction = { read: () => ({ coverage: word }) };
  if (gaps !== null) win.PDXGaps = Object.assign({ count: () => gaps }, gapsJump ? { jump: gapsJump } : {});
  if (records) win.PDXVotingRecord = { memberRecords: () => records };
  if (person) win.PROFILES = { booker: person };

  vm.runInContext(INV_SRC, ctx, { filename: 'inventory.js' });
  must(win.PDXInventory, 'inventory.js did not publish window.PDXInventory');
  return { win, I: win.PDXInventory, styles, jumps, ctx };
}

// ═════════════════════════════════════════════════════════════════════════════
section('1 · load + shape');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { I } = build();
  ['read', 'clauses', 'text', 'lineHtml'].forEach((k) => {
    ok(typeof I[k] === 'function', `PDXInventory.${k} is missing from the public API`);
  });
  // Idempotent load — index.html defers a dozen modules and a double-execution
  // must not double-register anything.
  has(INV_SRC, 'if (window.PDXInventory) return;', 'inventory.js re-registers on a second execution');

  const iv = I.read('booker');
  eq(iv.formal.acts, 18, 'read() lost the formal act count');
  eq(iv.formal.issues, 6, 'read() lost the formal issue count');
  eq(iv.word.held, 9, 'read() lost the held-word count');
  eq(iv.word.tested, 4, 'read() lost the tested-word count');
  eq(iv.gaps, 3, 'read() lost the open-gap count');
  eq(iv.updated.iso, '2026-03-11', 'read() did not take the NEWEST record date');
  eq(iv.held, true, 'a record with 18 acts is not marked as held');
  eq(I.read('').held, false, 'read() with no pid claims to hold something');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the clauses are counts, in print order');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { I } = build();
  const keys = I.clauses('booker').map((c) => c.key);
  eq(keys.join(','), 'formal,word,gaps,updated',
    'the clause order changed — a reader asks what the record did, then what we hold them saying, then what is missing, then when it grew');

  const t = I.text('booker');
  eq(t, '18 formal acts across 6 issues · 4 of 9 stated positions tested · 3 open gaps · updated Mar 2026',
    'the inventory line is not the shape the brief asked for');

  // Every clause carries its noun. A bare number in a row of numbers is a score.
  I.clauses('booker').forEach((c) => {
    ok(/[a-z]{3}/.test(c.text), `the ${c.key} clause is a bare number with no noun attached`);
  });

  // Singulars, because "1 formal acts across 1 issues" is the tell of a surface
  // that was never read by a human on a thin file — the exact files this line
  // exists for.
  const one = build({ formal: { issues: 1, judged: 1 }, word: { word: 1, tested: 1 }, gaps: 1 }).I;
  eq(one.text('booker'),
    '1 formal act across 1 issue · 1 of 1 stated position tested · 1 open gap · updated Mar 2026',
    'the thin-file singulars are wrong');

  // Zero held word is inventory too — it is the "missing" half, and on a record
  // with acts and no word it is the most useful thing the line can say.
  const noWord = build({ word: { word: 0, tested: 0 } }).I;
  has(noWord.text('booker'), 'no stated positions on file yet',
    'a record with formal acts and no word on file says nothing about the missing half');
  no(noWord.text('booker'), '0 of 0', 'the empty word ledger printed a 0-of-0 ratio');
}

// ═════════════════════════════════════════════════════════════════════════════
section('3 · not a grade — the source-level wall');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The words a coverage line grows into. Checked against the CODE, not the
  // doctrine comments, which say several of them in order to refuse them.
  // Block comments AND line comments come out: the doctrine header at the top of
  // inventory.js says most of these words in order to forbid them, and the wall it
  // draws is the reason this section can be strict about the code below it.
  const codeOnly = INV_SRC
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
  const GRADES = [
    'quality', 'confidence', 'grade', 'tier', 'rating', 'score',
    'strong', 'weak', 'poor', 'good', 'excellent', 'fair', 'thorough',
    'incomplete', 'sparse', 'robust', 'reliab', 'trustworth'
  ];
  GRADES.forEach((w) => {
    ok(!codeOnly.toLowerCase().includes(w),
      `inventory.js emits "${w}" — the line is an inventory of what we hold, not a verdict on it`);
  });

  // No adjective reaches the reader either: every string the module can print is
  // a count, a noun, a date or a connective.
  const { I } = build();
  const rendered = I.lineHtml('booker');
  GRADES.forEach((w) => {
    ok(!rendered.toLowerCase().includes(w), `the rendered line says "${w}"`);
  });

  // And no colour ramp. A red/amber/green treatment is a grade with the words
  // filed off — the CSS has one colour for the line and one for its numbers.
  const css = (INV_SRC.match(/var css =[\s\S]*?;\n/) || [''])[0];
  ['#f87171', '#ef4444', '#fbbf24', '#f59e0b', '#22c55e', '#4ade80'].forEach((c) => {
    no(css, c, `inventory.js ships the traffic-light colour ${c} — a colour ramp is a grade`);
  });

  // The doctrine is written down where the next editor will read it.
  has(INV_SRC, 'NOT a grade', 'inventory.js does not state the rule it is built around');
  has(INV_SRC, 'NOT a percentage', 'inventory.js does not refuse a percentage in writing');
  has(INV_SRC, 'NOT a ratio over the issue vocabulary', 'inventory.js does not refuse the vocabulary denominator');
  has(INV_SRC, 'NOT a second engine', 'inventory.js does not state that it computes nothing of its own');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4 · no percentage, no ratio over the vocabulary, no denominator');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { I } = build();
  const line = I.lineHtml('booker');
  no(line, '%', 'the inventory line contains a percent sign — the profile has exactly one percentage and it is Direction Match');
  no(INV_SRC.replace(/^\s*\/\/.*$/gm, ''), "'%'", 'inventory.js builds a percent sign');
  ok(!/\bMath\.round\s*\(\s*100/.test(INV_SRC), 'inventory.js computes a percentage');
  ok(!/\/\s*(total|all|Object\.keys)/.test(INV_SRC), 'inventory.js divides one count by another');

  // ISSUE_MAP is the 118-key vocabulary. The module must not read it at all: the
  // only way to print "6 of 118 issues" is to know what 118 is.
  const invCode = INV_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  no(invCode, 'ISSUE_MAP', 'inventory.js reads the issue vocabulary — the only reason to would be a denominator');
  no(invCode, 'ISSUE_KEYS', 'inventory.js reads the issue key list');

  // The one "N of M" in the line is inside a single lane (positions tested out of
  // positions held), which is a fact about that lane and has a real denominator.
  // It must never be issues-out-of-vocabulary.
  const t = I.text('booker');
  has(t, '4 of 9 stated positions tested', 'the word clause lost its own within-lane denominator');
  ok(!/of \d+ issues/.test(t), 'the formal clause grew a denominator over the issue vocabulary');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5 · a cold source drops its clause — it never estimates');
// ═════════════════════════════════════════════════════════════════════════════
{
  // inventory.js loads before consistency.js and word-action.js have painted, and
  // on an overlay neither may ever be there. Each missing source costs exactly its
  // own clause.
  const noFormal = build({ formal: null }).I;
  const keysA = noFormal.clauses('booker').map((c) => c.key);
  ok(!keysA.includes('formal'), 'a cold formal index still printed a formal clause');
  ok(keysA.includes('word') && keysA.includes('gaps'), 'a cold formal index took the other clauses with it');
  no(noFormal.text('booker'), '0 formal', 'a cold formal index was reported as zero acts');

  const noWordMod = build({ word: null }).I;
  ok(!noWordMod.clauses('booker').map((c) => c.key).includes('word'),
    'a cold word ledger still printed a word clause');
  no(noWordMod.text('booker'), 'no stated positions on file yet',
    'a cold word ledger was reported as "no stated positions" — absent evidence is not evidence of absence');

  const noGaps = build({ gaps: null }).I;
  ok(!noGaps.clauses('booker').map((c) => c.key).includes('gaps'), 'a cold gaps module still printed a gap count');
  const zeroGaps = build({ gaps: 0 }).I;
  ok(!zeroGaps.clauses('booker').map((c) => c.key).includes('gaps'),
    'zero open gaps printed a "0 open gaps" chip instead of saying nothing');

  const noDates = build({ records: [] }).I;
  ok(!noDates.clauses('booker').map((c) => c.key).includes('updated'),
    'a record with no dated items still printed a freshness clause');

  // A source that throws is a cold source, not a broken page.
  const win = {};
  const thrown = build();
  thrown.win.PDXConsistency = { formalPatternIndex: { shape: () => { throw new Error('boom'); } } };
  let survived = true;
  try { thrown.I.lineHtml('booker'); } catch (e) { survived = false; }
  ok(survived, 'a throwing source took the whole line down with it');

  // ── A ZERO IS NOT A COLD SOURCE'S REPORT ────────────────────────────────
  // The failure a live check on a real file caught: consistency.js's formal index
  // answers with rows the moment the stance corpus is loaded, but `judged` stays 0
  // until the roll-call read lands. A present source with a zero count is
  // therefore the SAME VALUE as a genuinely empty record and a very different
  // fact, and the line printed "0 formal acts across 2 issues" — a finding of
  // nothing, assembled out of our own unfinished fetch.
  const zeroActs = build({ formal: { issues: 2, judged: 0 } }).I;
  const zk = zeroActs.clauses('booker').map((c) => c.key);
  ok(!zk.includes('formal'), 'a formal index with rows but nothing judged still printed a formal clause');
  no(zeroActs.text('booker'), '0 formal', 'a not-yet-read record was reported as zero formal acts');
  no(zeroActs.text('booker'), 'across 2 issues',
    'the issue count was printed with no acts to count across it');
  ok(zk.includes('word'), 'dropping the zero-act clause took the word clause with it');
  // One act is a real act and does print.
  const oneAct = build({ formal: { issues: 1, judged: 1 } }).I;
  has(oneAct.text('booker'), '1 formal act across 1 issue', 'a single judged act did not print');
  has(INV_SRC, 'NO ZERO-ACT CLAUSE', 'inventory.js does not state the zero-act rule');

  // Same rule on the word side. `warming` means the record read has not landed, so
  // every tested count is 0 because nothing has been tested YET — reporting
  // "0 of 33 tested" would publish a floor failure that has not happened.
  const warming = build({ word: { word: 33, tested: 0, untested: 33, warming: true } }).I;
  const wtext = warming.text('booker');
  has(wtext, '33 stated positions on file', 'a warming record did not report what it holds');
  no(wtext, 'tested', 'a warming record reported a tested count it cannot know yet');
  no(wtext, '0 of 33', 'a warming record printed a zero tested count');
  // Once the read lands, the tested half appears — same held count, more to say.
  const warm = build({ word: { word: 33, tested: 4, untested: 29, warming: false } }).I;
  has(warm.text('booker'), '4 of 33 stated positions tested',
    'a warm record did not report the tested count');
  // And a warm record with a genuine zero DOES say zero: that is a real read.
  has(build({ word: { word: 5, tested: 0, untested: 5, warming: false } }).I.text('booker'),
    '0 of 5 stated positions tested', 'a warm record with nothing tested hid the zero');

  // Every source read is individually guarded in the source.
  const guards = (INV_SRC.match(/catch \(e\) \{ return null; \}/g) || []).length;
  ok(guards >= 4, `expected each of the four sources to be individually guarded, found ${guards} null-returning guards`);
}

// ═════════════════════════════════════════════════════════════════════════════
section('6 · nothing held → nothing printed');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The empty record. No formal acts, no word, and (the important part) the gaps
  // module happily reporting gaps: a page of gaps is not a page of coverage, so
  // the line must still print nothing and leave the surface's own refusal
  // sentence standing alone.
  const empty = build({ formal: null, word: { word: 0, tested: 0 }, gaps: 4, records: [] }).I;
  eq(empty.read('booker').held, false, 'a record holding nothing is marked as held');
  eq(empty.lineHtml('booker'), '', 'an empty record printed a counts line where an honest refusal belongs');

  // A record with word and no formal acts IS held — that is a real, thin file.
  const wordOnly = build({ formal: null, word: { word: 2, tested: 0 } }).I;
  eq(wordOnly.read('booker').held, true, 'a record with stated positions and no formal acts is treated as empty');
  ok(wordOnly.lineHtml('booker').length > 0, 'a word-only record printed nothing');

  // No pid at all is not an error and not a line.
  eq(build().I.lineHtml(''), '', 'lineHtml with no pid printed something');
  has(INV_SRC, 'EMPTY IS SOMEBODY ELSE', 'inventory.js does not state the empty-state rule');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7 · `omit` — no surface prints one fact twice');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { I } = build();
  no(I.text('booker', null, { omit: ['formal'] }), 'formal act', 'omit:formal still printed the formal clause');
  no(I.text('booker', null, { omit: ['word'] }), 'stated position', 'omit:word still printed the word clause');
  no(I.text('booker', null, { omit: ['gaps'] }), 'open gap', 'omit:gaps still printed the gap clause');
  no(I.text('booker', null, { omit: ['updated'] }), 'updated', 'omit:updated still printed the freshness clause');
  eq(I.text('booker', null, { omit: ['formal', 'word', 'gaps', 'updated'] }), '',
    'omitting every clause still produced a line');
  eq(I.lineHtml('booker', null, { omit: ['formal', 'word', 'gaps', 'updated'] }), '',
    'omitting every clause produced an empty paragraph rather than nothing');

  // Each of the three mounts omits what its own host already says in its own
  // words. This is the whole reason `omit` exists, and it is the assertion that
  // catches a mount added later without it.
  //   · the record strip states nothing itself (its depth chip was replaced) → omits nothing
  //   · the formal index's lede is its own formal count                      → omits formal
  //   · the Direction Match tally is its own word ledger                     → omits word
  has(CONS_SRC, "_invLine(pid, ['formal'])",
    'the formal index prints the inventory WITH its formal clause, which its own lede already gave');
  has(WA_SRC, "omit: ['word']",
    'the Direction Match card prints the inventory WITH its word clause, which its own tally already gave');
  has(CARD_SRC, "omit: ['word', 'gaps', 'updated']",
    'the homepage card lane asks for more than the formal clause it has room for');
}

// ═════════════════════════════════════════════════════════════════════════════
section('8 · the gaps clause is a door, not a verdict');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { I, win } = build();
  const line = I.lineHtml('booker');
  has(line, 'data-pdxinv-gaps="booker"', 'the gap count is not a link to the gaps surface');
  has(line, '3</b> open gaps', 'the gap count is not stated');
  ok(typeof win._pdxInventoryGaps === 'function', 'the gaps door has no handler');

  // The door goes to the citable gaps section, via PDXGaps.jump when it exists.
  let jumped = null;
  win.PDXGaps.jump = (pid) => { jumped = pid; };
  win._pdxInventoryGaps({ getAttribute: () => 'booker' });
  eq(jumped, 'booker', 'the gap count does not open the gaps surface for this person');

  // And it fails closed: no pid, no navigation, no throw.
  let threw = false;
  try { win._pdxInventoryGaps({ getAttribute: () => null }); } catch (e) { threw = true; }
  ok(!threw, 'the gaps door throws when it has no pid');

  // The count is not compared with anyone. A gap count is a fact about our
  // archive; ranking officials by how much homework we have left would make our
  // own backlog into a finding about them.
  no(INV_SRC, 'average', 'inventory.js computes an average over records');
  no(INV_SRC, 'median', 'inventory.js computes a median over records');
  no(INV_SRC, 'percentile', 'inventory.js ranks records against each other');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9 · freshness is the record’s date, never the clock');
// ═════════════════════════════════════════════════════════════════════════════
{
  // "updated today" on a page rendered today is true of the page and false of the
  // file. Every file would look freshly maintained.
  ok(!/new Date\(\)/.test(INV_SRC), 'inventory.js reads the clock — a page rendered today is not a record updated today');
  ok(!/Date\.now\(\)/.test(INV_SRC), 'inventory.js reads the clock');
  has(INV_SRC, 'not "now"', 'inventory.js does not state that freshness comes from the record');

  // The newest item wins regardless of the order the record arrives in, and an
  // unparseable date is skipped rather than becoming an Invalid Date.
  const shuffled = build({ records: [{ date: '2024-01-01' }, { date: '2026-07-04' }, { date: 'not a date' }, {}] }).I;
  eq(shuffled.read('booker').updated.iso, '2026-07-04', 'freshness did not take the newest parseable date');
  has(shuffled.text('booker'), 'updated Jul 2026', 'the freshness clause is not a month and year');
  no(shuffled.text('booker'), 'NaN', 'an unparseable date leaked into the line');
  no(shuffled.text('booker'), 'Invalid', 'an unparseable date leaked into the line');

  // Month-and-year, not a day: a day-level date on a file that grows in batches
  // implies a precision the ingest does not have.
  ok(!/updated \d{1,2} /.test(shuffled.text('booker')), 'the freshness clause claims day-level precision');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10 · wiring: script tag, precache, mounts, one composer');
// ═════════════════════════════════════════════════════════════════════════════
{
  has(INDEX, '<script defer src="/inventory.js"></script>', 'index.html does not load inventory.js');
  // Deferred, and after gaps.js — it calls PDXGaps.count().
  ok(INDEX.indexOf('/gaps.js') < INDEX.indexOf('/inventory.js'),
    'inventory.js loads before gaps.js, whose count() it reads');

  // Runtime-injected CSS, because index.html's render-blocking stylesheet budget
  // is full (scripts/test-index-scripts.mjs) and one line of counts is not worth
  // a seventh blocking request.
  has(INV_SRC, "getElementById('pdx-inventory-css')", 'inventory.js does not guard its style injection');
  ok(!/inventory\.css/.test(INDEX), 'a seventh render-blocking stylesheet was added for the inventory line');
  const { I, styles } = build();
  I.lineHtml('booker');
  I.lineHtml('booker');
  eq(styles.length, 1, 'the inventory injected its stylesheet more than once');

  // Precached with the modules it reads, or a repeat visitor offline gets a record
  // strip whose depth chip is gone and no line in its place.
  has(SW, "'/inventory.js'", 'sw.js does not precache inventory.js');
  const v = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
  ok(v && Number(v.slice(1)) >= 77, `sw.js CACHE_VERSION is ${v} — a new shell asset needs a bump`);

  // Three mounts, all guarded, all going through the ONE composer. A surface that
  // paraphrases the counts itself is how a card and a profile end up stating the
  // same denominator two different ways.
  has(CONS_SRC, 'window.PDXInventory', 'the record strip / formal index does not use the inventory composer');
  has(WA_SRC, 'window.PDXInventory', 'the Direction Match card does not use the inventory composer');
  has(CARD_SRC, 'window.PDXInventory', 'the homepage card lane does not use the inventory composer');
  [['consistency.js', CONS_SRC, 'lineHtml'], ['word-action.js', WA_SRC, 'lineHtml'],
   ['profile-card.js', CARD_SRC, 'text']].forEach(([f, src, fn]) => {
    has(src, `!I || typeof I.${fn} !== 'function'`, `${f} calls the inventory without guarding on it`);
  });

  // The depth chip the inventory replaced is gone from the record strip — two
  // statements of formal depth in one head is the duplication `omit` exists to
  // prevent, and the old one had no word clause at all.
  no(CONS_SRC, "'</span>' +\n          '<span class=\"pdxso-depth\">", 'the old depth chip is still in the record strip head');
  ok(!/pdxso-depth">' \+ p\.issues/.test(CONS_SRC), 'the record strip still composes its own depth chip');
  // The card falls back to the old wording only when the module is absent, so a
  // card with no inventory is honest rather than blank.
  has(CARD_SRC, '_invFormal(pid) ||', 'the homepage card has no fallback when inventory.js is absent');
}

console.log('');
if (failures.length) {
  console.error(`✗ coverage inventory: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ coverage inventory: counts beside the findings, and nothing that could be read as a grade — ${passed} assertions passed\n`);
