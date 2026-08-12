/* ═══════════════════════════════════════════════════════════════════════════
   test-gaps.mjs — Coverage Gaps + Suggest-a-Lead (Phase 1)
   ────────────────────────────────────────────────────────────────────────────
   This layer exists to say, out loud, what we have NOT documented — and to take
   research leads from readers. That makes it the place where two specific kinds
   of dishonesty are easiest to introduce:

     1. Letting community input touch the accountability read. A lead is an
        unverified claim from an anonymous member. If one could reach Word vs
        Action, the Official Record, promise scoring or a strength badge, the
        score would become a poll.
     2. Framing our own missing homework as the politician's missing record. A
        gap is a statement about US. "We have not documented this yet" and
        "their record is incomplete" are different claims, and only the first is
        one we can support.

   So this file does not check that the module renders. It checks the rules:
   gaps are derived (never stored), explain-only gaps never solicit, keys address
   the existing thread API, leads never enter a score, lead state is derived
   server-side, and the copy describes our documentation status.

   Sections:
     1. Load + shape
     2. The taxonomy — askable vs explain-only
     3. Derivation from a controllable world
     4. Gap keys satisfy the EXISTING item-thread contract
     5. Zero gaps → zero UI
     6. Explain-only gaps never ask
     7. Leads render as questions, never as receipts
     8. The wall: nothing in the gap layer reaches a score
     9. Copy discipline — our documentation status, not their record
    10. The migration is additive, idempotent and forward-only
    11. /api/community validates gap context and derives lead_state
    12. The composer is locked to the gap it was opened from
    13. Wiring: script tag, panel hook, mobile-first CSS
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
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ gaps: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const GAPS_SRC = read('gaps.js');
const WA_SRC = read('word-action.js');
const WA_CSS = read('word-action.css');
const INDEX = read('index.html');
const COMMUNITY = read('netlify/functions/community.mts');
const SCHEMA = read('db/schema.ts');
const MIGRATION = read('netlify/database/migrations/20260825000000_cee_posts_gap_and_politician_links/migration.sql');

// ═════════════════════════════════════════════════════════════════════════════
// A sandbox whose record can be made to say anything
// ═════════════════════════════════════════════════════════════════════════════
// The gap list is a pure function of what PDXWordAction.read() and
// PDXCoverage.assess() return, so the world is exactly those two stubs. The
// stub's SHAPE is lifted from the real read() return in word-action.js — if that
// shape changes, section 3 is testing a fiction, so section 1 asserts the fields
// it depends on still exist in the source.
function build({ coverage = {}, untested = [], tested = [], publishable = true,
                 pledgeAggregate = null, pledgeRemainder = 0, assess = null,
                 profile = { name: 'Cory Booker' } } = {}) {
  const win = {};
  const timers = [];
  const fetches = [];
  const ctx = {
    window: win,
    document: { querySelector: () => null, querySelectorAll: () => [] },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    fetch: (url) => { fetches.push(url); return { then: () => ({ then: () => ({ catch: () => {} }) }) }; },
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.addEventListener = () => {};

  const cov = Object.assign(
    { word: 6, scorable: 6, tested: 3, untested: 3, issueLinked: 6, notIssueLinked: 0,
      recordDerived: 0, warming: false },
    coverage
  );
  win.PDXWordAction = {
    read: () => ({
      coverage: cov,
      items: new Array(cov.word).fill({}),
      tested, untested,
      publishable,
      pledgeAggregate, pledgeRemainder,
      floors: { items: 3, weight: 6, evidenceCap: 3 }
    })
  };
  win.PDXCoverage = { assess: () => assess || { key: 'rich', records: 9, stances: 4, spotlight: 3, promises: 2 } };
  win.PROFILES = { booker: profile };
  win.ISSUE_MAP = { climate_action: { label: 'Climate Action' }, gun_policy: { label: 'Gun Policy' } };
  // The REAL shared slugifier/target builder, lifted from its own definition
  // rather than restated here: it is the single thing that guarantees a gap key
  // and the discussion thread the API opens for it agree. (like-dislike.js as a
  // whole wants a browser — localStorage, MutationObserver, a live document — so
  // this takes the two functions gaps.js actually reuses.)
  const LIKE = read('like-dislike.js');
  const slugAt = LIKE.indexOf('function _pdxVoteSlug');
  const tidEnd = LIKE.indexOf('};', LIKE.indexOf('window._pdxVoteTargetId'));
  must(slugAt !== -1 && tidEnd > slugAt,
    'like-dislike.js no longer defines _pdxVoteSlug / _pdxVoteTargetId — gaps.js reuses them for keys');
  vm.runInContext(LIKE.slice(slugAt, tidEnd + 2), ctx, { filename: 'like-dislike.js#slug' });
  must(typeof win._pdxVoteTargetId === 'function',
    'like-dislike.js no longer publishes _pdxVoteTargetId — gaps.js reuses it for keys');

  vm.runInContext(GAPS_SRC, ctx, { filename: 'gaps.js' });
  must(win.PDXGaps, 'gaps.js did not publish window.PDXGaps');
  return { win, G: win.PDXGaps, timers, fetches, ctx };
}

const untestedItem = (reason, extra = {}) => Object.assign({ test: { reason }, weight: 1 }, extra);

// ═════════════════════════════════════════════════════════════════════════════
// 1 · Load + shape
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build();
  ['forPolitician', 'count', 'rowHtml', 'panelHtml', 'TYPES', 'slug', 'targetId'].forEach((k) => {
    ok(G[k] !== undefined, `PDXGaps.${k} is missing from the public API`);
  });
  // The fields the derivation reads must still be the fields read() returns.
  ['recordDerived', 'notIssueLinked', 'warming', 'scorable'].forEach((f) => {
    must(WA_SRC.includes(f + ':'), `word-action.js read().coverage no longer reports \`${f}\``);
  });
  must(/reason: 'no_action_yet'/.test(WA_SRC), 'word-action.js no longer emits the no_action_yet reason');
  must(/'spoken_for'/.test(WA_SRC), 'word-action.js no longer emits the spoken_for reason');
  must(/reason: 'unresolved'/.test(WA_SRC), 'word-action.js no longer emits the unresolved (open pledge) reason');
  must(/resolved:\s*k \+ b/.test(WA_SRC), 'pledgeAggregate no longer reports `resolved`');

  // Loading twice must not clobber a live registry.
  ok(/if \(window\.PDXGaps\) return;/.test(GAPS_SRC), 'gaps.js is not idempotent on double-load');
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · The taxonomy — askable vs explain-only
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build();
  const ASKABLE = ['no_record', 'thin_record', 'thin_formal_action', 'no_action_yet',
    'pending_pledge', 'unitemized_pledges', 'not_issue_linked'];
  const EXPLAIN = ['circular_hold', 'spoken_for', 'below_floor'];
  ASKABLE.forEach((t) => {
    ok(G.TYPES[t] && G.TYPES[t].askable === true, `${t} must be askable`);
  });
  EXPLAIN.forEach((t) => {
    ok(G.TYPES[t] && G.TYPES[t].askable === false,
      `${t} must NOT be askable — it is our own method working as designed`);
  });
  eq(Object.keys(G.TYPES).length, ASKABLE.length + EXPLAIN.length,
    'the taxonomy grew or shrank without this test being updated');
  // Severity orders a research queue. It must never be presented as a score, so
  // no rendered surface may print the number.
  const { G: G2 } = build({ coverage: { notIssueLinked: 2 } });
  const html = G2.panelHtml('booker', { name: 'Cory Booker' });
  const sev = String(G2.TYPES.not_issue_linked.sev);
  ok(!html.includes('>' + sev + '<') && !html.includes('severity'),
    'gap severity must not be rendered — it ranks our queue, it is not a number about a person');
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · Derivation from a controllable world
// ═════════════════════════════════════════════════════════════════════════════
{
  // Nothing documented at all → exactly one gap, and no downstream noise about
  // positions that do not exist.
  const { G } = build({
    coverage: { word: 0, scorable: 0, tested: 0, untested: 0, issueLinked: 0 },
    assess: { key: 'none', records: 0 }
  });
  const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
  eq(gaps.length, 1, 'an undocumented record should produce exactly one gap');
  eq(gaps[0].type, 'no_record', 'an undocumented record should produce no_record');
}
{
  // Said it, no action on file → one gap per issue, most-weighted first.
  const { G } = build({
    untested: [
      untestedItem('no_action_yet', { issueKey: 'gun_policy', weight: 1 }),
      untestedItem('no_action_yet', { issueKey: 'climate_action', weight: 3 })
    ]
  });
  const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
  const na = gaps.filter((g) => g.type === 'no_action_yet');
  eq(na.length, 2, 'each issue with word but no action should get its own gap row');
  ok(/Climate Action/.test(na[0].label), 'the heaviest untested issue should lead');
  ok(na[0].issueKey === 'climate_action', 'a per-issue gap must carry its issue key for the composer');
  ok(na.every((g) => g.ask && /vote|sponsorship|order|filing/i.test(g.ask)),
    'an askable gap must say what would actually fill it');
}
{
  // Every remaining type fires off the value it is derived from.
  const cases = [
    ['thin_record', { assess: { key: 'thin', records: 2 } }],
    ['thin_formal_action', { coverage: { warming: true } }],
    ['pending_pledge', { untested: [untestedItem('unresolved', { label: 'Cancel student debt' })] }],
    ['unitemized_pledges', { pledgeAggregate: { kept: 5, broken: 3, pending: 1, resolved: 8, total: 9 } }],
    ['not_issue_linked', { coverage: { notIssueLinked: 4 } }],
    ['circular_hold', { coverage: { recordDerived: 3 } }],
    ['spoken_for', { untested: [untestedItem('spoken_for', { issueKey: 'gun_policy' })] }],
    ['below_floor', { publishable: false, tested: [{}] }]
  ];
  cases.forEach(([type, world]) => {
    const { G } = build(world);
    const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
    ok(gaps.some((g) => g.type === type), `${type} was not derived from the world that should produce it`);
  });
  // pledgeRemainder is the other route to the same disclosure.
  const { G } = build({ pledgeRemainder: 172 });
  const g = G.forPolitician('booker', { name: 'Cory Booker' })
    .filter((x) => x.type === 'unitemized_pledges')[0];
  ok(g && g.count === 172, 'the un-itemized pledge remainder should be reported as its own gap');
}
{
  // Sorted most-missing first.
  const { G } = build({
    coverage: { notIssueLinked: 2, recordDerived: 2, warming: true },
    untested: [untestedItem('no_action_yet', { issueKey: 'climate_action' })]
  });
  const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
  const sevs = gaps.map((x) => x.severity);
  eq(JSON.stringify(sevs), JSON.stringify(sevs.slice().sort((a, b) => b - a)),
    'gaps must be ordered most-missing first');
  // Every hold sorts below every ask, so the list never opens with methodology.
  const firstHold = gaps.findIndex((x) => !x.askable);
  const lastAsk = gaps.map((x) => x.askable).lastIndexOf(true);
  ok(firstHold === -1 || firstHold > lastAsk, 'explain-only rows must not outrank real gaps');
}
{
  // Missing globals reduce the gap list; they never throw.
  const { win, G } = build();
  delete win.PDXWordAction;
  delete win.PDXCoverage;
  let threw = false;
  let out = null;
  try { out = G.forPolitician('booker', { name: 'Cory Booker' }); } catch (e) { threw = true; }
  ok(!threw, 'forPolitician must never throw when a source global is absent');
  ok(Array.isArray(out) && out.length === 0, 'with no sources there is nothing we can honestly claim is missing');
  let threw2 = false;
  try { G.panelHtml('booker', { name: 'Cory Booker' }); } catch (e) { threw2 = true; }
  ok(!threw2, 'panelHtml must never throw');
}
{
  // Derived, never stored. Nothing in the module may persist a gap.
  ok(!/localStorage|sessionStorage|indexedDB/.test(GAPS_SRC),
    'gaps.js must not persist gaps anywhere — they are recomputed from the record');
  const writes = GAPS_SRC.match(/method:\s*'POST'|method: "POST"/g);
  ok(!writes, 'gaps.js must not write anything; the composer owns submission');
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Gap keys satisfy the EXISTING item-thread contract
// ═════════════════════════════════════════════════════════════════════════════
{
  const THREADS = read('netlify/functions/threads.mts');
  const m = THREADS.match(/TARGET_RE\s*=\s*(\/[^\n]+?\/)\s*;/);
  must(m, 'threads.mts no longer defines TARGET_RE — gap discussion depends on its shape');
  const TARGET_RE = new RegExp(m[1].slice(1, -1));

  // Underscored profile ids and underscored issue keys are the real world here
  // (pid "aaron_ford", issue "climate_action"), and the third segment of a target
  // id may not contain an underscore. This is the case a hand-rolled key gets
  // wrong, so assert it against the API's own regex.
  const { G } = build({
    untested: [untestedItem('no_action_yet', { issueKey: 'climate_action' })],
    coverage: { notIssueLinked: 1, recordDerived: 1 }
  });
  const gaps = G.forPolitician('aaron_ford', { name: 'Aaron Ford' });
  ok(gaps.length >= 3, 'harness produced too few gaps to test key shape');
  gaps.forEach((g) => {
    ok(TARGET_RE.test(g.key), `gap key "${g.key}" is rejected by the item-thread API`);
    ok(g.key.startsWith('gap:'), `gap key "${g.key}" must be namespaced gap:`);
  });
  // Stable: the same world produces the same keys.
  const { G: G2 } = build({
    untested: [untestedItem('no_action_yet', { issueKey: 'climate_action' })],
    coverage: { notIssueLinked: 1, recordDerived: 1 }
  });
  eq(JSON.stringify(G2.forPolitician('aaron_ford', { name: 'Aaron Ford' }).map((g) => g.key)),
    JSON.stringify(gaps.map((g) => g.key)),
    'gap keys must be stable across renders or discussion would be orphaned');
  // Distinct issues on the same type get distinct threads.
  const { G: G3 } = build({
    untested: [
      untestedItem('no_action_yet', { issueKey: 'climate_action' }),
      untestedItem('no_action_yet', { issueKey: 'gun_policy' })
    ]
  });
  const keys = G3.forPolitician('booker', {}).map((g) => g.key);
  eq(new Set(keys).size, keys.length, 'two different gaps must not share one discussion thread');
  // The engagement row is the EXISTING thread control, not a new comment system.
  ok(/_pdxSpotlightEngageHTML/.test(GAPS_SRC),
    'gap rows must embed the existing item-thread engagement control');
  ok(!/fetch\([^)]*threads|'\/api\/threads'|"\/api\/threads"/.test(GAPS_SRC),
    'gaps.js must not call the threads API directly — the shared control owns that');
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · Zero gaps → zero UI
// ═════════════════════════════════════════════════════════════════════════════
{
  // A fully documented record: every position tested, nothing held, above floor.
  const { G } = build({
    coverage: { word: 8, scorable: 8, tested: 8, untested: 0, issueLinked: 8, notIssueLinked: 0, recordDerived: 0, warming: false },
    tested: [{}, {}, {}, {}, {}, {}, {}, {}]
  });
  eq(G.count('booker', { name: 'Cory Booker' }), 0, 'a fully documented record has no open gaps');
  eq(G.panelHtml('booker', { name: 'Cory Booker' }), '',
    'a profile with nothing missing must render NO extra UI');
}
{
  // Holds alone are not an invitation: methodology with no real gap renders
  // nothing, or every profile would grow a permanent "gaps" affordance.
  const { G } = build({
    coverage: { word: 8, scorable: 6, tested: 6, untested: 2, issueLinked: 8, notIssueLinked: 0, recordDerived: 2 },
    tested: [{}, {}, {}, {}, {}, {}]
  });
  const gaps = G.forPolitician('booker', {});
  ok(gaps.length > 0 && gaps.every((g) => !g.askable), 'harness should produce holds only');
  eq(G.panelHtml('booker', {}), '', 'explain-only holds alone must not open a gaps panel');
}
{
  // The collapsed line counts ASKABLE gaps only — a hold must never inflate it.
  const { G } = build({
    coverage: { notIssueLinked: 1, recordDerived: 4 },
    untested: [untestedItem('spoken_for'), untestedItem('spoken_for')]
  });
  const html = G.panelHtml('booker', {});
  eq(G.count('booker', {}), 1, 'only askable gaps count');
  ok(/<b>1 open gap<\/b>/.test(html), 'the collapsed line must count askable gaps only');
  ok(/See what’s missing/.test(html), 'the collapsed line must carry the expand affordance');
  // Collapsed by default: the body is hidden until asked for.
  ok(/class="pdxg-body" hidden/.test(html), 'the gap list must start collapsed');
  ok(/aria-expanded="false"/.test(html), 'the toggle must report its collapsed state to a screen reader');
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · Explain-only gaps never ask
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build({
    coverage: { notIssueLinked: 1, recordDerived: 3, warming: false },
    untested: [untestedItem('spoken_for')],
    publishable: false,
    tested: [{}]
  });
  const gaps = G.forPolitician('booker', {});
  const holds = gaps.filter((g) => !g.askable);
  ok(holds.length >= 3, 'harness should produce all three explain-only types');
  holds.forEach((h) => {
    const row = G.rowHtml(h);
    ok(!/Suggest a lead/.test(row), `${h.type} must not offer to take a lead`);
    ok(!/pdxg-ask-btn/.test(row), `${h.type} must not render an ask button`);
    ok(/How this is counted/.test(row), `${h.type} must point at the method instead`);
    ok(!/pdxg-leads/.test(row), `${h.type} must not host community leads`);
  });
  // The panel-level guard, and the API-level guard behind it.
  const html = G.panelHtml('booker', {});
  const askCount = (html.match(/pdxg-ask-btn/g) || []).length;
  eq(askCount, 1, 'exactly the one askable gap in this world may offer to take a lead');
  ok(/openForGap/.test(INDEX), 'PDXCommunity.openForGap is missing');
  ok(/if \(gap\.askable === false\) return;/.test(INDEX),
    'openForGap must refuse a non-askable gap even if a caller asks');
  // And the server will not store one either.
  ['circular_hold', 'spoken_for', 'below_floor'].forEach((t) => {
    const inAllowList = new RegExp('GAP_TYPES[\\s\\S]{0,400}"' + t + '"').test(COMMUNITY);
    ok(!inAllowList, `${t} must not be in the server's accepted gap types`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · Leads render as questions, never as receipts
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/💡 Lead/.test(GAPS_SRC), 'a lead card must always be labelled a lead');
  ok(/Community Submitted/.test(GAPS_SRC), 'a lead card must always carry the Community Submitted treatment');
  ok(/needs_source|Needs source/.test(GAPS_SRC) && /has_source|Has source/.test(GAPS_SRC),
    'a lead card must show whether it arrived with a source');
  ok(/not part of the record/.test(GAPS_SRC),
    'the lead list must say plainly that it is not part of the record');
  // Nothing that belongs to verified evidence may appear on a lead card.
  const leadRegion = GAPS_SRC.slice(GAPS_SRC.indexOf('function leadCard'), GAPS_SRC.indexOf('window._pdxGapsOpenLead'));

  must(leadRegion.length > 100, 'gaps.js no longer defines leadCard — section 7 is testing nothing');
  [/strength/i, /verified/i, /%/, /score/i].forEach((re) => {
    ok(!re.test(leadRegion), `a lead card must not carry ${re} — it is a research question, not a receipt`);
  });
  // Sourced above unsourced, newest first, capped — but no numeric priority.
  ok(/has_source' \? 0 : 1/.test(GAPS_SRC), 'sourced leads must be pinned above unsourced ones');
  ok(/MAX_LEAD_CARDS/.test(GAPS_SRC), 'the lead list must be capped for mobile');
  ok(!/momentum|priority|rank/i.test(leadRegion), 'Phase 1 has no lead ranking');
  // Read-only, public, and lazy: one GET per profile, fired on expand.
  const { win, G, timers } = build({ coverage: { notIssueLinked: 1 } });
  G.panelHtml('booker', {});
  eq(timers.length, 0, 'a collapsed panel must not fetch anything');
  ok(/\/api\/community\/posts\?kind=lead&pol=/.test(GAPS_SRC),
    'leads must be read from the existing community API with the new filters');
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · The wall: nothing in the gap layer reaches a score
// ═════════════════════════════════════════════════════════════════════════════
{
  // word-action.js may CALL the gap layer for display; it must never read from it.
  must(/function gapsHtml\(pid, p, r\)/.test(WA_SRC), 'word-action.js no longer hosts the gap panel');
  const scoreRegion = WA_SRC.slice(0, WA_SRC.indexOf('function methodHtml'));
  ok(!/PDXGaps|gapsHtml|PDXCommunity|cee_posts|leadState/.test(scoreRegion),
    'the scoring half of word-action.js must not reference the gap or community layer');
  // The panel hook is display-only and guarded.
  const hook = WA_SRC.slice(WA_SRC.indexOf('function gapsHtml'), WA_SRC.indexOf('function gapsHtml') + 500);
  ok(/try \{/.test(hook) && /catch/.test(hook), 'the gap hook must be guarded — a gap failure cannot break the read');
  ok(/panelHtml\(pid, p, r\)/.test(hook), 'the gap panel must reuse the read it is rendered beside');
  // And the gap layer never reads a score. It may ask the read what is MISSING
  // (coverage, untested reasons, the floor it did not clear) and nothing else:
  // no percentage, no verdict, no tier weight may cross into this module.
  ok(!/\br\.pct\b|\br\.verdict\b|\br\.token\b|\br\.counts\b|\br\.tiers\b|\br\.testedWeight\b/.test(GAPS_SRC),
    'gaps.js must not read the score, the verdict or the tier weights');
  // The server keeps leads out of the curated record: no promotion path is added.
  ok(!/cee_promoted[\s\S]{0,200}gapType/.test(COMMUNITY), 'a lead must not auto-promote into the curated record');
  ok(/lead_state[\s\S]{0,600}NOT a verification status|NOT a verification status/.test(SCHEMA),
    'db/schema.ts must say plainly that lead_state is not a verification status');
}

// ═════════════════════════════════════════════════════════════════════════════
// 9 · Copy discipline — our documentation status, not their record
// ═════════════════════════════════════════════════════════════════════════════
{
  const { G } = build({
    assess: { key: 'thin', records: 2 },
    coverage: { notIssueLinked: 2, recordDerived: 1, warming: true },
    untested: [untestedItem('no_action_yet', { issueKey: 'climate_action' }), untestedItem('unresolved', { label: 'A pledge' })],
    pledgeRemainder: 4,
    publishable: false,
    tested: [{}]
  });
  const gaps = G.forPolitician('booker', { name: 'Cory Booker' });
  const prose = gaps.map((g) => g.label + ' ' + g.detail + ' ' + g.ask).join('\n') +
    '\n' + G.panelHtml('booker', { name: 'Cory Booker' });
  // The specific sentences that would turn our homework into an accusation.
  [
    /their record is incomplete/i,
    /incomplete record/i,
    /has failed to/i,
    /refuses to/i,
    /hiding/i,
    /no record of (them|him|her)/i
  ].forEach((re) => {
    ok(!re.test(prose), `gap copy must not say ${re} — a gap is a statement about US`);
  });
  // …and the framing that keeps it honest must actually be there.
  ok(/we (have|do not|hold|show)/i.test(prose), 'gap copy should speak in the first person about our own coverage');
  ok(/not a mark against/i.test(prose), 'at least one gap should say plainly that it is not a mark against anyone');
  ok(/list of our own homework/i.test(prose), 'the panel should frame the list as our own homework');
  // No party, no ideology, anywhere in the vocabulary.
  [/republican/i, /democrat/i, /liberal/i, /conservative/i, /left-wing/i, /right-wing/i].forEach((re) => {
    ok(!re.test(GAPS_SRC), `gaps.js must not contain ${re}`);
  });
  // The composer's framing sentence is the load-bearing one, verbatim.
  ok(INDEX.includes('You are suggesting something for us to check — not adding to the record. A curator verifies and sources anything that becomes part of it.'),
    'the Suggest-a-lead framing sentence is missing or altered');
}

// ═════════════════════════════════════════════════════════════════════════════
// 10 · The migration is additive, idempotent and forward-only
// ═════════════════════════════════════════════════════════════════════════════
{
  const cols = ['linked_politician_ids', 'gap_key', 'gap_type', 'lead_state', 'dup_of'];
  cols.forEach((c) => {
    ok(new RegExp('ADD COLUMN IF NOT EXISTS ' + c).test(MIGRATION),
      `${c} must be added with ADD COLUMN IF NOT EXISTS`);
    ok(new RegExp(c.replace(/_(\w)/g, (_, x) => x.toUpperCase()) + '|' + c).test(SCHEMA),
      `${c} must be mirrored in db/schema.ts`);
  });
  ['cee_posts_gap_type_idx', 'cee_posts_lead_state_idx'].forEach((i) => {
    ok(new RegExp('CREATE INDEX IF NOT EXISTS ' + i).test(MIGRATION), `${i} must be created idempotently`);
    ok(SCHEMA.includes(i), `${i} must be mirrored in db/schema.ts`);
  });
  // Additive only: nothing existing may be dropped, renamed or retyped.
  [/DROP\s+TABLE/i, /DROP\s+COLUMN/i, /RENAME/i, /ALTER\s+COLUMN/i, /TRUNCATE/i, /DELETE\s+FROM/i].forEach((re) => {
    ok(!re.test(MIGRATION), `the migration must not ${re}`);
  });
  // The backfill exists (ADD COLUMN … DEFAULT would otherwise mark every historical
  // row 'needs_source') and is scoped so a re-run is a no-op.
  const updates = MIGRATION.match(/UPDATE cee_posts[\s\S]*?;/g) || [];
  ok(updates.length === 2, 'the historical backfill should correct evidence rows and already-sourced leads');
  updates.forEach((u) => {
    ok(/WHERE[\s\S]*lead_state = 'needs_source'/.test(u),
      'each backfill must be scoped to rows still at the default so it stays idempotent');
  });
  // Forward-only: the new migration must sort after every applied one. The
  // platform orders by the version prefix across BOTH layouts this repo uses —
  // flat `<version>_name.sql` seeds and drizzle's `<version>_name/migration.sql`
  // folders — and rejects the deploy outright if a pending version sorts before
  // the highest applied one. So the check has to see folders too; filtering to
  // `.sql` alone once let an out-of-order folder through unnoticed.
  const MIG_DIR = path.join(ROOT, 'netlify/database/migrations');
  const versions = fs.readdirSync(MIG_DIR)
    .filter((f) => /^\d{14}_/.test(f))
    .map((f) => f.replace(/\.sql$/, ''))
    .sort();
  eq(versions[versions.length - 1], '20260825000000_cee_posts_gap_and_politician_links',
    'the new migration must sort last, after every applied migration');
  // Exactly one entry may carry this change — a folder and a flat file for the
  // same DDL would apply it twice.
  eq(versions.filter((v) => /cee_posts_gap_and_politician_links/.test(v)).length, 1,
    'the gap migration must exist exactly once');
  // And no gap table: gaps are derived.
  ok(!/CREATE TABLE[\s\S]*gap/i.test(MIGRATION), 'there must be no gap table — gaps are derived, never stored');
}

// ═════════════════════════════════════════════════════════════════════════════
// 11 · /api/community validates gap context and derives lead_state
// ═════════════════════════════════════════════════════════════════════════════
{
  must(/const GAP_TYPES = new Set/.test(COMMUNITY), 'community.mts no longer declares GAP_TYPES');
  must(/function cleanPoliticianIds/.test(COMMUNITY), 'community.mts no longer validates politician ids');
  // The roster allow-list is real data, not a regex on whatever arrives.
  ok(/share-index\.json/.test(COMMUNITY), 'linked politician ids must be validated against the roster');
  const roster = JSON.parse(read('db/share-index.json'));
  ok(Object.keys(roster.people || {}).length > 500,
    'the roster allow-list looks too small to be the real roster');
  ok(roster.people.booker && roster.people.trump, 'the roster should contain the underscored pids the app renders');
  // lead_state is DERIVED from the submission, never taken on trust.
  ok(/leadState = sourceUrl \? "has_source" : "needs_source"/.test(COMMUNITY),
    'lead_state must be derived from whether a source was actually submitted');
  ok(/body\.leadState === leadState/.test(COMMUNITY),
    'a client-supplied lead state may only be honoured when it agrees with the submission');
  // Gap context belongs to leads only, and only when fully valid.
  ok(/kind === "lead" && GAP_KEY_RE\.test\(rawGapKey\) && GAP_TYPES\.has\(rawGapType\)/.test(COMMUNITY),
    'gap key and gap type must both validate, on a lead, or neither is stored');
  ok(/GAP_KEY_RE = \/\^gap:/.test(COMMUNITY), 'the gap key format must be validated server-side');
  // Filters narrow; an unknown value must never widen the result set.
  ok(/pol && !ROSTER\.has\(pol\)\) \|\| \(gap && !GAP_TYPES\.has\(gap\)\)/.test(COMMUNITY),
    'an unrecognised filter value must narrow to nothing, not return the whole board');
  ok(/@> \$\{JSON\.stringify\(\[pol\]\)\}::jsonb/.test(COMMUNITY),
    'the politician filter should use jsonb containment in SQL');
  // The new fields come back out.
  ['linkedPoliticianIds', 'gapKey', 'gapType', 'leadState'].forEach((f) => {
    ok(new RegExp('shapePost[\\s\\S]{0,1200}' + f).test(COMMUNITY), `shapePost must return ${f}`);
  });
  // Writes still require a verified, non-anonymous user — unchanged.
  ok(/if \(!viewer \|\| viewer\.isAnonymous\) return unauth\(\);/.test(COMMUNITY),
    'creating a post must still require a signed-in, non-anonymous user');
}

// ═════════════════════════════════════════════════════════════════════════════
// 12 · The composer is locked to the gap it was opened from
// ═════════════════════════════════════════════════════════════════════════════
{
  // One composer, not a second one: the existing Exchange overlay is reused.
  ok(/composeGap/.test(INDEX), 'the Exchange composer has no gap-locked mode');
  ok(/composeKind = composeGap \? 'lead'/.test(INDEX),
    'a gap-locked compose must be a lead by construction — the kind is not the submitter’s to change');
  ok(/body\.linkedPoliticianIds = \[composeGap\.pid\]/.test(INDEX), 'the locked politician must travel with the submission');
  ok(/body\.gapKey = composeGap\.key/.test(INDEX) && /body\.gapType = composeGap\.type/.test(INDEX),
    'the locked gap must travel with the submission');
  ok(/Claim to check/.test(INDEX), 'the gap composer should ask for a claim to check, not a headline');
  ok(/Notes for the curator/.test(INDEX), 'the gap composer should ask for notes for the curator');
  ok(/strongly encouraged/.test(INDEX), 'the source link should be strongly encouraged on a lead');
  ok(/cee-chip-lock/.test(INDEX), 'the locked politician + gap must render as read-only chips');
  // No parallel comment system was introduced anywhere: no new table, and the
  // rows embed the shared control rather than their own thread.
  ok(!/gap_comments|pdx_gap/i.test(MIGRATION + GAPS_SRC + COMMUNITY),
    'Phase 1 must not add a second comment system');
  ok(!/CREATE TABLE/i.test(MIGRATION), 'Phase 1 adds columns to cee_posts, not a new table');
  // Phase 1 boundaries: no roster-card CTAs, no global board, no digest.
  const searchRegion = INDEX.match(/function\s+\w*[Rr]osterCard[\s\S]{0,3000}/);
  if (searchRegion) {
    ok(!/Suggest a lead/.test(searchRegion[0]), 'Phase 1 adds no gap CTA to search roster cards');
  } else { passed++; }
  ok(!/coverage-board|gap-digest|gapDigest|hotTopicsGap/i.test(INDEX), 'Phase 1 ships no global coverage board or digest');
}

// ═════════════════════════════════════════════════════════════════════════════
// 13 · Wiring: script tag, panel hook, mobile-first CSS
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/<script defer src="gaps\.js"><\/script>/.test(INDEX), 'gaps.js is not loaded by index.html');
  // Loaded after the module it derives from is available on the page.
  ok(INDEX.indexOf('src="coverage.js"') < INDEX.indexOf('src="gaps.js"'),
    'gaps.js should load after coverage.js');
  // The panel sits under the coverage sentence, not above the score.
  const covAt = WA_SRC.indexOf("'<div class=\"pdxwa-cov\">'");
  const gapAt = WA_SRC.indexOf('gapsHtml(pid, p, r) +');
  ok(covAt !== -1 && gapAt > covAt, 'the gap panel must render under the coverage sentence');
  // Mobile-first: real tap targets, no fixed widths, no horizontal scroll.
  ['.pdxg-toggle', '.pdxg-ask-btn', '.pdxg-method-link', '.pdxg-lead-open'].forEach((sel) => {
    const i = WA_CSS.indexOf(sel + ' ');
    const j = WA_CSS.indexOf('}', i);
    const block = i === -1 ? '' : WA_CSS.slice(i, j);
    ok(/min-height: 2\.75rem/.test(block), `${sel} must carry a ≥44px tap target`);
  });
  // Only the contiguous .pdxg block, not the rest of the file after it.
  const gapStart = WA_CSS.indexOf('.pdxg {');
  const gapCss = WA_CSS.slice(gapStart).split(/\n(?=[.@][a-z@])/)
    .filter((chunk) => /^\.pdxg/.test(chunk)).join('\n');
  ok(gapCss.length > 500, 'the .pdxg style block must be findable in word-action.css');
  ok(!/(?<![a-z-])width:\s*\d+px/.test(gapCss), 'gap styles must not use fixed pixel widths');
  // Broad phone passes belong in app.css (linked after word-action.css, so equal
  // specificity there wins on file order) — the rule test-word-action.mjs enforces.
  ok(!/@media \(max-width/.test(WA_CSS.slice(gapStart, gapStart + gapCss.length + 200)),
    'the gap phone pass must not live in word-action.css');
  const APP_CSS = read('app.css');
  ok(/@media \(max-width: 420px\)[\s\S]{0,300}\.pdxg-ask-btn/.test(APP_CSS),
    'app.css must carry the narrow-phone pass that collapses the gap controls onto their own rows');
  // The service worker precache list, if it enumerates modules, should carry the
  // new one — a missing entry means an offline profile renders without gaps.
  const SW = read('sw.js');
  if (/coverage\.js/.test(SW)) {
    ok(/gaps\.js/.test(SW), 'sw.js precaches coverage.js but not gaps.js');
  } else { passed++; }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ gaps: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error('  • ' + f));
  process.exit(1);
}
console.log(`✓ gaps: ${passed} assertions passed`);
