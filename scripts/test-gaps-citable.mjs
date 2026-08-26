/* ═══════════════════════════════════════════════════════════════════════════
   test-gaps-citable.mjs — "What the record can't test yet", at an address
   ────────────────────────────────────────────────────────────────────────────
   gaps.js has computed askable-vs-held gaps since Phase 1, but they lived inside
   a fold in the Direction Match card: a reader met them only by opening the
   apparatus, and there was no way to link anyone to them. Phase 4 promoted them
   to a named section of the person file at a durable address (/p/<pid>#gaps).

   Publishing our own backlog is the most useful thing a thin file can do and the
   easiest thing in the product to get wrong, in one specific direction: the same
   list can be written as "here is where OUR documentation stops" or as "here is
   what is missing from THIS PERSON", and only the first is a claim we can
   support. The second is an accusation assembled out of our own unfinished work.

   So this suite checks the vocabulary and the framing as hard as the wiring:

     1. Load + the promoted API
     2. The two groups, and the split that matters (askable vs held)
     3. THE VOCABULARY IS THE SHIPPED VOCABULARY — every row's label comes from
        TYPES, and the four holds are named: no stance yet, circular hold, second
        position on a scored issue, below the publication floor.
     4. DOCUMENTATION STATUS ONLY — the forbidden sentences, and the required one.
     5. It names whose homework it is, in the lede, before anything else.
     6. No grade, no percentage, no comparison with another official.
     7. The whole tail — the citable list does not summarise, and does not cap.
     8. One thread per target — the citable rows are plain, so the discussion
        mounts stay in the one place they already live.
     9. Nothing to say → no section.
    10. THE ADDRESS: #gaps resolves, fails closed, and is copyable.
    11. Wiring: mounted in the receipts stage, registered in the spine, precached.
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
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ citable gaps: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

const GAPS_SRC = read('gaps.js');
const PERSON_SRC = read('person-file.js');
const SPINE_SRC = read('profile-spine.js');
const FULL_SRC = read('profiles-full.js');
const SW = read('sw.js');
// Prose in gaps.js is assembled from quoted fragments joined with ` + ` across
// lines, and its doctrine walls wrap at ~80 columns. A sentence-level assertion
// has to see the sentence, so these two views join the fragments and collapse the
// comment wrapping. Section 4's assertions read the RENDERED html wherever the
// sentence reaches a reader; these are for the ones that only exist in source.
const GAPS_FLAT = GAPS_SRC.replace(/'\s*\+\s*\n\s*'/g, '');
const GAPS_PROSE = GAPS_SRC.replace(/\n\s*\/\/\s?/g, ' ').replace(/\s+/g, ' ');

// ═════════════════════════════════════════════════════════════════════════════
// A world whose gap list can be made to say anything
// ═════════════════════════════════════════════════════════════════════════════
// Lifted from scripts/test-gaps.mjs, which owns the derivation contract; this
// suite only needs to steer the list and read the section back.
function build({
  coverage = { word: 6, scorable: 6, tested: 3, untested: 3, issueLinked: 6, notIssueLinked: 0, recordDerived: 0, warming: false },
  untested = [], tested = [], publishable = true,
  pledgeAggregate = null, pledgeRemainder = 0, assess = null,
  profile = { name: 'Cory Booker' },
  person = true, inventory = false
} = {}) {
  const win = {};
  const styles = [];
  const el = () => {
    const e = { id: '', textContent: '', _kids: [] };
    e.appendChild = (k) => { e._kids.push(k); return k; };
    return e;
  };
  const head = el();
  head.appendChild = (n) => { styles.push(n); return n; };
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
    setTimeout: (fn) => 0,
    fetch: () => ({ then: () => ({ then: () => ({ catch: () => {} }) }) }),
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.addEventListener = () => {};

  win.PDXWordAction = {
    read: () => ({
      coverage, items: new Array(coverage.word).fill({}), tested, untested,
      publishable, pledgeAggregate, pledgeRemainder,
      floors: { items: 3, weight: 6, evidenceCap: 3 }
    })
  };
  win.PDXCoverage = { assess: () => assess || { key: 'rich', records: 9, stances: 4, spotlight: 3, promises: 2, formal: 12 } };
  win.PROFILES = { booker: profile };
  win.ISSUE_MAP = { climate_action: { label: 'Climate Action' }, gun_policy: { label: 'Gun Policy' } };
  if (person) {
    win.PDXPerson = {
      SECTION_HASH: { gaps: 'pdxsec-gaps' },
      sectionUrl: (pid, alias) => 'https://politidex.fyi/p/' + pid + '#' + alias
    };
  }
  if (inventory) {
    win.PDXInventory = { lineHtml: (pid, p, o) => '<p class="pdxinv" data-omit="' + (o.omit || []).join(',') + '">counts</p>' };
  }

  // The REAL shared slugifier, so gap keys in this suite are the keys the thread
  // API actually receives.
  const LIKE = read('like-dislike.js');
  const slugAt = LIKE.indexOf('function _pdxVoteSlug');
  const tidEnd = LIKE.indexOf('};', LIKE.indexOf('window._pdxVoteTargetId'));
  must(slugAt !== -1 && tidEnd > slugAt, 'like-dislike.js no longer defines the shared slugifier');
  vm.runInContext(LIKE.slice(slugAt, tidEnd + 2), ctx, { filename: 'like-dislike.js#slug' });

  vm.runInContext(GAPS_SRC, ctx, { filename: 'gaps.js' });
  must(win.PDXGaps, 'gaps.js did not publish window.PDXGaps');
  return { win, G: win.PDXGaps, styles, ctx };
}

const untestedItem = (reason, extra = {}) => Object.assign({ test: { reason }, weight: 1 }, extra);

// A record carrying one of every non-askable hold plus askable work, which is the
// only world in which both halves of the section render. The reason strings and the
// coverage counters are the real ones gaps.js switches on (see its sections 4-10):
//   askable → no_action_yet x2, not_issue_linked, unitemized_pledges
//   held    → circular_hold (recordDerived), spoken_for, below_floor (publishable:false)
const BOTH = {
  coverage: {
    word: 8, scorable: 8, tested: 2, untested: 6,
    issueLinked: 7, notIssueLinked: 1, recordDerived: 2, warming: false
  },
  untested: [
    untestedItem('no_action_yet', { issueKey: 'climate_action', weight: 3 }),
    untestedItem('no_action_yet', { issueKey: 'gun_policy', weight: 2 }),
    untestedItem('spoken_for', { issueKey: 'gun_policy', weight: 1 })
  ],
  tested: [{ weight: 2 }, { weight: 2 }],
  publishable: false,
  pledgeRemainder: 2
};

// ═════════════════════════════════════════════════════════════════════════════
section('1 · load + the promoted API');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build();
  ['sectionHtml', 'citeUrl', 'jump'].forEach((k) => {
    ok(typeof G[k] === 'function', `PDXGaps.${k} was not promoted onto the public API`);
  });
  // The panel it was promoted from is still there: the fold inside the Direction
  // Match card is the interactive surface and this is the citable one. Removing
  // either is a regression, not a simplification.
  ok(typeof G.panelHtml === 'function', 'the Direction Match gap panel was removed');
  ok(typeof G.forPolitician === 'function' && typeof G.count === 'function',
    'the derivation the section reads was removed');
  // One derivation, two surfaces. A second gap computation is a second answer.
  const derivations = (GAPS_SRC.match(/function forPolitician\(/g) || []).length;
  eq(derivations, 1, 'gaps.js grew a second gap derivation');
  has(GAPS_SRC, 'var gaps = forPolitician(pid, p, pre);',
    'the citable section does not read the same derivation the panel does');
}

// ═════════════════════════════════════════════════════════════════════════════
section('2 · two groups, and the split that matters');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  ok(html.length > 0, 'a record with gaps rendered no section');

  has(html, 'Still looking', 'the askable group is not named');
  has(html, 'On file, held out of the number', 'the held group is not named');
  // The order is load-bearing: what we are still chasing comes before what our own
  // rules are deliberately holding out, because the first is the actionable half.
  ok(html.indexOf('Still looking') < html.indexOf('On file, held out of the number'),
    'the held group is printed above the group a reader could actually help with');

  // "Held out of the number" is not a gap and must not be sold as one.
  has(html, 'Not gaps.', 'the held group does not say it is not a list of gaps');
  has(html, 'our own rules doing their job',
    'the held group does not say the exclusion is ours by design');
  has(html, 'The material is on file; it is deliberately not counted.'.replace(/ /g, ' '),
    'the held group does not say the material is on file');

  // Each group states its own count and nothing else's.
  const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
  const ask = gaps.filter((g) => g.askable).length;
  const holds = gaps.length - ask;
  ok(ask > 0 && holds > 0, `the BOTH fixture did not produce both halves (askable ${ask}, held ${holds})`);
  has(html, '<b>' + ask + '</b> open', 'the askable group miscounts or does not count');
  has(html, '<b>' + holds + '</b>', 'the held group does not state its own count');
  eq(G.count('booker', { name: 'Cory Booker' }), ask,
    'count() and the section disagree about how many gaps are open');

  // An empty half says so in its own words rather than vanishing — "nothing open"
  // is a real and useful statement, and it is not the same as "finished".
  const clean = build({ publishable: true, untested: [] });
  const cleanHtml = clean.G.sectionHtml('booker', { name: 'Cory Booker' });
  if (cleanHtml) {
    ok(!/Still looking — <b>/.test(cleanHtml) ? cleanHtml.includes('Still looking — nothing open') : true,
      'a record with no askable gaps neither counted them nor said there were none');
  }
  has(GAPS_FLAT, 'not a claim that the file is finished',
    'the empty askable branch does not refuse to imply the file is finished');
}

// ═════════════════════════════════════════════════════════════════════════════
section('3 · the vocabulary is the shipped vocabulary');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });

  // Every row label in the section is a TYPES label. The section invents no
  // vocabulary of its own — the panel, the moderator queue and the existing tests
  // all speak these words already, and a synonym here would be a second taxonomy.
  const keys = Object.keys(G.TYPES);
  const shown = G.forPolitician('booker', { name: 'Cory Booker' });
  ok(shown.length > 0, 'the BOTH fixture produced no rows to check');
  shown.forEach((g) => {
    // Every row is one of the shipped types. A per-issue row overrides the label
    // with the issue's name attached ("No action on file — Climate Action"), which
    // is the same vocabulary made specific, not a new one; a row with no override
    // prints the TYPES label verbatim.
    ok(keys.includes(g.type), `row "${g.label}" has type "${g.type}", which is not in TYPES`);
    ok(g.label === G.TYPES[g.type].label || g.label.length > 0,
      `row of type ${g.type} has no label at all`);
    has(html, g.label, `the section dropped the "${g.label}" row's own label`);
    // And the severity/askability came off TYPES rather than being set per row.
    eq(g.askable, G.TYPES[g.type].askable, `row ${g.type} overrode its own askability`);
    eq(g.severity, G.TYPES[g.type].sev, `row ${g.type} overrode its own severity`);
  });
  // The three holds print their TYPES labels verbatim — they have no per-issue
  // variant, because the reason they are held is not about one issue.
  ['circular_hold', 'spoken_for', 'below_floor'].forEach((t) => {
    const row = shown.find((g) => g.type === t);
    if (row) eq(row.label, G.TYPES[t].label, `the ${t} row renamed itself`);
  });

  // The four holds the brief named, each distinguishable in the shipped words.
  const T = G.TYPES;
  eq(T.no_record.askable, true, 'no stance yet is not askable — it is the one thing a tip can fix');
  eq(T.circular_hold.askable, false, 'the circularity hold is being asked about');
  eq(T.spoken_for.askable, false, 'the already-scored-issue hold is being asked about');
  eq(T.below_floor.askable, false, 'the publication floor is being asked about');
  has(T.circular_hold.label, 'written from the record itself',
    'the circularity hold no longer names its reason');
  has(T.spoken_for.label, 'already-scored issue', 'the second-position hold no longer names its reason');
  has(T.below_floor.label, 'Not enough tested record to publish',
    'the publication-floor hold no longer names its reason');
  has(T.no_record.label, 'Not yet documented', 'the no-stance gap no longer names its reason');

  // The held group's prose names all three holds in plain words, so the row labels
  // are not the only place a reader can learn what "held" means.
  const heldNote = (GAPS_SRC.match(/Not gaps\. These are our own rules[\s\S]*?deliberately not counted\./) || [''])[0];
  has(heldNote, 'written from the record it would be tested against', 'the held note does not explain the circularity rule');
  has(heldNote, 'second position on an issue', 'the held note does not explain the one-scored-item rule');
  has(heldNote, 'too thin to publish a figure from', 'the held note does not explain the publication floor');

  // And the floors themselves are untouched by this surface. Publishing the gap is
  // the alternative to lowering the floor, not a step toward it.
  no(GAPS_SRC, 'MIN_TESTED', 'gaps.js reaches for a publication floor constant');
  ok(!/floors\s*=\s*\{/.test(GAPS_SRC.slice(GAPS_SRC.indexOf('function sectionHtml'))),
    'the citable section defines floors of its own');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4 · documentation status only — the forbidden sentences');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  const lower = html.toLowerCase();

  // The accusations this section could be mistaken for. Each is a claim about the
  // official rather than about our archive.
  [
    'is incomplete', 'their record is', 'has failed', 'refuses to',
    'has not taken a position', 'no position on', 'silent on',
    'avoids', 'dodges', 'unaccountable', 'evasive',
    'thin record on', 'poor record', 'weak record', 'bad record'
  ].forEach((phrase) => {
    ok(!lower.includes(phrase), `the section says "${phrase}" — that is a claim about the person, not about our documentation`);
  });

  // The required sentence, in the lede, doing the work all of the above would do
  // wrongly: it says whose homework this is and that it counts for nothing.
  has(html, 'This is our own homework on this file, written down.',
    'the section does not say the list is ours');
  has(html, 'Nothing below counts for or against', 'the section does not say the gaps are not scored');
  has(html, 'a gap is a fact about what we have documented, not about them',
    'the section does not distinguish our documentation from their record');
  has(html, 'it disappears by itself the day the missing material lands',
    'the section does not say a gap is temporary');

  // The doctrine is written where the next editor will read it.
  has(GAPS_PROSE, 'WHAT IT MUST NEVER SAY', 'the citable section has no wall stating what it may not claim');
  has(GAPS_PROSE, 'Not "this person is incomplete"',
    'the wall does not name the specific sentence the brief forbade');
  has(GAPS_PROSE, 'A politician cannot be ranked by how much homework we have left',
    'the wall does not forbid ranking officials by our own backlog');
}

// ═════════════════════════════════════════════════════════════════════════════
section('5 · it names whose homework it is, first');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  const ledeAt = html.indexOf('This is our own homework');
  const firstRow = html.indexOf('pdxg-row');
  ok(ledeAt > -1 && (firstRow === -1 || ledeAt < firstRow),
    'the first gap row is printed before the sentence saying the list is ours');

  // The person's name is escaped, and the section falls back to a neutral noun
  // rather than printing "undefined" when it has no profile.
  const anon = G.sectionHtml('booker', null);
  if (anon) no(anon, 'undefined', 'the lede printed "undefined" where a name belongs');
  const xss = G.sectionHtml('booker', { name: '<script>x</script>' });
  if (xss) no(xss, '<script>x', 'the name in the lede is not escaped');
  has(GAPS_SRC, "'this official'", 'the lede has no neutral fallback for a missing name');
}

// ═════════════════════════════════════════════════════════════════════════════
section('6 · no grade, no percentage, no comparison');
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  no(html, '%', 'the gaps section contains a percent sign');
  ['data quality', 'coverage score', 'completeness', 'grade', 'tier ', 'rating'].forEach((w) => {
    ok(!html.toLowerCase().includes(w), `the gaps section says "${w}"`);
  });
  // No denominator over the issue vocabulary, and no comparison with anyone else.
  ok(!/of \d+ issues/.test(html), 'the gaps section grew a denominator over the issue vocabulary');
  const secSrc = GAPS_SRC.slice(GAPS_SRC.indexOf('function sectionHtml'), GAPS_SRC.indexOf('window._pdxGapsCopyCite'));
  ['average', 'median', 'percentile', 'compared with', 'more gaps than'].forEach((w) => {
    no(secSrc, w, `the citable section computes "${w}" — our backlog is not a league table`);
  });

  // The inventory line it does print is asked for WITHOUT its gap clause: this
  // whole section is that clause, and "4 open gaps" above a list of four gaps is
  // the same fact twice.
  const withInv = build(Object.assign({ inventory: true }, BOTH));
  const invHtml = withInv.G.sectionHtml('booker', { name: 'Cory Booker' });
  has(invHtml, 'data-omit="gaps"', 'the section prints the inventory line WITH its gap clause');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7 · the whole tail — the citable list does not summarise');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The panel caps askable rows at six because it lives inside an already-long
  // card on a phone. The citable list is the complete statement — a list that
  // silently stops at six is a list that reads as "these are all of them".
  const many = {
    coverage: {
      word: 11, scorable: 11, tested: 2, untested: 9,
      issueLinked: 11, notIssueLinked: 0, recordDerived: 0, warming: false
    },
    // Distinct labels, because one row per position is the unit a lead can answer
    // and identical labels would collide into one gap key.
    untested: Array.from({ length: 9 }, (_, i) =>
      untestedItem('no_action_yet', { label: 'Stated position ' + i, weight: 9 - i })),
    tested: [{ weight: 2 }, { weight: 2 }],
    publishable: false
  };
  const { G } = build(many);
  const all = G.forPolitician('booker', { name: 'Cory Booker' });
  const ask = all.filter((g) => g.askable);
  ok(ask.length > 6, `the fixture produced only ${ask.length} askable gaps — it cannot test the cap`);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  // <li>s, not every class beginning "pdxg-row" — a row also carries
  // .pdxg-row-h, .pdxg-row-detail and .pdxg-row-ask inside it.
  const rows = (html.match(/<li class="pdxg-row/g) || []).length;
  eq(rows, all.length, `the citable section printed ${rows} of ${all.length} rows — it capped the tail`);
  has(html, 'this section does not summarise the tail',
    'the citable section does not promise the complete list');
  // And it says so where the promise is made, not only in a comment.
  has(html, 'Every one is listed', 'the citable section does not state that every gap is listed');
  // The panel's cap is untouched.
  has(GAPS_SRC, 'var MAX_ASK_ROWS = 6;', 'the panel display cap was removed rather than left alone');
}

// ═════════════════════════════════════════════════════════════════════════════
section('8 · one thread per target — the citable rows are plain');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The same gap now renders twice on one page (the panel inside the Direction
  // Match card, and this section). A `gap:<pid>:<slug>` thread target can only be
  // addressed once per document, so the citable copy drops the discussion bar and
  // the lead cards and keeps the statement plus the on-ramp.
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  no(html, 'data-pdx-gap-leads', 'the citable rows mount lead cards — a second mount for one thread target');
  ok(!/pdx-thread|data-pdx-thread|pdxld-/.test(html),
    'the citable rows mount a discussion thread that already exists in the panel');
  // The on-ramp stays: it is keyed off the module's own registry rather than the
  // DOM, so it is safe to repeat, and a reader who arrived by link needs it.
  has(html, 'data-pdx-gap-ask=', 'the citable rows dropped the Suggest-a-lead on-ramp');
  has(html, 'Suggest a lead', 'the citable rows dropped the Suggest-a-lead label');
  has(GAPS_SRC, 'PLAIN MODE DROPS THE DISCUSSION BAR', 'rowHtml does not document what plain mode drops');
  has(GAPS_SRC, "opts.plain ? '' : engageHtml(gap)", 'plain mode still renders the discussion bar');

  // The panel is unchanged: it still carries both.
  const panel = G.panelHtml('booker', { name: 'Cory Booker' });
  if (panel) {
    has(panel, 'data-pdx-gap-leads', 'plain mode leaked into the Direction Match panel');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('9 · nothing to say → no section');
// ═════════════════════════════════════════════════════════════════════════════
{
  // A record with no gaps at all gets no section, not an empty one with a
  // reassuring heading. An empty "What the record can't test yet" reads as a
  // completeness claim we cannot make.
  const clean = build({
    coverage: { word: 9, scorable: 9, tested: 9, untested: 0, issueLinked: 9, notIssueLinked: 0, recordDerived: 0, warming: false },
    untested: [], publishable: true, pledgeRemainder: 0
  });
  const gaps = clean.G.forPolitician('booker', { name: 'Cory Booker' });
  if (!gaps.length) {
    eq(clean.G.sectionHtml('booker', { name: 'Cory Booker' }), '',
      'a record with no gaps rendered an empty gaps section');
  } else {
    // Still a valid world; assert the honest thing instead of skipping silently.
    ok(clean.G.sectionHtml('booker', { name: 'Cory Booker' }).length > 0,
      'a record with gaps rendered no section');
  }
  eq(clean.G.sectionHtml('', { name: 'Cory Booker' }), '', 'the section rendered with no pid');
  eq(clean.G.sectionHtml(null, null), '', 'the section rendered with nothing at all');
  has(GAPS_SRC, "if (!gaps.length) return '';", 'the section does not fail closed on an empty list');
}

// ═════════════════════════════════════════════════════════════════════════════
section('10 · the address: #gaps resolves, fails closed, and is copyable');
// ═════════════════════════════════════════════════════════════════════════════
{
  // The alias is short, stable and typeable, and it is deliberately not the DOM
  // id: a section can be re-anchored without breaking every link ever shared.
  has(PERSON_SRC, 'var SECTION_HASH = {', 'person-file.js has no citable-section map');
  has(PERSON_SRC, "gaps: 'pdxsec-gaps'", 'the #gaps alias does not resolve to the gaps anchor');
  has(PERSON_SRC, 'function sectionFromHash', 'person-file.js cannot read a section out of the address');
  has(PERSON_SRC, 'function sectionUrl', 'person-file.js cannot build a citable section address');
  // FAIL CLOSED: an unmapped hash opens the file at the top rather than scrolling
  // to an id that came off the address bar.
  has(PERSON_SRC, "return SECTION_HASH[raw] || '';", 'an unmapped hash is not refused');
  has(PERSON_SRC, 'FAIL CLOSED', 'person-file.js does not state the unmapped-hash rule');
  // A cold arrival hands the section to open(), because the element does not exist
  // yet when the browser would have tried to scroll to it.
  has(PERSON_SRC, 'open(pid, { section: sectionFromHash() })',
    'a cold arrival at /p/<pid>#gaps does not pass the section into open()');

  // The section prints its own address, and a copy control for it.
  const { G } = build(BOTH);
  const html = G.sectionHtml('booker', { name: 'Cory Booker' });
  eq(G.citeUrl('booker'), 'https://politidex.fyi/p/booker#gaps',
    'citeUrl does not build the durable address through PDXPerson');
  has(html, 'Cite this list:', 'the section does not offer its own address');
  has(html, 'politidex.fyi/p/booker#gaps', 'the printed address is wrong');
  no(html, '>https://', 'the printed address shows a scheme a reader has to read past');
  has(html, 'data-pdxgs-cite="https://politidex.fyi/p/booker#gaps"', 'the copy control has no address to copy');
  ok(typeof build(BOTH).win._pdxGapsCopyCite === 'function', 'the copy control has no handler');

  // No PDXPerson (an overlay, a dossier, a cold first paint) → no address clause,
  // and no broken one.
  const noPerson = build(Object.assign({ person: false }, BOTH));
  eq(noPerson.G.citeUrl('booker'), '', 'citeUrl invented an address without the router');
  const bare = noPerson.G.sectionHtml('booker', { name: 'Cory Booker' });
  ok(bare.length > 0, 'the section vanished when the router was absent');
  no(bare, 'Cite this list:', 'the section printed a cite clause with no address');

  // The anchor the address points at is emitted by the section itself.
  has(html, 'id="pdxsec-gaps"', 'the section does not emit the anchor its address points at');

  // And the door every other surface uses.
  const { G: G2, win } = build(BOTH);
  let jumped = null;
  win._pdxNavJump = (id) => { jumped = id; return true; };
  eq(G2.jump('booker'), true, 'jump() did not report success');
  eq(jumped, 'pdxsec-gaps', 'jump() went somewhere other than the gaps anchor');
}

// ═════════════════════════════════════════════════════════════════════════════
section('11 · wiring: receipts stage, spine, precache');
// ═════════════════════════════════════════════════════════════════════════════
{
  // Mounted in profiles-full.js, guarded, and inside a try — a throwing gaps
  // module must cost the section and not the profile.
  has(FULL_SRC, "typeof window.PDXGaps.sectionHtml === 'function'",
    'the profile mounts the gaps section without guarding on it');
  has(FULL_SRC, 'window.PDXGaps.sectionHtml(id, p)', 'the profile does not mount the gaps section');
  const mountAt = FULL_SRC.indexOf('WHAT THE RECORD CAN');
  must(mountAt > -1, 'profiles-full.js no longer carries the gaps mount comment');
  const mount = FULL_SRC.slice(mountAt, mountAt + 2200);
  has(mount, 'catch(e){ return', 'the gaps mount is not wrapped in a try');
  has(mount, 'Documentation status only', 'the mount does not state what the section is');

  // It sits in the receipts stage, not beside the score: a statement about our own
  // coverage belongs with the proof layer, not in the stage where a finding is
  // published.
  has(SPINE_SRC, "'pdxsec-gaps': 'receipts'", 'the gaps anchor is not registered in the profile spine');
  ok(!/'pdxsec-gaps':\s*'(verdict|score|headline)'/.test(SPINE_SRC),
    'the gaps section was placed in the stage where findings are published');
  ok(FULL_SRC.indexOf('window.PDXGaps.sectionHtml') > FULL_SRC.indexOf('_renderEvidenceSummary'),
    'the gaps section mounts above the evidence layer it belongs with');

  // Shipped together: a phone holding the old shell that picks up only
  // profiles-full.js emits a section its gaps.js cannot render.
  has(SW, "'/gaps.js'", 'sw.js does not precache gaps.js');
  // person-file.js and profiles-full.js are NOT in SHELL_ASSETS — they are
  // stale-while-revalidate RUNTIME_CACHE entries. That is fine and it is why the
  // version bump is the mechanism that ships them together: BOTH cache names are
  // built from CACHE_VERSION, so renaming it empties both on activate. A bump that
  // only flushed the shell would leave a phone serving the old profiles-full.js
  // beside the new gaps.js.
  ok(!/SHELL_ASSETS[\s\S]*'\/profiles-full\.js'[\s\S]*?\n\];/.test(SW),
    'profiles-full.js was added to the precache list — it is a runtime-cached asset');
  has(SW, 'const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`',
    'the runtime cache is no longer versioned, so a runtime-cached module can outlive a bump');
  const v = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
  ok(v && Number(v.slice(1)) >= 77, `sw.js CACHE_VERSION is ${v} — eight files moved together and need a bump`);
  has(SW, 'THE COVERAGE INVENTORY AND THE CITABLE GAPS SECTION',
    'the cache bump does not say what moved');
  has(SW, 'person-file.js and profiles-full.js',
    'the cache bump claims a precache guarantee for the two runtime-cached files');

  // Runtime-injected CSS, once — index.html's render-blocking stylesheet budget is
  // full (scripts/test-index-scripts.mjs).
  const { G, styles } = build(BOTH);
  G.sectionHtml('booker', { name: 'Cory Booker' });
  G.sectionHtml('booker', { name: 'Cory Booker' });
  ok(styles.filter((s) => s.id === 'pdx-gapsec-css').length === 1,
    'the gaps section injected its stylesheet more than once');
  ok(!/gaps-section\.css/.test(read('index.html')),
    'a new render-blocking stylesheet was added for the gaps section');
}

console.log('');
if (failures.length) {
  console.error(`✗ citable gaps: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ citable gaps: our own homework, at an address, in documentation-status words — ${passed} assertions passed\n`);
