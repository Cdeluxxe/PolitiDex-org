/* ═══════════════════════════════════════════════════════════════════════════
   test-word-action.mjs — the ⚖️ Word vs Action model and its guardrails
   ────────────────────────────────────────────────────────────────────────────
   Word vs Action is now the primary accountability read on every profile: one
   pool of documented word in three weighted tiers, tested against the Official
   Record. That makes it the single place where this app could most easily start
   lying — by inventing a position, by manufacturing a contradiction, by
   publishing a percentage that rests on one vote, or by scoring a stance card
   against the very roll call the card was written from.

   So this file does not check that the module "works". It checks that the five
   rules in its own header hold when the model is EXERCISED, with a real
   sandboxed window and a stubbed Official Record that can be made to say
   anything. Where a rule is a promise about honesty, the test tries to break it.

   Sections:
     1. Load + shape
     2. Tier ladder — weights, order, and the words that stand in for them
     3. Rule 1 — no invented word
     4. Rule 2 — no forced contradictions
     5. Rule 3 — a position is never its own test  (the circularity guard)
     6. Rule 4 — fail closed, in the number AND in the words
     7. Rule 5 — no double counting
     8. Branding → issue key: unambiguous or nothing
     9. Connecting the Dots: word → named actions → outcome
    10. The surfaces: mount, demotion, async re-render, precache
    11. Massie as the reference profile
    12. Mobile-first CSS
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
// A probe target that has been renamed or removed makes every assertion built on
// it vacuously true. That is a broken harness, not a passing model — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ word action: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const WA_SRC = read('word-action.js');
const WA_CSS = read('word-action.css');
const PROFILES = read('profiles-full.js');
const CONNECT = read('profile-connect.js');
const CONNECT_CSS = read('profile-connect.css');
const INDEX = read('index.html');
const SW = read('sw.js');

// ═════════════════════════════════════════════════════════════════════════════
// A sandbox that can be told exactly what the record says
// ═════════════════════════════════════════════════════════════════════════════
const VERDICTS = {
  consistent:  { key: 'consistent',  ico: '✓', label: 'Backs it up',                 short: 'Their record backs up what they say.', tone: 'good', color: '#6ee7a0', cls: 'good' },
  contradicts: { key: 'contradicts', ico: '⚠', label: 'Says one thing, does another', short: 'Their record cuts against it.',        tone: 'bad',  color: '#f87171', cls: 'bad' },
  mixed:       { key: 'mixed',       ico: '◑', label: 'Mixed record',                 short: 'Their record cuts both ways.',         tone: 'mid',  color: '#fbbf24', cls: 'mid' },
  limited:     { key: 'limited',     ico: '…', label: 'Limited record',               short: 'Not enough on record yet.',            tone: 'none', color: '#9fb4d4', cls: 'none' },
  no_record:   { key: 'no_record',   ico: '—', label: 'No record',                    short: 'Nothing on record.',                   tone: 'none', color: '#9fb4d4', cls: 'none' },
  no_stance:   { key: 'no_stance',   ico: '—', label: 'No stated position',           short: 'No position on file.',                 tone: 'none', color: '#9fb4d4', cls: 'none' },
  pending:     { key: 'pending',     ico: '⏳', label: 'Checking the record',          short: 'Checking.',                            tone: 'none', color: '#9fb4d4', cls: 'none' }
};

// The 110-key issue vocabulary, lifted from its real definition rather than
// re-declared here, so a keyword change in the app is seen by these tests.
function realIssueMap() {
  const at = read('alignment-tool.js');
  const i = at.indexOf('var ISSUE_MAP = {');
  must(i !== -1, 'alignment-tool.js no longer defines `var ISSUE_MAP = {`');
  const start = at.indexOf('{', i);
  let depth = 0, j = start;
  for (; j < at.length; j++) {
    if (at[j] === '{') depth++;
    else if (at[j] === '}') { depth--; if (!depth) { j++; break; } }
  }
  const map = vm.runInNewContext('(' + at.slice(start, j) + ')');
  must(Object.keys(map).length > 80, 'ISSUE_MAP extraction produced too few keys to be the real map');
  return map;
}
const ISSUE_MAP = realIssueMap();

/**
 * Build a fresh PDXWordAction over a controllable world.
 *   stances: array of curated stance cards (the shape stance-helpers returns)
 *   record:  { issueKey: {score, token, judged} | 'pending' | null }
 *   person:  the roster record (promises / issues / kept / broken / pending)
 */
function build({ stances = [], record = {}, person = {}, items = null } = {}) {
  const win = {};
  const ctx = {
    window: win,
    document: { querySelector: () => null, createElement: () => ({ set innerHTML(_v) {}, querySelector: () => null }) },
    setTimeout: () => 0,
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  win.ISSUE_MAP = ISSUE_MAP;
  win._resolveStanceList = () => stances;
  win.PDXConsistency = {
    VERDICTS,
    proof: { proofText: (it) => it && it.proof },
    officialRecord: (_pid, key) => {
      const r = record[key];
      if (r === undefined || r === null) return { score: null, token: 'no_record', pending: false };
      if (r === 'pending') return { score: null, token: 'pending', pending: true };
      return {
        score: r.score, token: r.token,
        record: { consistent: r.judged || 0, contradicts: 0 },
        sources: ['votes']
      };
    }
  };
  win._pdxRecordIssueItems = (_pid, key) => (items ? (items[key] || null) : (record[key] && record[key] !== 'pending'
    ? [{ proof: `H.R. 1 · On Passage · Voted Yea (${key})` }, { proof: `H.R. 2 · On Passage · Voted Nay (${key})` }]
    : null));

  vm.runInContext(WA_SRC, ctx, { filename: 'word-action.js' });
  must(!!win.PDXWordAction, 'word-action.js did not define window.PDXWordAction');
  return { WA: win.PDXWordAction, win, person };
}

// Convenience stance builders. `quoted` is independent word; `voteNarration` is
// the record describing itself.
const quoted = (issueKey, extra = {}) => ({
  issueKey, topic: 'Topic ' + issueKey, pos: 'support', issueStance: 'support',
  text: `Argues that ${issueKey} matters and says "we have to fix this".`,
  source: { label: 'Interview, 2025', url: 'https://example.org/x' }, ...extra
});
const voteNarration = (issueKey, extra = {}) => ({
  issueKey, topic: 'Topic ' + issueKey, pos: 'support', issueStance: 'support',
  text: 'Voted no on the Example Act (H.R. 99), which would have expanded the program.',
  source: { label: 'House Clerk — Roll Call 123 (2025)' }, ...extra
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Load + shape
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build();
  for (const fn of ['wordLedger', 'read', 'issueRead', 'dots', 'brandingIssueKey',
                    'isIndependentWord', 'pledgeAggregate', 'sectionHtml', 'headlineHtml', 'dotsHtml']) {
    must(typeof WA[fn] === 'function', `PDXWordAction.${fn} is missing — the harness cannot exercise the model`);
  }
  ok(/if \(window\.PDXWordAction\) return;/.test(WA_SRC),
    'word-action.js is not idempotent — a second load would redefine the model mid-session');
  eq(WA.FRAME.label, 'Word vs Action', 'the model is not named Word vs Action');
  ok(/Do they stand by what they said\?/.test(WA.FRAME.question),
    'the frame no longer asks the one question this standard is built around');
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Tier ladder — weights, order, and the words that stand in for them
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build();
  eq(WA.TIER_ORDER.join(','), 'pledge,position,branding',
    'the tier ladder is no longer ordered strongest word first');
  eq(WA.TIERS.pledge.weight, 3, 'a hard pledge is no longer the top-weighted word');
  eq(WA.TIERS.position.weight, 2, 'a stated position no longer outranks campaign branding');
  eq(WA.TIERS.branding.weight, 1, 'soft branding is no longer weighted');
  ok(WA.TIERS.branding.weight > 0,
    'soft branding fell to zero weight — the product decision is that repeated, issue-linked\n' +
    '    campaigning is lower-confidence word, not no word at all');
  ok(WA.TIERS.pledge.weight > WA.TIERS.position.weight &&
     WA.TIERS.position.weight > WA.TIERS.branding.weight,
    'the tiers no longer form a strict ladder, so "counts most / more / least" would be a lie');
  // The ladder is displayed in words, and the numbers are still disclosed.
  for (const t of WA.TIER_ORDER) {
    ok(/^Counts (most|more|least)$/.test(WA.TIERS[t].counts),
      `tier "${t}" has no plain-language weight label — a bare 3/2/1 needs a legend to read`);
    ok(WA.TIERS[t].gloss && WA.TIERS[t].gloss.length > 20,
      `tier "${t}" has no gloss explaining what that tier of word actually is`);
  }
  const method = WA_SRC.slice(WA_SRC.indexOf('function methodHtml'), WA_SRC.indexOf('function methodHtml') + 2600);
  must(method.length > 500, 'word-action.js no longer defines methodHtml');
  ok(/TIERS\.pledge\.weight/.test(method) && /TIERS\.branding\.weight/.test(method),
    'the method disclosure hardcodes the weights instead of reading them, so it can drift from the maths');
  ok(/floors\.items/.test(method) && /floors\.weight/.test(method),
    'the method disclosure does not state the fail-closed floors it is subject to');
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Rule 1 — no invented word
// ═════════════════════════════════════════════════════════════════════════════
{
  // An issue with a deep, decisive voting record and NO documented word must
  // produce nothing. Silence is not a position.
  const { WA } = build({
    stances: [],
    record: { gun_rights: { score: 100, token: 'consistent', judged: 9 },
              national_debt: { score: 0, token: 'contradicts', judged: 7 } }
  });
  const r = WA.read('nobody', { name: 'No Word Here' });
  eq(r.items.length, 0, 'the model manufactured word items out of a voting record alone');
  eq(r.pct, null, 'the model published a percentage for someone with no documented word');
  eq(r.token, 'no_stance', 'the model claims a verdict for someone who has said nothing on file');
  eq(WA.headlineHtml('nobody', { name: 'No Word Here' }), '',
    'the section renders an empty frame when there is no word, implying a record should be here');
}
{
  // Word only ever comes from the three curated sources.
  const ledger = WA_SRC.slice(WA_SRC.indexOf('function wordLedger'), WA_SRC.indexOf('function pledgeAggregate'));
  must(ledger.length > 800, 'word-action.js no longer defines wordLedger');
  ok(/p\.promises/.test(ledger), 'the ledger no longer reads tracked pledges');
  ok(/_resolveStanceList/.test(ledger), 'the ledger no longer reads curated stances');
  ok(/p\.keyIssues/.test(ledger) && /p\.issues/.test(ledger),
    'the ledger reads only one of the two roster branding fields — the congressional records use\n' +
    '    `issues` and other tiers use `keyIssues`, so reading one silently drops a whole tier');
  ok(!/officialRecord|memberRecords|_pdxRecordIssue/.test(ledger),
    'the word ledger reads the ACTION side — word must be assembled from curated statements only,\n' +
    '    or the record starts writing the positions it is supposed to be tested against');
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Rule 2 — no forced contradictions
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every outcome token must be the Official Record's own. Here the record says
  // "consistent" on all three issues; nothing may report otherwise.
  const stances = [quoted('gun_rights'), quoted('national_debt'), quoted('israel_support')];
  const record = {
    gun_rights: { score: 100, token: 'consistent', judged: 3 },
    national_debt: { score: 100, token: 'consistent', judged: 3 },
    israel_support: { score: 100, token: 'consistent', judged: 3 }
  };
  const { WA } = build({ stances, record });
  const r = WA.read('p1', { name: 'All Consistent' });
  eq(r.counts.contradicts, 0, 'the model produced a contradiction the Official Record never reported');
  eq(r.token, 'consistent', 'a wholly consistent record did not read as consistent');
  eq(r.pct, 100, 'a wholly consistent, well-evidenced record did not score 100');

  // …and the mirror: a record that says contradicts must not be softened.
  const { WA: WA2 } = build({
    stances,
    record: {
      gun_rights: { score: 0, token: 'contradicts', judged: 4 },
      national_debt: { score: 0, token: 'contradicts', judged: 4 },
      israel_support: { score: 0, token: 'contradicts', judged: 4 }
    }
  });
  const r2 = WA2.read('p1', { name: 'All Contradicts' });
  eq(r2.token, 'contradicts', 'the model softened a record that contradicts across the board');
  eq(r2.pct, 0, 'a wholly contradicted record did not score 0');

  // The source of the token is structural, not incidental.
  const testOf = WA_SRC.slice(WA_SRC.indexOf('function testOf'), WA_SRC.indexOf('function read('));
  must(testOf.length > 400, 'word-action.js no longer defines testOf');
  ok(/ov\.token === 'contradicts'/.test(testOf),
    'testOf no longer derives its outcome from the Official Record’s own token');
  ok(!/score\s*[<>]=?\s*\d/.test(testOf),
    'testOf classifies outcomes from raw score thresholds of its own — the verdict must come from\n' +
    '    the record engine, or two surfaces can disagree about the same issue');
}
{
  // Untested word is coverage, never a mark against anyone.
  const { WA } = build({
    stances: [quoted('gun_rights'), quoted('national_debt'), quoted('israel_support'), quoted('voter_id')],
    record: { gun_rights: { score: 100, token: 'consistent', judged: 3 } } // the other three: no record
  });
  const r = WA.read('p1', { name: 'Thin' });
  eq(r.counts.contradicts, 0, 'issues with no formal record were counted as contradictions');
  eq(r.coverage.tested, 1, 'the tested count does not match the number of issues the record could judge');
  ok(r.coverage.untested >= 3, 'untested word is not reported as coverage');
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Rule 3 — a position is never its own test (the circularity guard)
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build();
  // Vote narration cited to the record is NOT independent word.
  ok(!WA.isIndependentWord('Voted no on the Bipartisan Background Checks Act (H.R. 8), which passed the House 227–203.',
                           { label: 'House Clerk — Roll Call 410 (2022)' }),
    'a stance card that just narrates a roll call, cited to the House Clerk, is being treated as\n' +
    '    independent word — scoring it against that same roll call is a tautology');
  // A quotation is.
  ok(WA.isIndependentWord('Recalls that "in 2013, I was the only one on the floor to object".',
                          { label: 'ogles.house.gov, Feb. 1, 2024' }),
    'a direct quotation is not being recognised as independent word');
  // A stated view is.
  ok(WA.isIndependentWord('A free-trade advocate who calls broad tariffs a tax on American consumers.',
                          { label: 'Congress.gov' }),
    'a stated view is not being recognised as independent word');
  // Vote narration that happens to mention "supports" downstream is still narration.
  ok(!WA.isIndependentWord('Voted no on H.R. 6703, which would expand plans that the bill supports.',
                           { label: 'House Clerk' }),
    'an action-led, record-cited card is escaping the guard because a stated-view verb appears\n' +
    '    later in the sentence — the leading clause is what makes it narration');

  // And the guard has teeth in the read: 5 record-derived cards over a decisive
  // record must NOT produce a score.
  const { WA: WA2 } = build({
    stances: ['gun_rights', 'national_debt', 'voter_id', 'israel_support', 'pro_life'].map(voteNarration),
    record: {
      gun_rights: { score: 100, token: 'consistent', judged: 9 },
      national_debt: { score: 100, token: 'consistent', judged: 9 },
      voter_id: { score: 100, token: 'consistent', judged: 9 },
      israel_support: { score: 100, token: 'consistent', judged: 9 },
      pro_life: { score: 100, token: 'consistent', judged: 9 }
    }
  });
  const r = WA2.read('p1', { name: 'Circular' });
  eq(r.items.length, 5, 'record-derived positions vanished from the ledger — they are real positions');
  eq(r.coverage.scorable, 0, 'record-derived positions are being scored against the record they came from');
  eq(r.coverage.recordDerived, 5, 'the read does not report how much of the word came from the record itself');
  eq(r.pct, null,
    'five stance cards written from the voting record produced a percentage — that is a 100% every\n' +
    '    profile could score, and it would mean nothing');
  ok(/cannot test it|none testable|cannot be its own test|its own test/i.test(WA2.headlineHtml('p1', { name: 'Circular' })),
    'the surface does not explain why positions on file are not being tested');
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Rule 4 — fail closed, in the number AND in the words
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build();
  eq(WA.MIN_TESTED_ITEMS, 3, 'the tested-item floor changed — a percentage may now rest on fewer items');
  eq(WA.MIN_TESTED_WEIGHT, 4, 'the tested-weight floor changed');
  eq(WA.EVIDENCE_CAP, 3, 'the evidence multiplier cap changed — one issue can now swamp a whole profile');
}
{
  // One perfect item, ninety judged votes behind it. No number.
  const { WA } = build({
    stances: [quoted('gun_rights')],
    record: { gun_rights: { score: 100, token: 'consistent', judged: 90 } }
  });
  const r = WA.read('p1', { name: 'One Item' });
  eq(r.pct, null, 'a single tested item produced a whole-profile percentage');
  ok(r.token !== 'consistent',
    'a single tested item produced a confident "backs it up" verdict next to a blank percentage —\n' +
    '    the words have to fail closed with the number, or the floor only hides the digits');
  eq(r.outcomeToken, 'consistent', 'the raw outcome is no longer available for surfaces that need it');
  eq(r.publishable, false, 'the read claims to be publishable below the floors');
  // The evidence cap held: 1 item × weight 2 × min(90, 3) = 6, not 180.
  eq(r.testedWeight, 6, 'the evidence multiplier is not capped at EVIDENCE_CAP');
}
{
  // Three branding items clear the item floor but not the weight floor: 3 × 1 = 3 < 4.
  const { WA } = build({
    record: { border_security: { score: 100, token: 'consistent', judged: 1 },
              election_integrity: { score: 100, token: 'consistent', judged: 1 },
              free_speech: { score: 100, token: 'consistent', judged: 1 } }
  });
  const r = WA.read('p1', { name: 'Branding Only', issues: ['Border Security', 'Election Integrity', 'Free Speech'] });
  eq(r.tested.length, 3, 'the three branding items did not all get tested');
  eq(r.testedWeight, 3, 'branding weight is not 1 per item at one judged vote each');
  eq(r.pct, null,
    'three of the lowest-confidence tier cleared the item floor and published a percentage — the\n' +
    '    weight floor exists precisely to stop that');
}
{
  // Clearing both floors publishes.
  const { WA } = build({
    stances: [quoted('gun_rights'), quoted('national_debt'), quoted('israel_support')],
    record: { gun_rights: { score: 100, token: 'consistent', judged: 2 },
              national_debt: { score: 0, token: 'contradicts', judged: 2 },
              israel_support: { score: 50, token: 'mixed', judged: 2 } }
  });
  const r = WA.read('p1', { name: 'Publishable' });
  eq(r.publishable, true, 'a read clearing both floors still refuses to publish');
  eq(r.pct, 50, 'the weighted average is wrong for three equally-evidenced items at 100/0/50');
  eq(r.token, 'mixed', 'a record with both agreement and contradiction did not read as mixed');
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Rule 5 — no double counting
// ═════════════════════════════════════════════════════════════════════════════
{
  // A stated position and a branding label on the SAME issue: one scored item.
  const { WA } = build({
    stances: [quoted('privacy_rights')],
    record: { privacy_rights: { score: 100, token: 'consistent', judged: 5 } }
  });
  const r = WA.read('p1', { name: 'Overlap', issues: ['Anti-Surveillance'] });
  const scoredOnIssue = r.items.filter((it) => it.issueKey === 'privacy_rights' && it.scored !== false);
  eq(scoredOnIssue.length, 1,
    'one issue carries two scored word items — a person who states a position and campaigns on it\n' +
    '    would be weighted twice for saying one thing');
  eq(r.tested.length, 1, 'the same issue was tested twice');
}
{
  // A RECORD-DERIVED position must not silence independent branding on the same
  // issue: the derived card is not scored, so the branding claim is the only
  // testable word there and has to survive.
  const { WA } = build({
    stances: [voteNarration('privacy_rights')],
    record: { privacy_rights: { score: 100, token: 'consistent', judged: 5 } }
  });
  const r = WA.read('p1', { name: 'Derived + Brand', issues: ['Anti-Surveillance'] });
  eq(r.coverage.scorable, 1,
    'a record-derived stance card suppressed an independent campaign claim on the same issue,\n' +
    '    leaving nothing testable where there was real word');
  eq(r.tested.length, 1, 'the surviving branding claim was not tested');
  eq(r.tiers.branding.tested, 1, 'the tested item was not attributed to the branding tier');
}
{
  // Pledge promotion raises weight; it never adds an item.
  const pledgey = quoted('gun_rights', { text: 'Says plainly: "I will never vote for a gun registry."' });
  const { WA } = build({ stances: [pledgey], record: { gun_rights: { score: 100, token: 'consistent', judged: 2 } } });
  const led = WA.wordLedger('p1', { name: 'Promoted' });
  eq(led.length, 1, 'promoting a stance to the pledge tier duplicated it into two items');
  eq(led[0].tier, 'pledge', 'a first-person commitment in a sourced quote was not promoted to the pledge tier');
  eq(led[0].weight, 3, 'the promoted item did not take the pledge weight');
  // Unsourced commitment language must NOT promote.
  const { WA: WA2 } = build({ stances: [{ issueKey: 'gun_rights', topic: 'Guns', text: 'I will never vote for a registry.', pos: 'support' }] });
  const led2 = WA2.wordLedger('p1', { name: 'Unsourced' });
  eq(led2[0].tier, 'position',
    'an unsourced claim was promoted to the top tier — the pledge tier is meant to be the\n' +
    '    highest-confidence word, which requires a source');
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. Branding → issue key: unambiguous or nothing
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build();
  eq(WA.brandingIssueKey('Audit the Fed'), 'audit_spending',
    'the specific keyword ("audit the fed") no longer beats the generic one ("audit") — a label\n' +
    '    that matches several issues loosely and one exactly should resolve to the exact one');
  eq(WA.brandingIssueKey('Anti-Surveillance'), 'privacy_rights',
    'a signature issue that maps cleanly onto one issue key no longer resolves');
  eq(WA.brandingIssueKey('Constitutional Originalism'), null,
    'a label is matching an issue on a partial word ("constitution" inside "constitutional"),\n' +
    '    which is how a fabricated position gets scored');
  eq(WA.brandingIssueKey('Second Amendment'), null,
    'an ambiguous label resolved anyway — "Second Amendment" matches both a rights-leaning and a\n' +
    '    balance-framed issue, and choosing one decides for them which they meant');
  eq(WA.brandingIssueKey('Zqx'), null, 'a meaningless label resolved to an issue');
  // Unmapped branding is reported, never scored.
  const r = WA.read('p1', { name: 'Unmapped', issues: ['Constitutional Originalism', 'Second Amendment'] });
  eq(r.coverage.notIssueLinked, 2, 'unmapped branding is not reported as a coverage gap');
  eq(r.coverage.scorable, 0, 'unmapped branding is being scored despite having no issue to test against');
  eq(r.pct, null, 'unmapped branding produced a percentage');
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. Connecting the Dots: word → named actions → outcome
// ═════════════════════════════════════════════════════════════════════════════
{
  const { WA } = build({
    stances: [quoted('gun_rights'), quoted('national_debt'), quoted('israel_support'), quoted('voter_id')],
    record: {
      gun_rights: { score: 100, token: 'consistent', judged: 3 },
      national_debt: { score: 0, token: 'contradicts', judged: 3 },
      israel_support: { score: 50, token: 'mixed', judged: 3 },
      voter_id: { score: 100, token: 'consistent', judged: 3 }
    }
  });
  const rows = WA.dots('p1', { name: 'Dots' }, { limit: 3 });
  eq(rows.length, 3, 'the dots limit is not honoured');
  // Gap first — that is what a reader came for.
  eq(rows[0].outcome.token, 'contradicts', 'the joined rows do not lead with the gap between word and action');
  eq(rows[1].outcome.token, 'mixed', 'the joined rows are not ordered by how much they need explaining');
  for (const d of rows) {
    ok(d.word && d.word.length > 0, 'a joined row has no "they said" side');
    ok(Array.isArray(d.actions) && d.actions.length > 0, 'a joined row has no named actions');
    ok(/H\.R\. \d/.test(d.actions[0].text),
      'the action side is not NAMING the measure — a bare count is what this card used to do');
    ok(d.verdict && d.verdict.label, 'a joined row has no outcome verdict');
    ok(d.tier && d.tier.label, 'a joined row does not say which tier of word it is testing');
  }
  const html = WA.dotsHtml('p1', { name: 'Dots' }, { limit: 3 });
  ok(/They said/.test(html) && /They did/.test(html) && /pdxwa-dot-out/.test(html),
    'the rendered rows no longer show the said → did → so structure');
  // Only TESTED word can appear — an untestable row would be an empty accusation.
  const { WA: WA2 } = build({ stances: [voteNarration('gun_rights')], record: { gun_rights: { score: 100, token: 'consistent', judged: 3 } } });
  eq(WA2.dots('p1', { name: 'X' }).length, 0, 'a record-derived position is being presented as a joined row');
}
{
  // The card itself leads with the join and demotes the old lens chain.
  ok(/data-pcd-dots/.test(CONNECT), 'the Connecting the Dots card has no container for the joined rows');
  ok(CONNECT.indexOf('data-pcd-dots') < CONNECT.indexOf('pcd-chain-head'),
    'the five-lens navigation chain still comes before the actual word-vs-action join');
  ok(/pcd-chain-head/.test(CONNECT) && /Follow the whole thread/.test(CONNECT),
    'the lens chain is not labelled as navigation, so it still reads as the synthesis');
  ok(/PDXWordAction/.test(CONNECT) && /dotsHtml/.test(CONNECT),
    'the card builds its own join instead of delegating to the one model');
  ok(/pdx-consistency-warm/.test(CONNECT),
    'the card never re-renders when the voting record warms, so the join stays empty on first open');
  ok(/hasJoin/.test(CONNECT),
    'the card still hides itself on the two-lens rule alone — one joined row IS the synthesis');
  ok(/pcd-dots-wait/.test(CONNECT) && /pcd-dots-wait/.test(CONNECT_CSS),
    'there is no honest waiting/empty state for the join, so "loading" and "nothing to show" look identical');
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. The surfaces: mount, demotion, async re-render, precache
// ═════════════════════════════════════════════════════════════════════════════
{
  // Mounted on the record stage, ahead of the pledge number.
  const mount = PROFILES.indexOf('PDXWordAction.sectionHtml(id, p)');
  must(mount !== -1, 'profiles-full.js no longer mounts PDXWordAction.sectionHtml');
  const score = PROFILES.indexOf('id="pdxsec-score"');
  must(score !== -1, 'profiles-full.js no longer mounts the #pdxsec-score anchor');
  ok(mount < score,
    'Word vs Action is mounted after the Promise Follow-Through block — the primary read has to\n' +
    '    come first, or the profile still opens on the pledge-only number');
  const recordStage = PROFILES.lastIndexOf('<!--PDXSP:record-->', mount);
  ok(recordStage !== -1 && PROFILES.lastIndexOf('<!--PDXSP:dw:', mount) < recordStage,
    'Word vs Action was mounted inside a closed full-record drawer instead of on the record stage');
  ok(/pdxsec-wordaction/.test(WA_SRC), 'the section has no stable anchor to jump to');
  ok(/target: 'pdxsec-wordaction'/.test(PROFILES),
    'the quick-jump rail has no Word vs Action pill, so the primary read is not addressable');
  ok(/label: 'Word vs Action'/.test(PROFILES) && /label: 'Promises'/.test(PROFILES),
    'the rail no longer names both the unified read and the pledge lane it contains');
  const railWA = PROFILES.indexOf("label: 'Word vs Action'");
  const railProm = PROFILES.indexOf("label: 'Promises'");
  ok(railWA < railProm, 'the rail lists the pledge lane ahead of the primary read');
  ok(/Checking…|Thin record|Untested/.test(PROFILES),
    'the rail pill shows a bare number even when the read has failed closed — the honest state\n' +
    '    has to reach the rail too, or a blank section sits behind a confident pill');
}
{
  // The old Promise Follow-Through presentation: demoted, not degraded.
  const ft = PROFILES.slice(PROFILES.indexOf('window._renderFollowThrough = function'),
                            PROFILES.indexOf('window.pdxFilterPromises = function'));
  must(ft.length > 1500, 'profiles-full.js no longer defines _renderFollowThrough');
  ok(/Promises Kept/.test(ft), 'the pledge block lost its canonical big-number label');
  ok(/Promise Follow-Through/.test(ft), 'the pledge block lost its canonical lane name');
  ok(/_pdxPromiseInfo/.test(ft), 'the pledge block lost its ⓘ methodology explainer');
  for (const chip of ['kept', 'broken', 'pending']) {
    ok(new RegExp(`data-jump="${chip}"`).test(ft), `the pledge block lost its ${chip} filter chip`);
  }
  ok(/m\.raw/.test(ft), 'the pledge block lost the raw-vs-weighted reconciliation line');
  ok(!/font-size:2\.5rem/.test(ft),
    'the pledge rate is still rendered at hero scale — under one standard it is a supporting\n' +
    '    figure, and two hero numbers on one screen read as two competing scores');
  ok(/Word vs Action/.test(ft),
    'the demoted block never says where its number now sits, so it just looks smaller for no reason');
  ok(/pledge tier/i.test(ft),
    'the demoted block does not identify itself as the pledge tier of the unified read');
}
{
  // Async honesty: the section renders synchronously and re-renders on warm.
  ok(/pdx-consistency-warm/.test(WA_SRC),
    'the section never re-renders when the voting record warms, so first paint is permanently thin');
  ok(/removeEventListener\('pdx-consistency-warm'/.test(WA_SRC),
    'the warm listener never detaches — every closed profile modal would leak one');
  const bind = WA_SRC.slice(WA_SRC.indexOf('function bind('), WA_SRC.indexOf('function sectionHtml'));
  must(bind.length > 200, 'word-action.js no longer defines bind()');
  ok(/data-pdxwa-body/.test(bind),
    're-render replaces the whole section rather than its body, which would drop the anchor the rail jumps to');
  ok(/min-width/.test(WA_CSS.slice(WA_CSS.indexOf('.pdxwa-num {'), WA_CSS.indexOf('.pdxwa-num-v'))),
    'the number slot has no reserved width, so "Checking…" → "82%" shifts the layout on hydration');
}
{
  // Wiring and precache.
  ok(/<script defer src="word-action\.js">/.test(INDEX), 'index.html does not load word-action.js');
  const cssTag = /<link rel="stylesheet" href="\/word-action\.css" media="print" onload="this\.media='all'"/.test(INDEX);
  ok(cssTag, 'word-action.css is not loaded with the non-blocking media="print" swap');
  ok(/<noscript><link rel="stylesheet" href="\/word-action\.css" \/><\/noscript>/.test(INDEX),
    'word-action.css has no <noscript> fallback');
  // Compare the <script> tags themselves — both filenames also appear in the
  // explanatory comments above the stylesheet links, which sit far earlier.
  const tagWA = INDEX.indexOf('<script defer src="word-action.js">');
  const tagPC = INDEX.indexOf('<script defer src="profile-connect.js">');
  must(tagPC !== -1, 'index.html no longer loads profile-connect.js with a deferred script tag');
  ok(tagWA < tagPC,
    'profile-connect.js is loaded before the model it renders rows from');
  ok(/'\/word-action\.js'/.test(SW) && /'\/word-action\.css'/.test(SW),
    'the service worker does not precache the Word vs Action layer, so a repeat visitor can open a\n' +
    '    profile whose primary section is missing');
  const ver = /CACHE_VERSION = 'v(\d+)'/.exec(SW);
  must(ver, 'sw.js no longer declares CACHE_VERSION');
  ok(Number(ver[1]) >= 42,
    `sw.js is at v${ver[1]} — shipping new shell assets without a cache bump leaves them unfetched`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. Massie as the reference profile
// ═════════════════════════════════════════════════════════════════════════════
// The mission's worked example, and the clearest case for the product decision:
// he carries a 73% promise headline over 37 counted promises with NOT ONE
// itemized pledge on file, while 30 sourced positions sat at zero weight under
// the old model. Both facts have to survive in the data, or the example stops
// making its point.
{
  const stancesSrc = read('politician-stances-core.js');
  const win = {};
  const ctx = { window: win, document: { querySelector: () => null }, setTimeout: () => 0, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(stancesSrc, ctx, { filename: 'politician-stances-core.js' });
  const massie = win.ISSUE_STANCE_DATA && win.ISSUE_STANCE_DATA.massie;
  must(Array.isArray(massie), 'ISSUE_STANCE_DATA.massie is gone — the reference profile has no curated word');
  ok(massie.length >= 25,
    `Massie's curated position count fell to ${massie.length} — the reference case depends on a deep\n` +
    '    stance record the pledge-only model could not see');

  const { WA } = build();
  const independent = massie.filter((s) => WA.isIndependentWord(s.text, s.source));
  ok(independent.length >= 5,
    `only ${independent.length} of Massie's ${massie.length} positions are independent word — the reference\n` +
    '    profile needs enough testable word to clear the fail-closed floors once his record warms');
  ok(independent.length < massie.length,
    'every Massie position now reads as independent word, which means the circularity guard is not\n' +
    '    firing on his many vote-narration cards — check isIndependentWord');

  // His roster record: promise counts, no itemized pledges.
  const cmp = read('cmp-data.js');
  const at = cmp.indexOf('"massie": {');
  must(at !== -1, 'cmp-data.js no longer holds a "massie" record');
  const block = cmp.slice(at, cmp.indexOf('\n },', at));
  ok(/"kept":\s*27/.test(block) && /"broken":\s*8/.test(block),
    'Massie\'s kept/broken counts changed — the worked example quotes them');
  ok(!/"promises":\s*\[/.test(block),
    'Massie now has an itemized promise ledger — good for the data, but the worked example and the\n' +
    '    pledge-aggregate bridge were written around him not having one; update both');
  ok(/"issues":\s*\[/.test(block),
    'Massie lost his signature-issue list, which is the branding tier of the worked example');

  // The aggregate bridge must fire for exactly this shape.
  const agg = WA.pledgeAggregate({ kept: 27, broken: 8, pending: 2 });
  ok(agg && agg.resolved === 35,
    'the pledge-aggregate bridge does not fire for a record with counts but no itemized pledges —\n' +
    '    41 roster records are in that shape, and the pledge tier would read "none on file" beside a\n' +
    '    live promise percentage');
  eq(WA.pledgeAggregate({ kept: 3, broken: 1, promises: [{ title: 'x', verdict: 'kept' }] }), null,
    'the aggregate bridge is firing for a record that HAS itemized pledges, which would double-report them');
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. Mobile-first CSS
// ═════════════════════════════════════════════════════════════════════════════
{
  // Base rules are the small-screen rules; the media query widens, never narrows.
  ok(/@media \(min-width: 620px\)/.test(WA_CSS),
    'word-action.css has no min-width breakpoint — it is not written mobile-first');
  ok(!/@media \(max-width:/.test(WA_CSS),
    'word-action.css narrows at a max-width breakpoint, which means the base rules are desktop rules');
  const mq = WA_CSS.indexOf('@media (min-width: 620px)');
  const base = WA_CSS.slice(0, mq);
  ok(/\.pdxwa-dot-step\s*{[^}]*grid-template-columns/.test(base),
    'the said/did/so rows have no base grid, so they collapse to loose paragraphs on a phone');
  ok(/min-width:\s*0/.test(base),
    'no text cell declares min-width:0 inside its grid track — long quotes and bill names would\n' +
    '    force horizontal overflow on a narrow screen');
  ok(/overflow-wrap:\s*break-word/.test(base),
    'quoted word can overflow: nothing allows a long unbroken string to wrap');
  // Tap targets.
  ok(/min-height:\s*2\.75rem/.test(WA_CSS),
    'the method disclosure has no ≥44px tap target');
  ok(/min-height:\s*2\.75rem/.test(CONNECT_CSS.slice(CONNECT_CSS.indexOf('.pcd-dots-more'))),
    'the "see the full read" control has no ≥44px tap target');
  // No fixed pixel heights that would clip wrapped text at small sizes.
  ok(!/\.pdxwa-[a-z-]+\s*{[^}]*\bheight:\s*\d+px/.test(WA_CSS),
    'a Word vs Action element has a hard pixel height — wrapped copy would be clipped on a phone');
  // The colour comes from the shared palette, never hardcoded per verdict.
  ok(/--pdxwa-col/.test(WA_CSS),
    'the stylesheet does not read the verdict colour from a variable, so it can drift from the\n' +
    '    shared consistency palette');
  for (const bad of ['#f87171', '#6ee7a0', '#fbbf24']) {
    ok(!WA_CSS.includes(bad),
      `word-action.css hardcodes the verdict colour ${bad} — it must come from PDXConsistency.VERDICTS`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ word action: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ word action: all ${passed} assertions passed`);
