#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-top.mjs — the top of a person file leads with the formal record,
// and Word vs Action rides underneath it
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WENT WRONG. The profile hero had two states. Above the depth gate it was
// the shape letterhead — the formal record first, Direction Match demoted inside
// it — and below the gate it was an 80px ring and nothing else. Most files are
// below the gate. On a state legislator, or any member whose roll-call ledger has
// not been ingested, the first viewport was therefore a large percentage under the
// words "⚖️ WORD VS ACTION — THE ONE SCORE", and whether the person had a formal
// record at all was not answerable without scrolling past the nav rail, the
// re-election banner and the two-jobs note.
//
// That teaches the wrong hierarchy twice over: an integrity percentage about OUR
// word ledger reads as the profile, and the record reads as optional detail.
//
// WHAT THIS FILE FENCES.
//   1. Order — a record block before any Word vs Action treatment, at every depth.
//   2. Copy — "the one score" is gone from person-file chrome, case-insensitively,
//      and Word vs Action keeps its locked name.
//   3. Thin and empty files — the absence is named, never filled, and no ring
//      stands in for a score that cannot publish.
//   4. Deep files — lee, from the real seeds: record summary above the figure.
//   5. No drift — the brief adds no percentage, no ratio, no tier and no gate.
//   6. Mobile — the first viewport carries the record without scroll luck, and
//      exactly one record block mounts per profile.
//   7. The executive lane — the same brief, listing the same rows in the same
//      order, with a ONE-LINE census above them, no pointer button, one route out,
//      and a shell bump so a warm device actually gets it.
//
//   node scripts/test-record-top.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "coverage.js",
  "profile-spine.js",
  "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

const WA_SRC = R("word-action.js");
const WA_CSS = R("word-action.css");
const APP_CSS = R("app.css");
const PF_SRC = R("profiles-full.js");
const SW_SRC = R("sw.js");
const INDEX_SRC = R("index.html");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const hasI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) >= 0,
    `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const lacksI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) < 0,
    `${msg} — "${needle}" present and must not be`);
const before = (hay, a, b, msg) => {
  const ia = String(hay).indexOf(a), ib = String(hay).indexOf(b);
  ok(ia >= 0 && ib >= 0 && ia < ib,
    `${msg} — "${a}" at ${ia}, "${b}" at ${ib}`);
};
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ record top: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").trim();
// Comment-stripped source, for the copy scans. A retired string is usually recorded
// with a note naming what was retired and why, and a harness that cannot tell the
// tombstone from the body reports the removal as the regression — the same reason
// test-score-consistency.mjs strips comments before its printed-twice contracts.
// HTML comments go too: profiles-full.js documents its markup in <!-- --> inside
// the template, so they are the tombstones here.
const strip = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .split("\n").map((l) => l.replace(/(^|[^:\w"'`])\/\/.*$/, "$1")).join("\n");

// ── The subjects ─────────────────────────────────────────────────────────────
// DEEP  — lee, warmed from the shipped roll-call seeds. A real deep federal file:
//         51 issues of formal record and a publishable Direction Match.
// EMPTY — mschultz, the UT House speaker this pass was reported on. The API has
//         answered for them and the answer is nothing, which is the state the old
//         hero rendered as a large percentage with no record in sight.
// COLD  — mschultz before the answer lands, i.e. the first paint.
const DEEP = "lee";
const EMPTY = "mschultz";

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 0,
  "the roll-call corpus came back empty — the deep-file case has no real data to read");

function warm(win, opts) {
  for (const [pid, items] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, items); } catch (e) {}
  }
  if (opts && opts.resolveEmpty) {
    // What a live browser does when /api/voting-record answers "no rows": the
    // member is cached with an empty ledger, so the read stops warming and the
    // absence becomes a finding instead of a spinner.
    try { win.PDXVotingRecord.noteMember(EMPTY, []); } catch (e) {}
  }
  return win;
}

const A = warm(boot(), { resolveEmpty: true });
const WA = A.PDXWordAction;
must(WA && typeof WA.briefHtml === "function",
  "word-action.js does not publish briefHtml — the below-gate record block is not reachable");
must(typeof WA.heroNamesPatterns === "function",
  "word-action.js does not publish heroNamesPatterns — the profile cannot coordinate its one record block");
must(A.CMP_DATA[DEEP] && A.CMP_DATA[EMPTY], "a subject is not in the bundled roster");

const DEEP_HERO = WA.heroMount(DEEP, A.CMP_DATA[DEEP], {});
const EMPTY_HERO = WA.heroMount(EMPTY, A.CMP_DATA[EMPTY], {});
const COLD = warm(boot(), {});
const COLD_HERO = COLD.PDXWordAction.heroMount(EMPTY, COLD.CMP_DATA[EMPTY], {});

must(WA.shapeApplies(DEEP) === true,
  `${DEEP} no longer clears the depth gate — the deep-file case needs another subject`);
must(WA.shapeApplies(EMPTY) === false,
  `${EMPTY} now clears the depth gate — the empty-file case needs another subject`);
{
  const sh = A.PDXConsistency.formalPatternIndex.shape(EMPTY);
  must(sh && sh.issues === 0,
    `${EMPTY} now has ${sh && sh.issues} issues of formal record — the empty-file case needs another subject`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Order: the record, then Word vs Action — at every depth
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the record leads, the metric follows");
{
  // The hero mounts exactly one of two record blocks and both title themselves
  // with the record. Neither may be preceded by a percentage, a ring, or the
  // metric's heading.
  for (const [label, html] of [["deep", DEEP_HERO], ["empty", EMPTY_HERO], ["cold", COLD_HERO]]) {
    hasI(html, "The formal record",
      `the ${label} hero does not title itself with the formal record`);
    before(html, "The formal record", "Word vs Action",
      `the ${label} hero names Word vs Action before the formal record`);
    // The demoted match block is the ONLY Word vs Action treatment in the hero,
    // and it is below the record by construction.
    eq((html.match(/pdxwa-shape-dm-hd/g) || []).length, 1,
      `the ${label} hero does not carry exactly one Word vs Action heading`);
    lacks(html, 'class="score-ring w-20 h-20 flex-shrink-0"',
      `the ${label} hero still draws the 80px primary ring`);
    lacks(html, 'viewBox="0 0 80 80"',
      `the ${label} hero still draws an 80px ring viewBox`);
  }
  // The record block comes first inside the markup, not merely somewhere in it.
  for (const [label, html] of [["deep", DEEP_HERO], ["empty", EMPTY_HERO]]) {
    const iRec = html.indexOf("pdxwa-shape-hd");
    const iDm = html.indexOf("pdxwa-shape-dm");
    ok(iRec > 0 && iDm > iRec,
      `the ${label} hero puts the demoted match block above the record heading — ${iRec} / ${iDm}`);
  }
  // Both blocks take the full width of the letterhead, so "first" is also
  // "first thing you see" rather than a column beside the name.
  has(DEEP_HERO, "pdxwa-hero is-shape", "the deep hero lost its full-width modifier");
  has(EMPTY_HERO, "pdxwa-hero is-shape", "the below-gate record brief is not laid out full width");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Copy: "the one score" is gone, and the metric keeps its name
// ═════════════════════════════════════════════════════════════════════════════
section("2 · nothing on this page is called the one score");
{
  // The person file's own chrome, in source. Comment-stripped, so the rationale
  // notes that quote the retired string are not counted as uses of it.
  const CHROME = [
    "profiles-full.js", "word-action.js", "consistency.js", "controversies.js",
    "profile-connect.js", "profile-spine.js", "profile-dossier.js",
  ];
  // Every wording that made a percentage sound like the profile's verdict on a
  // person, not just the exact retired string.
  const BANNED = [
    "the one score", "profile's one score", "profile\u2019s one score",
    "the profile's score", "the profile\u2019s score", "the score is", "the score says",
  ];
  for (const f of CHROME) {
    const src = strip(R(f));
    for (const bad of BANNED) {
      lacksI(src, bad, `${f} still calls Word vs Action "${bad}"`);
    }
  }
  // …and in what a reader is actually handed.
  for (const [label, html] of [["deep", DEEP_HERO], ["empty", EMPTY_HERO], ["cold", COLD_HERO]]) {
    lacksI(html, "the one score", `the ${label} hero prints "the one score"`);
    lacksI(html, "the score", `the ${label} hero prints "the score"`);
    lacksI(html, "grade", `the ${label} hero grades somebody`);
    lacksI(html, "rating", `the ${label} hero prints a rating`);
  }
  // The hero eyebrow. It names the ring fallback and nothing else, and what it
  // names it by is the locked label.
  const lbl = /<div class="profile-hero-score-lbl">([^<]*)<\/div>/.exec(PF_SRC);
  must(lbl, "the hero eyebrow is gone from profiles-full.js — the copy fence has nothing to read");
  eq(lbl[1].trim(), "⚖️ Word vs Action",
    "the hero eyebrow is not the metric's locked label and nothing else");
  // It stands down under either letterhead, so it cannot announce Word vs Action
  // above a block whose subject is the record.
  ok(/\.profile-hero-score:has\(\.pdxwa-shape\)\s*\.profile-hero-score-lbl,\s*\.profile-hero-score:has\(\.pdxwa-brief\)\s*\.profile-hero-score-lbl\s*\{[^}]*display:\s*none/.test(APP_CSS),
    "the phone eyebrow does not stand down under the record brief");
  // The rendered markup, not just the source: whatever the hero emits, with its
  // own documentation comments removed, must not carry the retired clause either.
  for (const [label, html] of [["deep", DEEP_HERO], ["empty", EMPTY_HERO]]) {
    lacksI(html.replace(/<!--[\s\S]*?-->/g, " "), "one score",
      `the ${label} hero ships "one score" in its markup`);
  }
  // The locked name survives everywhere it is supposed to.
  const A_FRAME = A.PDXWordAction.FRAME;
  eq(A_FRAME.label, "Word vs Action", "the metric's label changed");
  eq(A_FRAME.metric, "Direction match", "the metric's figure name changed");
  hasI(DEEP_HERO, "Word vs Action", "the deep hero dropped the metric's name entirely");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. A thin or empty file names the absence and invents nothing
// ═════════════════════════════════════════════════════════════════════════════
section("3 · an empty record reads as empty");
{
  const t = txt(EMPTY_HERO);
  hasI(t, "No formal pattern on file yet",
    "an empty formal record does not say so in the product's own refusal");
  // No pattern, no tier, no chip, no list — nothing that could be read as a
  // finding about how this person votes.
  lacks(EMPTY_HERO, "pdxwa-shape-list", "an empty record was given a pattern list");
  lacks(EMPTY_HERO, "pdxst-pat", "an empty record was given a tier chip");
  lacksI(t, "Strongest patterns", "an empty record was given a strongest-patterns heading");
  lacksI(t, "Ran both ways", "an empty record was given a ran-both-ways heading");
  // No figure of any kind, from either lane.
  ok(!/\d+%/.test(t), `an empty record printed a percentage: ${t.slice(0, 160)}`);
  lacks(EMPTY_HERO, "pdxwa-shape-dm-v", "an empty record printed a Direction Match numeral");
  lacks(EMPTY_HERO, "stroke-dasharray", "an empty record drew a ring arc");
  // Word vs Action is present, named, and explicitly unpublished — the existing
  // below-floor posture, not a hollow ring.
  has(EMPTY_HERO, "pdxwa-shape-dm-gap",
    "an empty record's Word vs Action block renders no explanation of why there is no figure");
  // It must not claim a record exists to point at.
  lacksI(t, "The record above is the half we hold",
    "the match block points at a record above it that is not there");
  // Nothing is inferred from what they SAID to fill the record slot.
  hasI(t, "nothing here is inferred from what they said",
    "the empty record block does not say that nothing was inferred from their word");
  // The first paint is a load state, not an absence: two different facts, two
  // different sentences.
  const ct = txt(COLD_HERO);
  hasI(ct, "Still loading the roll-call record",
    "before the record answers, the brief reports an absence instead of a load");
  lacksI(ct, "No formal pattern on file yet",
    "a record still in flight is reported as a record that does not exist");
  ok(!/\d+%/.test(ct), "the first paint printed a percentage");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. A deep file: the summary is above the figure, and it is the same figure
// ═════════════════════════════════════════════════════════════════════════════
section("4 · lee — the deep federal file");
{
  const t = txt(DEEP_HERO);
  hasI(t, "issues on the formal record", "the deep hero dropped its depth line");
  hasI(t, "Strongest patterns", "the deep hero dropped the strongest-patterns group");
  before(DEEP_HERO, "Strongest patterns", "pdxwa-shape-dm",
    "the deep hero puts Direction Match above the strongest patterns");
  // One percentage on the block, and it is heroRead's — not a second reading.
  const h = WA.heroRead(DEEP, A.CMP_DATA[DEEP]);
  must(h && h.pct !== null, `${DEEP} stopped publishing a Direction Match figure`);
  const pcts = t.match(/\d+%/g) || [];
  eq(pcts.length, 1, `the deep hero prints ${pcts.length} percentages: ${pcts.join(", ")}`);
  eq(pcts[0], h.pct + "%", "the deep hero's percentage is not the one heroRead publishes");
  // The denominator travels with it.
  has(DEEP_HERO, h.sub, "the deep hero dropped the tested-count denominator");
  ok(/\d+ of \d+ tested/.test(t), `the deep hero's denominator is not a tested count: ${h.sub}`);
  // And the route out of the summary is the topic tree, not a second catalogue.
  has(DEEP_HERO, "pdxwa-shape-all", "the deep hero lost its route out to the topic tree");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. No drift: the brief reports, it does not measure
// ═════════════════════════════════════════════════════════════════════════════
section("5 · the brief adds no arithmetic");
{
  const BRIEF_AT = WA_SRC.indexOf("function briefHeroHtml");
  must(BRIEF_AT > 0, "briefHeroHtml is gone from word-action.js");
  const BRIEF = strip(WA_SRC.slice(BRIEF_AT, WA_SRC.indexOf("\n  function heroInner", BRIEF_AT)));
  must(BRIEF.length > 400, "briefHeroHtml could not be sliced out of word-action.js");
  // THE BODY BOTH LANES RENDER THROUGH IS UNDER THE SAME RULE. The rows, the two
  // headings, the tail sentence and the route out moved into briefBodyHtml so a
  // member's brief and an executive's are one block; the no-arithmetic contract
  // has to follow them there, or the drift check now covers a shell.
  const BODY_AT = WA_SRC.indexOf("function briefBodyHtml");
  must(BODY_AT > 0, "briefBodyHtml is gone — the two lanes no longer share one brief body");
  const BODY = strip(WA_SRC.slice(BODY_AT, WA_SRC.indexOf("\n  function briefHeadHtml", BODY_AT) > BODY_AT
    ? WA_SRC.indexOf("\n  function briefHeadHtml", BODY_AT)
    : WA_SRC.indexOf("\n  // Does the block at the top", BODY_AT)));
  must(BODY.length > 400, "briefBodyHtml could not be sliced out of word-action.js");
  for (const bad of ["/ 100", "* 100", "Math.round", "toFixed", "MIN_", "FLOOR", "threshold", "%'"]) {
    lacks(BODY, bad, `the shared brief body computes something — "${bad}" is in it`);
  }
  for (const bad of ["Finance", "finance", "Mandate", "mandate", "pledge", "party", "Party"]) {
    lacks(BODY, bad, `the shared brief body reaches into another lane — "${bad}" is in it`);
  }
  // It cannot know which lane it is drawing: no office test, no exec branch.
  for (const bad of ["exec", "Exec", "president", "President"]) {
    lacks(BODY, bad, `the shared brief body is office-aware — "${bad}" is in it`);
  }
  // Each heading is written once in the shared body, and the only other place in
  // the file that may print one is the letterhead above the gate. A copy anywhere
  // else is a second brief, which is what this whole pass removed.
  const HEAD_HOMES = { "Strongest patterns": 3, "Ran both ways": 2 };
  for (const head of Object.keys(HEAD_HOMES)) {
    eq(BODY.split(head).length - 1, 1,
      `the shared brief body does not print "${head}" exactly once`);
    const n = strip(WA_SRC).split(head).length - 1;
    eq(n, HEAD_HOMES[head], `"${head}" is written ${n} times in word-action.js — only the ` +
      "letterhead and the shared brief body may print it");
  }
  // No division, no threshold, no ranking. Counts and slices off shape() only.
  for (const bad of ["/ 100", "* 100", "Math.round", "toFixed", "MIN_", "FLOOR", "threshold", "%'"]) {
    lacks(BRIEF, bad, `the record brief computes something — "${bad}" is in it`);
  }
  lacks(BRIEF, "heroRead(pid", "the record brief reads the score directly instead of delegating the match block");
  has(BRIEF, "FPI.shape(pid)",
    "the record brief does not read the published formal-pattern index — it may be deriving its own");
  // It never touches the other lanes.
  for (const bad of ["Finance", "finance", "Mandate", "mandate", "pledge", "party", "Party"]) {
    lacks(BRIEF, bad, `the record brief reaches into another lane — "${bad}" is in it`);
  }
  // Every count it prints is a field of shape(), and the sums match.
  const shDeep = A.PDXConsistency.formalPatternIndex.shape(DEEP);
  const dt = txt(DEEP_HERO);
  has(dt, `${shDeep.issues} issues on the formal record`,
    "the deep depth line's issue count is not shape()'s");
  has(dt, `${shDeep.judged} votes and formal actions read`,
    "the deep depth line's judged count is not shape()'s");
  has(dt, `${shDeep.characterised} deep enough to characterise`,
    "the deep depth line's characterised count is not shape()'s");
  eq(shDeep.characterised, shDeep.strongN + shDeep.splitN,
    "shape()'s characterised count is not its two buckets — a third bucket appeared");
  // The gate itself did not move.
  eq(WA.SHAPE_MIN, 12, "the shape hero's issue gate moved");
  eq(WA.SHAPE_MIN_READ, 4, "the shape hero's readable gate moved");
  eq(WA.MIN_TESTED_ITEMS, COLD.PDXWordAction.MIN_TESTED_ITEMS,
    "the Direction Match tested floor is not stable across boots");
  // Adding the brief did not change what Direction Match says about anybody.
  const B = warm(boot(), { resolveEmpty: true });
  for (const pid of [DEEP, EMPTY, "thune", "mike_johnson", "jeffries"]) {
    const x = WA.read(pid, A.CMP_DATA[pid]);
    const y = B.PDXWordAction.read(pid, B.CMP_DATA[pid]);
    eq(JSON.stringify(y && { pct: y.pct, publishable: y.publishable, n: (y.tested || []).length }),
       JSON.stringify(x && { pct: x.pct, publishable: x.publishable, n: (x.tested || []).length }),
       `Direction Match for ${pid} is not stable across two boots of the same source`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. One record block per profile, and the phone gets it without scrolling
// ═════════════════════════════════════════════════════════════════════════════
section("6 · one block, and it survives a phone");
{
  // The standout strip stands down when the top already NAMED the patterns, and
  // is free to mount when the top only counted them. That question is asked of
  // word-action.js rather than re-derived in the template.
  has(PF_SRC, "WA.heroNamesPatterns(id)",
    "profiles-full.js no longer asks whether the top of the file already named the patterns");
  const gateAt = PF_SRC.indexOf("WA.heroNamesPatterns(id)");
  const soAt = PF_SRC.indexOf("SO.html(id)");
  ok(gateAt > 0 && soAt > gateAt,
    "the standout strip is built before the gate that is supposed to suppress it");
  eq(WA.heroNamesPatterns(DEEP), true, "the deep file's top does not report naming its patterns");
  eq(WA.heroNamesPatterns(EMPTY), false, "an empty record's top claims to name patterns");
  // The accessor and the markup cannot disagree.
  // trump is in this loop on purpose: the executive brief lists rows now, so the
  // accessor has to answer for the exec lane by reading the exec lane, and the
  // agreement it fences is what keeps #pdxsec-standout from being emitted twice or
  // aimed at from a rail entry that lands nowhere.
  for (const pid of [DEEP, EMPTY, "thune", "mike_johnson", "wes_moore", "trump"]) {
    const html = WA.heroMount(pid, A.CMP_DATA[pid], {});
    const named = html.indexOf("pdxwa-shape-list") !== -1;
    eq(WA.heroNamesPatterns(pid), named,
      `heroNamesPatterns disagrees with what the hero rendered for ${pid}`);
  }
  // PHONE. .profile-hero's 480px grid drops the score slot to a full-width row
  // directly under the name, and the brief has to take that row the way the
  // letterhead does — otherwise the record is squeezed into a 5rem ring column.
  const phone = APP_CSS.slice(APP_CSS.indexOf("@media (max-width: 480px)",
    APP_CSS.indexOf(".profile-hero-score-lbl { display: none; }")));
  must(phone.length > 800, "the profile hero's phone block could not be located in app.css");
  ok(/\.profile-hero-score:has\(\.pdxwa-shape\),\s*\.profile-hero-score:has\(\.pdxwa-brief\)\s*\{/.test(phone),
    "the record brief does not get the shape hero's single-column phone card");
  ok(/grid-template-areas:\s*"photo id"\s*"score score"/.test(phone),
    "the phone hero no longer drops the record row full width under the name");
  // …and the wrapper is a block rather than display:contents, so the brief's
  // own rows are not dealt into the card's two-column grid.
  ok(/\.profile-hero-score \.pdxwa-hero\.is-shape \{\s*display: block;/.test(WA_CSS),
    "the letterhead wrapper is not a block on a phone — its rows will be dealt into the ring grid");
  has(WA_SRC, "function isLetterhead",
    "word-action.js no longer has one answer to which heroes are letterheads");
  ok(/\.pdxwa-shape,\s*(?:\/\*[\s\S]*?\*\/\s*)?\.pdxwa-brief \{/.test(WA_CSS),
    "the record brief does not share the shape letterhead's width rule");
  // Desktop: both letterheads wrap the hero and take the full row.
  ok(/\.profile-hero:has\(\.pdxwa-shape\),\s*\.profile-hero:has\(\.pdxwa-brief\) \{ flex-wrap: wrap; \}/.test(APP_CSS),
    "the desktop hero does not wrap for the record brief");
  ok(/\.profile-hero-score:has\(\.pdxwa-shape\),\s*\.profile-hero-score:has\(\.pdxwa-brief\) \{ flex: 1 0 100%/.test(APP_CSS),
    "the desktop record brief does not take the full hero row");
  // IDENTITY STILL COMES FIRST. The hero template puts the name, office and tenure
  // chips above the slot the record letterhead mounts into, and the compact Word vs
  // Action badge rides in those chips rather than being promoted out of them.
  const heroAt = PF_SRC.indexOf('class="profile-hero"');
  must(heroAt > 0, "the profile hero is gone from profiles-full.js");
  const HERO_TPL = PF_SRC.slice(heroAt, PF_SRC.indexOf("profile-hero-score-lbl", heroAt));
  before(HERO_TPL, "profile-hero-id", "profile-hero-score",
    "the hero template mounts the record slot above the identity block");
  before(HERO_TPL, "profile-name", "profile-meta",
    "the hero template mounts the meta chips above the name");
  has(HERO_TPL, "compactBadgeMount",
    "the compact Word vs Action badge left the identity chips");
  eq((PF_SRC.match(/compactBadgeMount\(/g) || []).length, 1,
    "the compact Word vs Action badge mounts more than once on the person file");

  // THE EXEC LANE, ON THE SAME BRIEF AS EVERYBODY ELSE. An executive has no
  // roll-call ledger, and for a while that meant the top of their file could only
  // count: the volume clause, the per-class inventory, and a button reading "See
  // what this record holds ↓" that jumped down to the standouts strip. Every
  // number was true and no pattern was named, so the most-visited profile in the
  // roster opened on a census while the file next door opened on four issues, a
  // side and a tally each. Same formal lane, same reader, different treatment.
  //
  // WHAT THIS FENCES NOW.
  //   · The rows are there, in the shared brief body, in the same two groups.
  //   · The acts behind them are the exec seed's own — nothing about a floor vote
  //     is printed, and the word "vote" does not appear on the block at all.
  //   · The census survives: the volume clause and the inventory still print,
  //     above the rows, as their denominator.
  //   · The route out is the topic tree, like every other brief, and the strip it
  //     used to point at stands down because the brief did its job.
  const xs = A.PDXConsistency.execRecordSummary;
  if (xs && typeof xs.pick === "function" && xs.pick("trump").on) {
    const xp = xs.pick("trump");
    const xh = WA.heroMount("trump", A.CMP_DATA.trump, {});
    const xt = txt(xh);
    has(xh, "pdxwa-brief-exec", "the exec lane's top-of-file record block is gone");
    hasI(xt, "The formal record", "the exec hero does not lead with the formal record");
    before(xh, "pdxwa-shape-hd", "pdxwa-shape-dm",
      "the exec hero puts Word vs Action above its record block");
    lacks(xh, 'class="score-ring w-20 h-20 flex-shrink-0"',
      "the exec hero still leads with the 80px primary ring");
    // ── the census, unchanged, and still only the census ──────────────────
    has(xt, xp.volume, "the exec brief's denominator sentence is not the lane's own volume clause");
    for (const line of xp.inventory) {
      has(xt, line, `the exec brief dropped the lane's inventory line "${line}"`);
    }
    has(xh, "pdxwa-shape-inv", "the exec brief lost the per-class inventory line");
    // ── AND THE CENSUS IS ONE LINE ────────────────────────────────────────
    // It printed as two stacked paragraphs — the volume clause, then the
    // inventory under it — which on a phone spent about a third of the first
    // screen on how much is on file before the first pattern row appeared. The
    // rows are what the letterhead is for, so the inventory rides inline at the
    // end of the clause it breaks down: one block-level census element, both
    // classes, same order, nothing dropped and nothing abbreviated.
    eq((xh.match(/<p class="pdxwa-shape-depth"/g) || []).length, 1,
      "the exec census is not exactly one block-level line");
    lacks(xh, '<p class="pdxwa-shape-inv"',
      "the exec inventory is a paragraph of its own again, under the volume clause");
    ok(/<p class="pdxwa-shape-depth">[^<]*<span class="pdxwa-shape-inv">[^<]*<\/span><\/p>/.test(xh),
      "the exec inventory is not an inline run inside the census line");
    ok(!/\.pdxwa-shape-inv \{[^}]*(?:margin|display)\s*:/.test(WA_CSS),
      "the inventory run carries block spacing again in word-action.css");
    // NOTHING BETWEEN THE CENSUS AND THE ROWS. The first viewport has to carry
    // the name, the census and at least two pattern rows, and the only way to
    // keep that true as the block grows is to fence what may sit above the list:
    // the heading, the census, and then the group.
    const briefSkel = (String(xh).match(/class="pdxwa-[a-z-]+/g) || [])
      .map((c) => c.slice(7));
    const briefAt = briefSkel.findIndex((c) => c.indexOf("pdxwa-brief") === 0);
    eq(briefSkel.slice(briefAt + 1, briefAt + 5).join(">"),
      "pdxwa-shape-hd>pdxwa-shape-depth>pdxwa-shape-inv>pdxwa-shape-grp",
      "something new sits between the exec letterhead's heading and its first pattern group");
    // ── THE POINTER COPY IS GONE, IN EVERY STATE ──────────────────────────
    // "See what this record holds ↓" was the exec fallback's own button, in its
    // own words, aimed a rung down at the standouts strip — the top of the file
    // advertising a block further down instead of holding a record. There is one
    // route out now, built once, counted from the lane's own index and aimed at
    // the topic tree, so the state where the engine publishes no shape cannot
    // reintroduce the old copy.
    lacks(strip(WA_SRC), "See what this record holds",
      "the exec letterhead can still print the old pointer button");
    // Both states of the brief — the one with rows and the one without — call the
    // shared route-out builder rather than writing a button of their own. The
    // pre-brief shape letterhead upstream keeps its own copy of that markup; this
    // is about the two branches that used to disagree with each other.
    const fnBody = (src, name) => {
      const at = src.indexOf(`function ${name}(`);
      if (at < 0) return "";
      const next = src.indexOf("\n  function ", at + 1);
      return src.slice(at, next < 0 ? src.length : next);
    };
    for (const fn of ["briefBodyHtml", "execBriefHtml"]) {
      const body = strip(fnBody(WA_SRC, fn));
      must(body.length > 0, `word-action.js publishes no ${fn}() to check`);
      has(body, "exploreAllHtml(", `${fn}() does not route out through the shared builder`);
      lacks(body, 'class="pdxwa-shape-all"',
        `${fn}() writes its own route-out button instead of calling the shared one`);
      lacks(body, "Explore all ", `${fn}() writes its own route-out copy`);
    }
    eq((strip(fnBody(WA_SRC, "exploreAllHtml")).match(/class="pdxwa-shape-all"/g) || []).length, 1,
      "the shared route-out builder does not emit exactly one button");
    lacks(strip(WA_SRC), "EXEC_JUMP",
      "the exec brief still keeps its own jump target for a pointer it no longer prints");
    // ── AND IT HAS TO REACH A WARM DEVICE ─────────────────────────────────
    // The letterhead is assembled from four files that ship independently —
    // consistency.js publishes the shape, word-action.js draws the brief,
    // profiles-full.js stands the mid-page strip down, word-action.css sizes the
    // census — and the service worker serves the shell stale-while-revalidate.
    // The first pass at this landed all four without renaming the caches, so warm
    // devices kept serving the pre-brief bundle and the change read as unshipped.
    // v89 is the floor, not the pin: a later pass with its own shell change bumps
    // past it without editing this line.
    const swVer = (/const CACHE_VERSION = '(v\d+)';/.exec(SW_SRC) || [])[1];
    ok(/^v\d+$/.test(String(swVer)) && Number(String(swVer).slice(1)) >= 89,
      `CACHE_VERSION is ${swVer} — the exec letterhead needs a bump to v89 or later to reach ` +
      "a device that already has the shell cached");
    has(SW_SRC, "// v89 -", "the cache bump that ships the exec letterhead was not explained");
    // ── the rows, which are the point ─────────────────────────────────────
    must(typeof xs.shape === "function",
      "execRecordSummary publishes no shape() — the exec brief has nothing to list");
    const xsh = xs.shape("trump");
    must(xsh && xsh.issues > 0, "the exec shape came back empty for trump");
    has(xh, "pdxwa-shape-list", "the exec brief does not list any pattern rows");
    eq(WA.heroNamesPatterns("trump"), true,
      "the exec brief lists patterns but does not report naming them");
    // Strongest one-sided first, then ran both ways — the member order, in the
    // member headings, from the member builder.
    if (xsh.tops.length) has(xt, "Strongest patterns", "the exec brief lost the one-sided group");
    if (xsh.splits.length) {
      has(xt, "Ran both ways", "the exec brief lost the split group");
      before(xh, ">Strongest patterns<", ">Ran both ways<",
        "the exec brief puts the splits above the strongest patterns");
    }
    eq((xh.match(/<li class="pdxwa-shape-row"/g) || []).length,
      xsh.tops.length + xsh.splits.length,
      "the exec brief lists a different number of rows than the shape published");
    for (const row of xsh.tops.concat(xsh.splits)) {
      has(xt, row.label, `the exec brief lists a row without its issue name: ${row.key}`);
      has(xt, row.patLabel, `the exec row for ${row.key} lists no side`);
      // Chip shape and the tap target are the ones every other record row uses.
      has(xh, `data-pdxst-dos="${row.key}"`,
        `the exec row for ${row.key} does not open that issue's dossier`);
      has(xh, 'data-pdxst-focus="record"',
        "the exec rows do not open the dossier on the record");
      has(row.chip, "data-pdxst-pat=",
        `the exec row for ${row.key} carries something other than the shared pattern chip`);
      // The tally is the engine's, and its verbs are advanced / against.
      const tally = row.counts || row.sideCounts || "";
      must(tally.length > 0, `the exec row for ${row.key} publishes no tally`);
      has(xt, tally, `the exec row for ${row.key} does not print the engine's tally`);
      ok(/advanced|against/.test(tally),
        `the exec row for ${row.key} tallies in some other vocabulary: "${tally}"`);
      // A characterised row has a side. One with acts and no side keeps its row and
      // prints the refusal rather than being dropped — see the tail below.
      ok(row.tier !== "unread", `a listed exec row is unread: ${row.key}`);
    }
    // NOTHING ON THIS BLOCK CALLS AN ACT A VOTE. The chips, the tallies, the tail
    // sentence and the tier wall all go through the lane's own countable.
    lacksI(xt, "vote", "the exec brief calls a formal action a vote");
    lacksI(xt, "roll call", "the exec brief describes the executive record as roll calls");
    // ── the honesty valve ─────────────────────────────────────────────────
    // Every issue the engine declined to characterise is counted out loud, and the
    // rows behind it are still reachable — they are in the topic tree this block
    // routes to, each with its own refusal, not hidden.
    if (xsh.tops.length || xsh.splits.length) {
      const tail = (typeof xsh.tailN === "number") ? xsh.tailN : xsh.thinN;
      if (tail) has(xt, `${tail} more issue`, "the exec brief hides its uncharacterised tail");
    }
    eq(xsh.issues, xsh.characterised + xsh.tailN,
      "the exec shape's issue count is not its characterised rows plus its tail — a row went missing");
    eq(xsh.characterised, xsh.strongN + xsh.splitN,
      "the exec shape's characterised count is not its two buckets");
    // ── the route out, and the one record block ───────────────────────────
    has(xt, `Explore all ${xsh.issues} issue`,
      "the exec brief's route out does not count the issues its own shape published");
    has(xh, "pdxsec-stancetree", "the exec brief does not route out to the topic tree");
    has(R("stance-tree.js"), 'id="pdxsec-stancetree"',
      "nothing emits the anchor the exec brief's route-out aims at");
    lacks(xh, "pdxsec-standout",
      "the exec brief still jumps into the standouts strip it has replaced");
    lacks(xh, "pdxso-chip", "the exec brief copied the standout chips up into the header");
    // The strip below asks the same question the brief answered, so exactly one
    // record block mounts — and the rail's pill asks it too, or it points at an
    // anchor nobody emitted.
    const xNamedAt = PF_SRC.indexOf("WA.heroNamesPatterns(id)");
    const xHtmlAt = PF_SRC.indexOf("XS.html(id)");
    ok(xNamedAt > 0 && xHtmlAt > xNamedAt,
      "the exec standouts strip is built before the gate that is supposed to suppress it");
    if (typeof A._pdxNavChips === "function") {
      const chips = A._pdxNavChips("trump", A.CMP_DATA.trump);
      eq(chips.standout, undefined,
        "the rail still carries a 🏛 pill aimed at #pdxsec-standout, which the exec file no longer emits");
      // The 🌳 pill is the rail's entry for the destination this brief now routes
      // to, and it is the tree's own count — so it can only be asked for where the
      // tree module is on the page. It is not in this harness's file list, so the
      // question is asked of it only when it is loaded, and the anchor itself is
      // checked against the module that emits it.
      if (A.PDXStanceTree && typeof A.PDXStanceTree.count === "function") {
        ok(!!chips.topics,
          "the rail carries no 🌳 pill for the topic tree the exec brief now routes into");
      }
    }
    // ── no new score ──────────────────────────────────────────────────────
    // The lane's own percentage-free posture: one figure on the block, from heroRead.
    const xhr = WA.heroRead("trump", A.CMP_DATA.trump);
    const xp2 = xt.match(/\d+%/g) || [];
    ok(xp2.length <= 1, `the exec brief prints ${xp2.length} percentages: ${xp2.join(", ")}`);
    if (xp2.length) eq(xp2[0], xhr.pct + "%", "the exec brief's percentage is not heroRead's");
    lacksI(xt, "Republican", "the exec brief names a party");
    lacksI(xt, "Democrat", "the exec brief names a party");
    // ── /p/lee is structurally the same block ─────────────────────────────
    // One builder, so the skeleton is identical bar the exec census line the
    // requirement keeps: the same wrapper, the same heading, the same groups, the
    // same rows, the same tail, the same route out, the same demoted ring, the same
    // wall, in the same order.
    const skel = (h) => (String(h).match(/class="pdxwa-[a-z-]+/g) || [])
      .map((c) => c.slice(7)).join(">");
    const twin = Object.keys(A.CMP_DATA).find((pid) => {
      if (pid === "trump") return false;
      let h = "";
      try { h = WA.briefHtml(pid, A.CMP_DATA[pid]) || ""; } catch (e) { return false; }
      return h.indexOf("pdxwa-shape-list") >= 0 &&
        h.indexOf("pdxwa-shape-grp-h\">Ran both ways") >= 0 &&
        (h.match(/<li class="pdxwa-shape-row"/g) || []).length ===
          (xh.match(/<li class="pdxwa-shape-row"/g) || []).length;
    });
    must(!!twin, "no member brief lists the same number of rows as trump's — the structural " +
      "comparison has no subject");
    eq(skel(xh).replace(">pdxwa-shape-inv", ""), skel(WA.briefHtml(twin, A.CMP_DATA[twin])),
      `the exec brief and ${twin}'s brief are not the same block`);
  }
  // An unresolvable pid has no absence to report.
  eq(WA.briefHtml("no_such_person_at_all", null), "",
    "the brief reports an empty formal record about somebody who is not in the roster");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. The exec letterhead survives the load order the site actually ships in
// ═════════════════════════════════════════════════════════════════════════════
section("7 · the exec letterhead survives the shipped load order");
{
  // WHAT WENT WRONG ON PRODUCTION, and why every assertion above missed it.
  // index.html loads consistency.js (~line 21849) BEFORE exec-action-data.js and
  // exec-record.js (~21937). So on every real page load there is a window in
  // which a president's row model can be derived from an exec action pool that is
  // not on the page yet — and that row model is memoised per politician. One read
  // inside the window — a roster card, a nav pill, a prefetch — pinned an
  // exec-blind answer for the life of the page. The letterhead's shape then
  // published `issues: 0`, printed its census-and-a-door fallback ("Explore all 37
  // issues by topic" over a single census line and no rows), reported
  // heroNamesPatterns() false, and the standouts strip mid-page mounted with the
  // very rows the letterhead had just failed to find. The hero has no repaint
  // event on an executive file — there is no roll-call fetch to land — so that
  // first paint was the final one and a hard refresh could not clear it.
  //
  // The harness above cannot see any of this, and that is the point of this
  // section: it loads the exec modules FIRST and never reads a row early, which
  // is the one order production never uses.
  // EXEC — trump, the file this section was reported on. The exec seed is bundled,
  // so unlike the roll-call subjects above this one needs no warm at all: whatever
  // the letterhead fails to say about them, it fails to say from data already on
  // the page.
  const EXEC = "trump";
  // THE SPLIT IS index.html's OWN, not a worst case invented for the test:
  // stance-helpers, voting-record, say-vs-do, consistency and profile-spine all
  // ship above the exec trio, and coverage and word-action ship below it.
  const COLD_PRE = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "voting-record.js", "say-vs-do.js",
    "consistency.js", "profile-spine.js",
  ];
  const COLD_POST = [
    "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
    "coverage.js", "word-action.js", "profiles-full.js",
  ];
  must(COLD_PRE.concat(COLD_POST).slice().sort().join("|") === FILES.slice().sort().join("|"),
    "the cold boot does not load the same module set as the warm one — the comparison is not like for like");
  for (const [above, below] of [["consistency.js", "exec-action-data.js"],
                                ["consistency.js", "exec-record.js"]]) {
    const ia = INDEX_SRC.indexOf(`src="/${above}"`), ib = INDEX_SRC.indexOf(`src="/${below}"`);
    ok(ia >= 0 && ib >= 0 && ia < ib,
      `index.html no longer loads ${above} before ${below} — this section's premise needs re-checking`);
  }
  const cold = (function () {
    const win = makeSandbox();
    const sandbox = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    for (const f of COLD_PRE) vm.runInContext(R(f), sandbox, { filename: f });
    win.PROFILES = win.CMP_DATA;
    // The roll-call records land first, as they do on a real arrival — and they
    // bump the derivation epoch, which clears every derived cache. That happens
    // BEFORE the poisoning read on purpose: an executive file has no roll-call
    // fetch of its own to land, so nothing bumps the epoch again between the read
    // below and the render, which is precisely why the bad answer used to stick.
    for (const [pid, items] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, items); } catch (e) {}
    }
    // THE POISONING READ, which is any surface at all asking for a president's
    // rows during the window described above.
    try { win.PDXConsistency.issueRows(EXEC); } catch (e) {}
    for (const f of COLD_POST) vm.runInContext(R(f), sandbox, { filename: f });
    win.PROFILES = win.CMP_DATA;
    return win;
  })();
  const cWA = cold.PDXWordAction;
  const cXS = cold.PDXConsistency.execRecordSummary;
  must(cWA && cXS && typeof cXS.shape === "function",
    "the cold boot did not come up — the load-order case has nothing to check");
  // The strip's own source is unaffected by the window, which is exactly why the
  // two surfaces could disagree: it reads PDXExecRecord directly.
  const cPick = cXS.pick(EXEC);
  must(cPick.on, `the exec lane is not on for ${EXEC} in the cold boot`);
  // ── THE SHAPE, WHICH IS WHAT WAS EMPTY ──────────────────────────────────
  const cSh = cXS.shape(EXEC);
  must(cSh, "the exec shape came back null on the shipped load order");
  eq(cSh.issues, cPick.issues,
    "the cold exec shape does not hold every issue the lane's own summary holds");
  ok(cSh.tops.length + cSh.splits.length >= 2,
    `the cold exec shape characterises ${cSh.tops.length + cSh.splits.length} rows — the first ` +
    "viewport needs at least two");
  // ── AND THE LETTERHEAD, WHICH IS WHERE THE READER MEETS IT ──────────────
  const cH = cWA.heroMount(EXEC, cold.CMP_DATA[EXEC], {});
  const cT = txt(cH);
  has(cH, "pdxwa-brief-exec", "the cold exec hero is not the exec brief");
  has(cH, "pdxwa-shape-list", "the cold exec letterhead lists no pattern rows");
  ok((cH.match(/<li class="pdxwa-shape-row"/g) || []).length >= 2,
    "the cold exec letterhead's first viewport carries fewer than two issue rows");
  has(cT, "Strongest patterns", "the cold exec letterhead lost the one-sided group");
  // Every row it lists is an issue the lane itself holds — the letterhead selects
  // from the strip's list, it does not assemble a list of its own.
  const cKeys = {};
  const cLaneRows = (function () {
    try { return cold.PDXExecRecord.summary(EXEC, { allTerms: true }).rows || []; }
    catch (e) { return []; }
  })();
  must(cLaneRows.length > 0,
    "PDXExecRecord.summary() published no rows — the strip's own row list is empty");
  cLaneRows.forEach(function (r) { if (r && r.issueKey) cKeys[r.issueKey] = 1; });
  eq(cSh.issues, cLaneRows.length,
    "the cold exec shape and the strip's row list do not hold the same number of issues");
  for (const row of cSh.tops.concat(cSh.splits)) {
    ok(!!cKeys[row.key],
      `the cold letterhead lists ${row.key}, which the exec lane's own row list does not hold`);
  }
  // THE ACCEPTANCE, IN THE STRIP'S OWN WORDS: the issues the mid-page strip was
  // showing (the Border / Energy class) are named in the first screen now.
  for (const r of cPick.oneway) {
    has(cT, r.label,
      `the mid-page strip lists "${r.label}" but the cold letterhead does not`);
  }
  // ── ONE RECORD BLOCK, AND THE GATE THAT DECIDES IT ──────────────────────
  eq(cWA.heroNamesPatterns(EXEC), true,
    "the cold letterhead lists the patterns but still reports naming none — the mid-page strip " +
    "would mount a second copy of them");
  // ── AND NO SECOND SCORE TREATMENT IN THE FIRST SCREEN ───────────────────
  // Word vs Action rides under the rows as the demoted 52px block. The 80px
  // primary ring is what the letterhead replaced; it may not come back above it.
  lacks(cH, 'viewBox="0 0 80 80"',
    "the cold exec letterhead draws the 80px primary ring in the first screen");
  lacks(cH, 'class="score-ring w-20 h-20 flex-shrink-0"',
    "the cold exec letterhead leads with the 80px primary ring");
  eq((cH.match(/pdxwa-shape-dm-hd/g) || []).length, 1,
    "the cold exec letterhead does not carry exactly one Word vs Action heading");
  // ── /p/lee IS UNTOUCHED BY ANY OF IT ────────────────────────────────────
  const clean = (h) => String(h).replace(/data-pdxwa-hero="[^"]*"/g, "")
    .replace(/pdxwa-shrow-[^" ]*/g, "");
  eq(clean(cWA.heroMount(DEEP, cold.CMP_DATA[DEEP], {})), clean(DEEP_HERO),
    "the deep member letterhead is not byte-identical across the two load orders");
  eq(cWA.heroNamesPatterns(DEEP), true,
    "the deep member file stopped reporting that it names its patterns");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ record top: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ record top: all ${passed} assertions passed — the record leads the file, ` +
  `Word vs Action rides below it, and an empty record says so`);
