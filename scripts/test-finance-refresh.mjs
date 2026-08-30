/* ═══════════════════════════════════════════════════════════════════════════
   test-finance-refresh.mjs — the money lane's maintenance path stays a side lane
   ────────────────────────────────────────────────────────────────────────────
   Phase 2 retired the finance score and left composition and counts. Phase 4
   asks for a refresh path so the lane does not rot — and a refresh path is
   precisely where a retired grade comes back, because a script that already
   reads every filing is one convenience function away from ranking them.

   scripts/finance-integrity-refresh.mjs is that path. It audits the shipped
   FTM_FUNDING with no key and no network, reports staleness, and (with
   FEC_API_KEY) diffs the federal records against the FEC. This suite fences it:

     1. It runs, with no key and no network
     2. THE ROSTER IS DERIVED — every shipped filing is covered, none skipped
     3. The audit checks what the lane is allowed to say
     4. It writes nothing, ever
     5. NO FINANCE → DIRECTION MATCH PATH, and no score comes back
     6. Outside spending is a level and never a dollar figure
     7. Coverage stays labelled incomplete
     8. Staleness is measured against the last CLOSED cycle, reproducibly
     9. --fetch refuses without a key rather than faking a live refresh
    10. No secret reaches stdout
    11. Documented, and the shipped comment agrees with the script
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
  console.error(`\n✗ finance refresh: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

const SCRIPT = 'scripts/finance-integrity-refresh.mjs';
const SRC = read(SCRIPT);
const DOC = read('FINANCE_INTEGRITY.md');
const LANE = read('finance-lane.js');

// The header names everything it refuses — "no score", "never a fabricated dollar
// figure", "NO FINANCE → DIRECTION MATCH PATH" — so a word scan over the comments
// reports the doctrine as the violation.
const CODE = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// Every run pins "now", so a staleness report is reproducible and this suite does
// not start failing in November.
const PIN = ['--today', '2026-08'];
function run(args = [], env = {}) {
  // The key is deliberately cleared: the audit half must work without one, and
  // nothing in this suite ever reaches the FEC.
  const clean = { ...process.env, FEC_API_KEY: '', FEC_KEY: '' , ...env };
  try {
    return { out: execFileSync(process.execPath, [path.join(ROOT, SCRIPT), ...args, ...PIN],
      { cwd: ROOT, encoding: 'utf8', env: clean, maxBuffer: 32 * 1024 * 1024 }), code: 0 };
  } catch (e) {
    return { out: String(e.stdout || ''), err: String(e.stderr || ''), code: e.status };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('1 · it runs with no key and no network');
// ═════════════════════════════════════════════════════════════════════════════
{
  must(fs.existsSync(path.join(ROOT, SCRIPT)), `${SCRIPT} is missing`);
  const r = run(['--audit']);
  eq(r.code, 0, `the audit exited ${r.code} with a clean corpus`);
  ok(r.out.length > 0, 'the audit printed nothing');
  has(r.out, 'AUDIT', 'the audit section is not labelled');
  has(r.out, 'no network needed', 'the audit does not say it needs no network');

  const j = JSON.parse(run(['--json']).out);
  must(j && j.records, '--json emitted no records');
  ok(Array.isArray(j.records) && j.records.length > 0, 'the json payload holds no records');
  eq(j.keyPresent, false, 'the run reported a key that this suite cleared');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the roster is derived, so no filing is silently skipped');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The script must audit exactly the ids that ship. A hand-kept roster here is
  // how a filing joins the site and quietly stops being refreshed — which is the
  // failure this whole script exists to prevent.
  const INDEX = read('index.html');
  const at = INDEX.indexOf('var FTM_FUNDING = {');
  must(at > -1, 'FTM_FUNDING is no longer in index.html under that name');
  const open = INDEX.indexOf('{', at);
  let depth = 0, end = -1;
  for (let i = open; i < INDEX.length; i++) {
    if (INDEX[i] === '{') depth++;
    else if (INDEX[i] === '}') { depth--; if (!depth) { end = i; break; } }
  }
  must(end > -1, 'FTM_FUNDING is not brace-balanced in index.html');
  const shipped = new Function(`return ${INDEX.slice(open, end + 1)};`)();
  const shippedIds = Object.keys(shipped).sort();
  must(shippedIds.length > 0, 'FTM_FUNDING evaluated to nothing');

  const j = JSON.parse(run(['--json']).out);
  eq(JSON.stringify(j.records.map((r) => r.id).sort()), JSON.stringify(shippedIds),
    'the audited set is not exactly the shipped set');

  has(SRC, "src.indexOf('var FTM_FUNDING = {')",
    'the script does not read the shipped filings out of index.html');
  has(SRC, 'The roster is DERIVED from the shipped FTM_FUNDING',
    'the derived-roster rule is not documented in the script');
  // No parallel table of figures. Identifiers are fine; dollar amounts are not.
  ok(!/const\s+ROSTER\s*=/.test(CODE), 'a second hand-kept roster came back');
  ok(!/receipts\s*:\s*\d/.test(CODE), 'a dollar figure is hard-coded in the refresh script');
  ok(!/smallDollar\s*:\s*\d/.test(CODE), 'a bucket figure is hard-coded in the refresh script');

  // A record with no refresh route is reported, not dropped.
  const orphans = j.records.filter((r) => r.lane === 'unknown');
  const out = run().out;
  if (orphans.length) {
    has(out, 'BLOCKED — shipped filings with no known refresh route',
      'records with no refresh route are not reported as blocked');
    for (const o of orphans) has(out, o.id, `${o.id} has no refresh route and is not named`);
  }
  // Every shipped record lands in exactly one of the three routes.
  for (const r of j.records) {
    ok(['federal', 'state', 'unknown'].includes(r.lane), `${r.id} has no route classification`);
    ok(!(r.fecId && r.manualSource), `${r.id} is claimed by two refresh routes at once`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('3 · the audit checks what the lane is allowed to say');
// ═════════════════════════════════════════════════════════════════════════════
{
  const j = JSON.parse(run(['--json']).out);
  // The shipped corpus is clean today; that is the assertion, and the audit is
  // what will catch it when it stops being true.
  for (const r of j.records) {
    eq(r.problems.length, 0, `${r.id} fails the shipped-record audit: ${r.problems.join('; ')}`);
    ok(r.base > 0, `${r.id} has a zero itemized base but ships anyway`);
    ok(r.receipts === null || r.base <= r.receipts * 1.01,
      `${r.id}: the buckets sum above reported receipts`);
    ok(/^\d{4}$/.test(r.cycle), `${r.id} has no four-digit cycle`);
    ok(/^[A-Za-z]+ \d{4}$/.test(r.reviewed), `${r.id} has no parseable review date`);
  }

  // The checks themselves exist, by name — this is the list the doc promises.
  for (const n of ['is negative', 'the itemized base is zero', 'has no source URL',
                   'is not an https URL', 'cycle is missing or not a four-digit year',
                   'does not parse as "Month YYYY"']) {
    has(SRC, n, `the audit has no check for: ${n}`);
  }
  // A broken record must fail loudly — non-zero exit — not print a warning.
  has(SRC, 'if (broken.length) process.exitCode = 1;',
    'a failed audit does not exit non-zero');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4 · it writes nothing, ever');
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of ['writeFileSync', 'appendFileSync', 'createWriteStream', 'writeFile',
                   'unlinkSync', 'renameSync', 'rmSync']) {
    no(CODE, w, `the refresh script calls ${w} — it must never edit the shipped data`);
  }
  const fsImport = (/import\s*\{([^}]*)\}\s*from\s*'node:fs'/.exec(SRC) || [])[1] || '';
  must(fsImport, 'the fs import is not a named-import list any more');
  eq(fsImport.trim(), 'readFileSync', 'the refresh script imports more than readFileSync from node:fs');

  const before = ['index.html', 'finance-lane.js', 'FINANCE_INTEGRITY.md']
    .map((f) => `${f}:${read(f).length}`).join('|');
  run();
  run(['--json']);
  run(['--fetch']);
  const after = ['index.html', 'finance-lane.js', 'FINANCE_INTEGRITY.md']
    .map((f) => `${f}:${read(f).length}`).join('|');
  eq(after, before, 'running the refresh script changed a shipped file');

  const out = run().out;
  has(out, 'Nothing above was written', 'the report does not say it wrote nothing');
  has(out, 'a fetched figure is a lead on a', 'the report does not frame a fetch as a lead');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5 · no finance → Direction Match path, and no score comes back');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The wall, applied to the maintenance tool. An internal number becomes a
  // reader-facing number one commit later; this is where that gets stopped.
  for (const w of ['issueKey', 'issue_key', 'MIN_TESTED', 'publishable', 'wordLedger',
                   'PDXWordAction', 'PDXVotingRecord', 'support_meaning', 'supportMeaning',
                   'directionMatch', 'PDXConsistency', 'TIERS']) {
    no(CODE, w, `the refresh script reaches into the record side via ${w}`);
  }
  // The two words the report is allowed to SAY ("no score, no grade, no formal
  // tier") must not also be things it computes, so these look for the identifier
  // rather than the sentence.
  ok(!/\btiers?\s*[=(]|\.tier\b/.test(CODE), 'the refresh script computes or reads a tier');
  // And no revived grade of its own.
  for (const w of ['constituentsFirst', 'Constituents-First signal', 'signalScore',
                   'grade(', 'letterGrade', 'clamp(']) {
    no(CODE, w, `the retired finance score is coming back via ${w}`);
  }
  ok(!/\bscores?\s*[=(]|\.score\b|score\s*:/.test(CODE),
    'the refresh script computes, stores or reads a score');

  const out = run().out;
  for (const w of ['constituents-first', 'special-interest heavy', 'mixed funding',
                   'out of 100', 'signal score']) {
    no(out.toLowerCase(), w, `the report prints the retired grade language "${w}"`);
  }
  has(out, 'composition and counts only', 'the report does not state what the lane publishes');
  has(out, 'No score, no grade, no path to', 'the report does not state the wall');
  has(SRC, 'NO FINANCE → DIRECTION MATCH PATH', 'the wall is not documented in the script');

  // The lane itself is untouched by this phase.
  no(LANE, 'constituentsFirst', 'the retired score reappeared in finance-lane.js');
  has(LANE, 'the score is retired', 'finance-lane.js no longer states the score is retired');
}

// ═════════════════════════════════════════════════════════════════════════════
section('6 · outside spending is a level, never a dollar figure');
// ═════════════════════════════════════════════════════════════════════════════
{
  has(SRC, "const OUTSIDE_LEVELS = ['high', 'moderate', 'low', 'none']",
    'the outside-spending vocabulary is not the fixed four levels');
  has(SRC, 'outside spending carries a dollar figure',
    'the audit does not reject a dollar figure on outside spending');
  has(SRC, 'states a dollar figure for independent expenditure',
    'the audit does not scan the outside note for a dollar figure');

  const j = JSON.parse(run(['--json']).out);
  for (const r of j.records) {
    if (r.outsideLevel === null) continue;
    ok(['high', 'moderate', 'low', 'none'].includes(r.outsideLevel),
      `${r.id} ships an outside level outside the vocabulary: ${r.outsideLevel}`);
  }
  // No shipped record smuggles an amount through. The audit would have caught it;
  // this asserts the audit's own verdict was reached, not just that it exists.
  ok(j.records.every((r) => r.problems.every((p) => !/dollar figure/.test(p))),
    'a shipped record carries a dollar figure for outside spending');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7 · coverage stays labelled incomplete');
// ═════════════════════════════════════════════════════════════════════════════
{
  const j = JSON.parse(run(['--json']).out);
  eq(j.coverageComplete, false, 'the payload claims the finance lane is complete');
  ok(j.coverage.onFile > 0, 'the coverage count is zero');
  ok(j.coverage.roster > j.coverage.onFile,
    'the roster denominator is not larger than the filings on file');
  // The denominator is the real roster, read from cmp-data.js, not a guess.
  const roster = (read('cmp-data.js').match(/^\s{0,2}"[a-z0-9_]+":\s*\{$/gm) || []).length;
  must(roster > 0, 'the cmp-data.js roster shape changed and the count is unreadable');
  eq(j.coverage.roster, roster, 'the reported roster is not the shipped roster');

  const out = run().out;
  has(out, 'That is incomplete and stays labelled incomplete',
    'the report does not label the coverage incomplete');
  has(out, 'a\n  missing filing is missing data, not a finding about anyone',
    'the report does not say a missing filing is not a finding');
  has(out, 'does not change that ratio',
    'the report implies a refresh improves coverage');
  no(out, 'full coverage', 'the report claims full coverage');
}

// ═════════════════════════════════════════════════════════════════════════════
section('8 · staleness: the last closed cycle, reproducibly');
// ═════════════════════════════════════════════════════════════════════════════
{
  // Reproducible: --today pins "now", so this output is the same in November.
  const a = run(['--json']).out;
  const b = run(['--json']).out;
  eq(a, b, 'two pinned --json runs disagree');
  const j = JSON.parse(a);
  eq(j.today, '2026-08', '--today was not honoured');

  // Measured against the CLOSED cycle. Against the cycle in progress, every 2024
  // filing would read as behind for all of 2026 — a permanently red report.
  has(SRC, 'the last CLOSED cycle', 'the closed-cycle rule is not documented');
  has(SRC, 'now.y % 2 === 0 && now.m < 12 ? now.y - 2',
    'staleness is measured against the cycle in progress');
  const current = j.records.filter((r) => r.cycle === '2024');
  ok(current.length > 0, 'no 2024-cycle record to check the closed-cycle rule against');
  ok(current.every((r) => r.cycleBehind === 0),
    'a 2024 filing reads as behind in August 2026, when 2024 is the last closed cycle');

  // A genuinely old filing is still flagged.
  const old = j.records.filter((r) => +r.cycle <= 2022);
  ok(old.length === 0 || old.every((r) => r.cycleBehind >= 2),
    'a pre-2024 filing is not reported as a closed cycle behind');
  const out = run(['--audit']).out;
  if (old.length) {
    has(out, 'behind the last closed cycle', 'an old cycle is not named as behind');
    for (const r of old) has(out, r.id, `${r.id} is a cycle behind and is not named`);
  }

  // The review-stamp threshold is stated, not implied.
  eq(j.staleAfterMonths, 18, 'the staleness threshold changed without the doc');
  has(out, 'review stamps older than 18 months', 'the threshold is not printed');
}

// ═════════════════════════════════════════════════════════════════════════════
section('9 · --fetch refuses without a key rather than faking a refresh');
// ═════════════════════════════════════════════════════════════════════════════
{
  const r = run(['--fetch']);
  eq(r.code, 3, `--fetch without a key exited ${r.code} instead of the blocked-on code`);
  has(r.out, 'BLOCKED ON: FEC_API_KEY', '--fetch does not name what it is blocked on');
  has(r.out, 'will not fall back to DEMO_KEY',
    '--fetch does not explain why it refuses to degrade');
  // DEMO_KEY must not be a fallback anywhere in the code. A rate-limited
  // half-refresh reads exactly like a clean one, which is the fake live refresh
  // the brief warns about.
  ok(!/\|\|\s*'DEMO_KEY'/.test(CODE), 'DEMO_KEY is still a silent fallback');
  ok(!/=\s*'DEMO_KEY'/.test(CODE), 'DEMO_KEY is still assigned as a key');
  has(SRC, "process.env.FEC_API_KEY || process.env.FEC_KEY || ''",
    'the key is not read from the environment with an empty fallback');

  // No request is made without a key — the audit half must be reachable offline.
  const fetchCalls = (CODE.match(/await fetch\(/g) || []).length;
  eq(fetchCalls, 1, 'there is more than one network call in the refresh script');
  has(SRC, 'if (!KEY) {', 'there is no key guard before the fetch loop');
  const guardAt = SRC.indexOf('if (!KEY) {');
  const fetchAt = SRC.indexOf('await fetchFEC(');
  ok(guardAt > -1 && fetchAt > guardAt, 'the key guard does not precede the fetch loop');

  // State/local is documented as having no live route at all, rather than left
  // looking like a pending feature.
  const out = run().out;
  has(out, 'STATE / LOCAL — entered by hand, no live refresh exists',
    'the state lane is not labelled as manual-only');
  has(out, 'Utah publishes no open JSON API',
    'the report does not say why there is no state refresh');
  has(out, 'disclosures.utah.gov', 'the manual source URL is not printed');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10 · no secret reaches stdout');
// ═════════════════════════════════════════════════════════════════════════════
{
  const SENTINEL = 'pdx-not-a-real-key-0000';
  const r = run(['--audit'], { FEC_API_KEY: SENTINEL });
  no(r.out, SENTINEL, 'the FEC key was printed in the audit output');
  no(r.err || '', SENTINEL, 'the FEC key was printed on stderr');
  has(r.out, 'FEC key: present in the environment',
    'the report does not state that a key is present without printing it');

  const j = JSON.parse(run(['--json'], { FEC_API_KEY: SENTINEL }).out);
  eq(j.keyPresent, true, 'the payload does not report the key as present');
  no(JSON.stringify(j), SENTINEL, 'the FEC key leaked into the json payload');

  // The key only ever enters a URL that goes to the FEC, never a log line, and
  // the error path deliberately reports the id rather than the URL.
  // The key's presence may be reported; its value may never be interpolated
  // anywhere. It reaches exactly one place: the FEC request's query string.
  no(CODE, '${KEY}', 'the key value is interpolated into a string');
  eq((CODE.match(/\bKEY\b/g) || []).length, 6,
    'the key is referenced somewhere new — check it still cannot reach stdout');
  has(SRC, "url.searchParams.set('api_key', KEY)",
    'the key does not reach the FEC request through the URL parameters');
  has(SRC, 'never included in an error message',
    'the error path does not document keeping the key out of the message');
  has(SRC, 'FEC ${fecId}: HTTP ${res.status}',
    'the fetch error reports something other than the id and status');
}

// ═════════════════════════════════════════════════════════════════════════════
section('11 · documented, and the shipped comment agrees');
// ═════════════════════════════════════════════════════════════════════════════
{
  has(DOC, '## Refreshing the data', 'the doc lost its refresh section');
  has(DOC, 'scripts/finance-integrity-refresh.mjs', 'the doc does not name the script');
  has(DOC, 'FEC_API_KEY', 'the doc does not name the env key the fetch half needs');
  has(DOC, '--audit', 'the doc does not show the no-key audit invocation');
  has(DOC, '--today', 'the doc does not mention pinning "now"');
  has(DOC, 'never kept as a second\nlist in the script',
    'the doc does not explain why the roster is derived');
  has(DOC, 'no finance → Direction Match path',
    'the doc does not restate the wall for the refresh path');
  // THE RATIO IS DERIVED HERE TOO, FOR THE SAME REASON THE SCRIPT DERIVES IT.
  // This assertion used to read has(DOC, '13-of-757', …) — a literal, which meant
  // the fence was pinning the doc to whatever the roster happened to be on the day
  // it was written. cmp-data.js has since grown to 800 people, so the doc was
  // quoting a denominator that was 43 people stale and this test was the reason it
  // stayed that way: a hard-coded expectation enforces the drift it was meant to
  // catch. Counted from the same two files the script counts, the fence now fails
  // when the doc is stale rather than when the roster changes.
  const _idx = read('index.html');
  const _from = _idx.indexOf('var FTM_FUNDING = {');
  const _block = _idx.slice(_from, _idx.indexOf('\n    };', _from));
  const _fundKeys = (_block.match(/^\s{6}[a-z0-9_]+:\s*\{/gm) || []).length;
  const _rosterN = (read('cmp-data.js').match(/^\s{0,2}"[a-z0-9_]+":\s*\{$/gm) || []).length;
  ok(_fundKeys > 0 && _rosterN > 0, 'the coverage ratio could be counted from the shipped data');
  has(DOC, `${_fundKeys}-of-${_rosterN}`,
    `the doc does not state the current coverage ratio (${_fundKeys}-of-${_rosterN})`);
  has(DOC, 'no open JSON API', 'the doc does not record the state-refresh limitation');
  has(DOC, 'documented limitation, not a pending feature',
    'the doc leaves the state lane looking like pending work');

  // index.html's own comment must point at the same script and must not promise a
  // scoring methodology that no longer exists.
  const INDEX = read('index.html');
  const at = INDEX.indexOf('var FTM_FUNDING = {');
  const header = INDEX.slice(Math.max(0, at - 2600), at);
  has(header, 'scripts/finance-integrity-refresh.mjs',
    'the FTM_FUNDING comment does not point at the refresh script');
  has(header, 'FEC_API_KEY', 'the FTM_FUNDING comment does not name the env key');
  has(header, 'There is no scoring methodology to see',
    'the FTM_FUNDING comment still promises a scoring methodology');
  no(header, 'full scoring methodology',
    'the FTM_FUNDING comment still points at a retired scoring methodology');
  has(header, 'finance-lane.js', 'the FTM_FUNDING comment still credits index.html for the read');
  // The old header said party transfers were "treated as neutral" — a statement
  // about arithmetic that no longer exists.
  no(header, '(treated as neutral)',
    'the FTM_FUNDING comment still describes party money in terms of the retired math');

  // The script header points at the module that actually owns the read.
  has(SRC, 'finance-lane.js (PDXFinanceLane.compose)',
    'the script header does not credit finance-lane.js for the read');
  no(SRC, 'PDXFinanceLane.compose in index.html',
    'the script header still says the read lives in index.html');

  // Picked up by the suite.
  const pkg = JSON.parse(read('package.json'));
  has(pkg.scripts.test, 'scripts/test-*.mjs', 'the suite no longer auto-discovers the tests');
}

console.log('');
if (failures.length) {
  console.error(`✗ finance refresh: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ finance refresh: audits with no key, refuses to fake a fetch, still a side lane — ${passed} assertions passed\n`);
