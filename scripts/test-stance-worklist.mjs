/* ═══════════════════════════════════════════════════════════════════════════
   test-stance-worklist.mjs — the worklist suggests work, never an answer
   ────────────────────────────────────────────────────────────────────────────
   Phase 4 asks for stated-position growth on the records voters actually open,
   with the floors untouched. The bottleneck is knowing WHICH records are one
   sourced card away from being capable of a published Direction Match at all —
   so scripts/stance-worklist.mjs ranks them off the shipped engine.

   That instrument is one short step away from the two worst things this archive
   could ship: a tool that decides what someone said, or a tool that quietly
   redefines "enough" so more files clear. So this suite holds it to being a
   worklist and nothing else:

     1. It runs, and it reads the floors off the shipped engine
     2. THE FLOORS ARE READ, NEVER WRITTEN — no literal floor, no comparison
        loosened, and a missing engine aborts instead of guessing
     3. IT AUTHORS NOTHING — no write path, no network, no corpus mutation
     4. It names people and shortfalls, never positions or directions
     5. The ceiling arithmetic: capability is scorable word, not tested word
     6. It never claims a record WILL publish
     7. The circularity rule is respected, and named as permanent
     8. Lanes: the federal and Utah ballot sets are selectable and real
     9. Deterministic — same input, same bytes; no clock, no randomness
    10. Unreadable records are excluded from the counts, not scored zero
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg}\n    missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg}\n    found ${JSON.stringify(needle)}`);
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ stance worklist: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

const SCRIPT = 'scripts/stance-worklist.mjs';
const SRC = read(SCRIPT);
const WA_SRC = read('word-action.js');

// Every negative word scan below runs against this view. The script's header
// deliberately NAMES what it refuses to do — "does not author a position",
// "picking the issue would be picking the answer" — so scanning the comments for
// those words reports the doctrine as the violation.
const CODE = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const run = (...args) => execFileSync(process.execPath, [path.join(ROOT, SCRIPT), ...args],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

// ═════════════════════════════════════════════════════════════════════════════
section('1 · it runs, off the shipped engine');
// ═════════════════════════════════════════════════════════════════════════════
{
  must(fs.existsSync(path.join(ROOT, SCRIPT)), `${SCRIPT} is missing`);

  let out = '';
  let threw = null;
  try { out = run('--summary'); } catch (e) { threw = e; }
  must(!threw, `${SCRIPT} exited non-zero: ${threw && (threw.stderr || threw.message)}`);
  ok(out.length > 0, 'the worklist printed nothing at all');

  const j = JSON.parse(run('--json'));
  must(j && j.floors, '--json did not emit a floors block');

  // The floors in the report must BE the shipped floors, whatever they are — read
  // out of word-action.js rather than restated here, so this assertion keeps
  // holding if the doctrine ever raises them.
  const items = +(/MIN_TESTED_ITEMS\s*=\s*(\d+)/.exec(WA_SRC) || [])[1];
  const weight = +(/MIN_TESTED_WEIGHT\s*=\s*(\d+)/.exec(WA_SRC) || [])[1];
  must(items > 0 && weight > 0, 'could not read the floors out of word-action.js');
  eq(j.floors.items, items, 'the reported item floor is not word-action.js\'s item floor');
  eq(j.floors.weight, weight, 'the reported weight floor is not word-action.js\'s weight floor');

  has(SRC, 'WA.MIN_TESTED_ITEMS', 'the item floor is not read off the live engine');
  has(SRC, 'WA.MIN_TESTED_WEIGHT', 'the weight floor is not read off the live engine');
  has(out, 'Floors (from word-action.js, unchanged)',
    'the report does not say where its floors came from');

  // The engine is loaded, not reimplemented: the real modules, in the real order.
  for (const f of ['cmp-data.js', 'word-action.js', 'consistency.js']) {
    has(SRC, `"${f}"`, `${f} is not in the sandbox load list`);
    must(fs.existsSync(path.join(ROOT, f)), `${f} named in the load list does not exist`);
  }
  has(SRC, 'WA.read(', 'the script does not call the shipped PDXWordAction.read()');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the floors are read, never written');
// ═════════════════════════════════════════════════════════════════════════════
{
  // No local floor. A literal here would silently outlive a doctrine change, and
  // a LOWER literal would fill the archive by fiat — the one thing the brief
  // forbids outright.
  ok(!/(?:MIN_TESTED_ITEMS|MIN_TESTED_WEIGHT|FLOOR_ITEMS|FLOOR_WEIGHT)\s*=\s*\d/.test(CODE),
    'a publication floor is assigned a literal number in the worklist');
  no(CODE, 'MIN_TESTED_ITEMS =', 'the worklist assigns MIN_TESTED_ITEMS');
  no(CODE, 'MIN_TESTED_WEIGHT =', 'the worklist assigns MIN_TESTED_WEIGHT');

  // It reads word-action.js into a sandbox; it must never write it back, and must
  // never patch the floors inside the sandbox before reading.
  no(CODE, 'MIN_TESTED_ITEMS =', 'a floor is reassigned inside the sandbox');
  ok(!/win\.PDXWordAction\.\w+\s*=/.test(CODE), 'the worklist mutates the loaded engine');
  ok(!/publishable\s*=/.test(CODE), 'the worklist assigns publishable itself');

  // Fail closed: an engine that does not expose its floors aborts. Defaulting
  // would mean publishing a worklist computed against a floor nobody set.
  has(SRC, 'if (!FLOOR_ITEMS || !FLOOR_WEIGHT)',
    'a missing floor is not detected');
  has(SRC, 'refusing to invent them',
    'a missing floor does not abort with a refusal');
  has(SRC, 'process.exit(2)', 'the stale-engine path does not exit non-zero');

  // The comparison is >=, both floors, AND. Either half flipped to a single floor
  // or to > would change who counts as capable.
  has(SRC, 'capableItems >= FLOOR_ITEMS && capableWeight >= FLOOR_WEIGHT',
    'capability is not both floors, cleared, together');
}

// ═════════════════════════════════════════════════════════════════════════════
section('3 · it authors nothing');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The output is a worklist on stdout. There is no data half to this deliverable
  // — a position without a citation is not data, and this script has no citations.
  for (const w of ['writeFileSync', 'appendFileSync', 'createWriteStream', 'writeFile',
                   'rmSync', 'unlinkSync', 'mkdirSync', 'renameSync']) {
    no(CODE, w, `the worklist calls ${w} — it must write nothing`);
  }
  for (const w of ['fetch(', 'https.', 'http.request', 'net.', 'child_process', 'execSync']) {
    no(CODE, w, `the worklist reaches out via ${w} — it must be offline and deterministic`);
  }
  ok(!/--out\b/.test(CODE), 'the worklist advertises an --out flag');

  // Only readFileSync is imported from fs, so there is no write handle in scope
  // at all — the guarantee is structural, not a habit.
  const fsImport = (/import\s*\{([^}]*)\}\s*from\s*"node:fs"/.exec(SRC) || [])[1] || '';
  must(fsImport, 'the fs import is not a named-import list any more');
  eq(fsImport.trim(), 'readFileSync', 'the worklist imports more than readFileSync from node:fs');

  // Nothing in the corpus moved. If the instrument ever starts authoring, this is
  // the assertion that notices.
  const before = ['cmp-data.js', 'politician-stances-core.js', 'politician-stances-ext.js',
                  'state-senate-stances.js', 'word-action.js']
    .map((f) => `${f}:${read(f).length}`).join('|');
  run('--lane', 'utah', '--limit', '3');
  run('--json');
  const after = ['cmp-data.js', 'politician-stances-core.js', 'politician-stances-ext.js',
                 'state-senate-stances.js', 'word-action.js']
    .map((f) => `${f}:${read(f).length}`).join('|');
  eq(after, before, 'running the worklist changed a corpus file on disk');

  // And it says so out loud, where a curator reading the output can see it. The
  // legend only prints when there are rows, so this reads a lane that has some.
  const out = run('--lane', 'utah', '--limit', '2');
  has(out, 'It does not name a position, propose one',
    'the report does not disclaim authoring a position');
  has(out, 'needs a real citation',
    'the report does not say the work still needs a citation');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4 · people and shortfalls, never positions or directions');
// ═════════════════════════════════════════════════════════════════════════════
{
  const out = run('--lane', 'utah', '--limit', '15');

  // The output columns are counts and identifiers. A direction word appearing in
  // any of them would mean the instrument had started answering the question it
  // exists to raise.
  for (const w of ['supports', 'opposes', 'in favor', 'against the', 'likely to',
                   'probably', 'we expect', 'should support', 'should oppose',
                   'suggested position', 'proposed stance', 'inferred']) {
    no(out.toLowerCase(), w, `the worklist output contains the direction word "${w}"`);
  }
  // No party framing, no ideology, no platform — the standing constraint.
  for (const w of ['republican', 'democrat', 'conservative', 'progressive',
                   'liberal', 'left-wing', 'right-wing', 'ideolog', 'platform']) {
    no(out.toLowerCase(), w, `the worklist output brings in "${w}"`);
  }
  // Party is on every profile in cmp-data.js and is deliberately never read.
  ok(!/\.party\b/.test(CODE), 'the worklist reads the party field');
  ok(!/\bscore\b/.test(CODE.replace(/scorable|scored|scoredItems/g, '')),
    'the worklist reads or reports a profile score');

  // The rows carry a pid, counts and a lane. Nothing else.
  const rows = out.split('\n').filter((l) => /^\s{2}\+\d\s+\S/.test(l));
  ok(rows.length > 0, 'the worklist printed no rows for the Utah lane');
  for (const r of rows.slice(0, 8)) {
    ok(/^\s{2}\+\d+\s+[a-z0-9_]+\s+(\d+\s+){3}\d+\s+\d+\s+(federal|utah|other)\s*$/.test(r),
      `a worklist row is not pid + counts + lane:\n    ${r}`);
  }

  // The two cheap classes are named separately, because collapsing them would
  // hide the only work in the archive that needs no new research.
  has(out, 'unmapped', 'the unmapped (needs a key) class is not named');
  has(out, 'circular', 'the circular (needs an independent source) class is not named');
  has(out, 'a curator keys it, no new source',
    'the unmapped class does not say what unlocks it');
  has(SRC, 'notIssueLinked', 'the unmapped count is not the engine\'s notIssueLinked');
  has(SRC, 'recordDerived', 'the circular count is not the engine\'s recordDerived');

  // Per-record detail names issues ALREADY held — a fact about the file. It must
  // not name an issue the file lacks, which would be naming the answer.
  const one = run('--pid', 'natalie_pinkney');
  has(one, 'Issues already carrying a scorable item',
    'the per-record view does not report which issues are already held');
  has(one, 'Only a NEW issue moves this line',
    'the per-record view does not explain the one-item-per-issue rule');
  no(one, 'missing issue', 'the per-record view names an issue the file lacks');
  no(one, 'recommend', 'the per-record view recommends something');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5 · the ceiling is scorable word, and it is a ceiling');
// ═════════════════════════════════════════════════════════════════════════════
{
  const j = JSON.parse(run('--json'));
  must(Array.isArray(j.worklist), '--json emitted no worklist array');
  ok(j.worklist.length > 0, 'the worklist is empty across every lane');

  const F = j.floors;
  for (const r of j.worklist) {
    // Every row on the worklist is genuinely below at least one floor.
    ok(r.capableItems < F.items || r.capableWeight < F.weight,
      `${r.pid} is on the worklist but already clears both floors`);
    // capable is exactly the conjunction, never a rounded or blended judgement.
    eq(r.capable, r.capableItems >= F.items && r.capableWeight >= F.weight,
      `${r.pid}: capable disagrees with the floors`);
    // The ceiling never exceeds what is held.
    ok(r.capableItems <= r.word, `${r.pid}: more scorable items than held items`);
    // The shortfall is at least the item gap, and enough weight to clear.
    ok(r.short >= Math.max(0, F.items - r.capableItems),
      `${r.pid}: the shortfall understates the item gap`);
    ok(r.short >= Math.ceil(Math.max(0, F.weight - r.capableWeight) / 2),
      `${r.pid}: the shortfall understates the weight gap`);
    ok(r.short >= 1, `${r.pid}: on the worklist with a zero shortfall`);
  }

  // Sorted closest-first, so the cheapest unlock is at the top and a curator does
  // not have to read 700 rows to find it.
  const shorts = j.worklist.map((r) => r.short);
  eq(JSON.stringify(shorts), JSON.stringify(shorts.slice().sort((a, b) => a - b)),
    'the worklist is not ordered closest-first');

  // --short is an exact filter, not a "roughly".
  const one = JSON.parse(run('--short', '1', '--json'));
  ok(one.worklist.length > 0, 'nothing is one card short anywhere in the archive');
  ok(one.worklist.every((r) => r.short === 1), '--short 1 returned rows that are not one short');

  // The tally is arithmetic over the same rows, not a second opinion: every record
  // is either capable or on the worklist, and the buckets fit inside the whole.
  const wide = JSON.parse(run('--json', '--limit', '9999'));
  const all = wide.tally.all;
  eq(all.capable + wide.worklist.length, all.people,
    'capable + worklist does not account for every record counted');
  ok(all.oneShort + all.twoShort <= wide.worklist.length,
    'more records are one-or-two short than are on the worklist');
  eq(all.oneShort, wide.worklist.filter((r) => r.short === 1).length,
    'the one-card-short tally disagrees with the rows');
  eq(all.twoShort, wide.worklist.filter((r) => r.short === 2).length,
    'the two-short tally disagrees with the rows');
}

// ═════════════════════════════════════════════════════════════════════════════
section('6 · it never claims a record will publish');
// ═════════════════════════════════════════════════════════════════════════════
{
  const out = run('--summary');

  // The word is "capable", and the report says plainly why it is not "will".
  has(out, 'word-capable', 'the report does not use the capability wording');
  has(out, 'nothing below claims a record WILL',
    'the report does not disclaim predicting publication');
  has(out, 'formal-action half is a live', 'the report does not say what it cannot see');
  for (const w of ['will publish a', 'guaranteed', 'certain to', 'confirms that']) {
    no(out.toLowerCase(), w, `the report promises publication with "${w}"`);
  }

  // No grade, no percentage, no composite — the Phase 4 constraint, applied to an
  // internal tool too, because internal numbers become reader-facing numbers.
  for (const w of ['quality score', 'confidence', 'grade', 'rating', '%']) {
    no(out.toLowerCase().replace(/word-capable/g, ''), w,
      `the report introduces "${w}"`);
  }
  ok(!/\bA[+-]?\b\s*grade/i.test(out), 'the report grades a record');

  // Offline, `tested` is zero for every warming record. The script must never read
  // that as evidence of anything.
  const j = JSON.parse(run('--pid', 'massie', '--json'));
  const r = j.worklist[0];
  if (r) {
    ok(!('tested' in r) || r.tested === undefined,
      'the row reports a tested count that is cold offline');
    has(SRC, 'r.publishable', 'the offline publishable flag is not captured for honesty');
  }
  has(SRC, 'is cold here', 'the json payload does not disclose that the action half is cold');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7 · the circularity rule stands, and is named as permanent');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The script counts record-derived word separately and never proposes counting
  // it. A vote cannot test itself; that is the whole basis of Direction Match.
  const out = run('--lane', 'utah', '--limit', '3');
  has(out, 'positions written from the formal record',
    'the report does not explain what the circular column holds');
  has(out, 'need an INDEPENDENT source', 'the report does not say what unblocks a circular hold');
  no(CODE, 'isIndependentWord =', 'the worklist redefines the circularity rule');
  ok(!/scored\s*=\s*true/.test(CODE), 'the worklist marks an item scored itself');
  // Scored-ness comes from the engine, per item, and is only filtered.
  has(SRC, 'it.scored', 'scorability is not read off the engine\'s own items');

  // word-action.js still owns the rule, unedited.
  has(WA_SRC, 'isIndependentWord', 'isIndependentWord left word-action.js');
  const floors = /var publishable = tested\.length >= MIN_TESTED_ITEMS && wN >= MIN_TESTED_WEIGHT;/.test(WA_SRC);
  ok(floors, 'the publication rule in word-action.js changed shape this phase');
}

// ═════════════════════════════════════════════════════════════════════════════
section('8 · the lanes the brief prioritises');
// ═════════════════════════════════════════════════════════════════════════════
{
  const fed = JSON.parse(run('--lane', 'federal', '--json'));
  const utah = JSON.parse(run('--lane', 'utah', '--json'));
  const all = JSON.parse(run('--json'));

  ok(fed.tally.federal.people > 0, 'the federal lane is empty');
  ok(utah.tally.utah.people > 0, 'the Utah lane is empty');
  eq(fed.tally.utah.people, 0, '--lane federal leaked Utah records');
  eq(utah.tally.federal.people, 0, '--lane utah leaked federal records');
  ok(all.tally.all.people >= fed.tally.federal.people + utah.tally.utah.people,
    'the lanes do not fit inside the whole archive');

  // Lane membership is read off the committed profile — office and state — never
  // guessed from a name.
  has(SRC, 'p.office', 'the lane is not read off the office field');
  has(SRC, 'p.state', 'the lane is not read off the state field');
  has(SRC, 'never inferred from a name', 'the lane rule is not documented as non-inferred');
  ok(!/\bp\.name\b[^\n]*(?:test|match|Utah|Federal)/.test(CODE),
    'lane membership is inferred from a name');

  // Utah is the ballot set, buckets included ("Utah · Cache County").
  has(SRC, '/^Utah\\b/i', 'the Utah lane does not match the county buckets');
  ok(utah.tally.utah.people > 100, 'the Utah lane looks like it lost the county buckets');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9 · deterministic');
// ═════════════════════════════════════════════════════════════════════════════
{
  // No clock, no randomness — a worklist that reorders between runs cannot be
  // handed to two curators.
  for (const w of ['Date.now', 'new Date', 'Math.random', 'process.hrtime']) {
    no(CODE, w, `the worklist calls ${w}`);
  }
  const a = run('--lane', 'utah', '--limit', '25');
  const b = run('--lane', 'utah', '--limit', '25');
  eq(a, b, 'two runs of the same query printed different output');
  const ja = run('--json');
  const jb = run('--json');
  eq(ja, jb, 'two --json runs printed different output');

  // Ordering is fully specified: shortfall, then leverage, then held, then pid.
  has(SRC, 'a.pid.localeCompare(b.pid)', 'the sort has no final tiebreak on pid');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10 · unreadable records are excluded, not scored zero');
// ═════════════════════════════════════════════════════════════════════════════
{
  // A record the engine throws on is a record we know nothing about. Counting it
  // as "no word" would invent a gap and inflate the worklist.
  has(SRC, 'unreadable', 'there is no unreadable path at all');
  has(SRC, 'is not a record with no word', 'the unreadable path is not documented as an exclusion');
  has(SRC, 'rows = all.filter((r) => !r.unreadable)',
    'unreadable records are not excluded from the population');

  const j = JSON.parse(run('--json'));
  ok(Array.isArray(j.unreadable), 'the json payload hides the unreadable set');
  for (const r of j.unreadable) ok(r.pid && r.why, 'an unreadable record is reported without a reason');
  const out = run('--summary');
  if (j.unreadable.length) {
    has(out, 'excluded from every count above',
      'unreadable records are dropped without saying so');
  }

  // Registered as a test, so the suite picks it up.
  const pkg = JSON.parse(read('package.json'));
  has(pkg.scripts.test, 'scripts/test-*.mjs',
    'the suite no longer auto-discovers scripts/test-*.mjs');
}

console.log('');
if (failures.length) {
  console.error(`✗ stance worklist: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ stance worklist: names the work, never the answer; floors read, never written — ${passed} assertions passed\n`);
