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
  for (const pid of [DEEP, EMPTY, "thune", "mike_johnson", "wes_moore"]) {
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

  // THE EXEC LANE. An executive has no roll-call ledger, so the roll-call brief must
  // not describe one — but they were the last file in the roster still leading with a
  // ring, so the top of the file gets the exec lane's own counted lines and a jump
  // into the standouts section, which stays exactly where it is.
  const xs = A.PDXConsistency.execRecordSummary;
  if (xs && typeof xs.pick === "function" && xs.pick("trump").on) {
    const xp = xs.pick("trump");
    const xh = WA.heroMount("trump", A.CMP_DATA.trump, {});
    const xt = txt(xh);
    has(xh, "pdxwa-brief-exec", "the exec lane's top-of-file record line is gone");
    hasI(xt, "The formal record", "the exec hero does not lead with the formal record");
    before(xh, "pdxwa-shape-hd", "pdxwa-shape-dm",
      "the exec hero puts Word vs Action above its record line");
    lacks(xh, 'class="score-ring w-20 h-20 flex-shrink-0"',
      "the exec hero still leads with the 80px primary ring");
    // Every string in it belongs to the exec lane already — nothing recounted here.
    has(xt, xp.volume, "the exec hero's denominator sentence is not the lane's own volume clause");
    for (const line of xp.inventory) {
      has(xt, line, `the exec hero dropped the lane's inventory line "${line}"`);
    }
    // No pattern, no tier, no second finding: the standouts stay in their section.
    lacks(xh, "pdxwa-shape-list", "the exec hero grew a pattern list");
    lacks(xh, "pdxso-chip", "the exec hero copied the standout chips up into the header");
    eq(WA.heroNamesPatterns("trump"), false,
      "the exec hero claims to name patterns, which would suppress the standouts section below it");
    has(A.PDXConsistency.execRecordSummary.html("trump"), 'id="pdxsec-standout"',
      "the exec standouts section no longer mounts the anchor the header jumps to");
    has(xh, "pdxsec-standout", "the exec hero's route-out does not jump into the standouts section");
    // The lane's own percentage-free posture: one figure on the block, from heroRead.
    const xhr = WA.heroRead("trump", A.CMP_DATA.trump);
    const xp2 = xt.match(/\d+%/g) || [];
    ok(xp2.length <= 1, `the exec hero prints ${xp2.length} percentages: ${xp2.join(", ")}`);
    if (xp2.length) eq(xp2[0], xhr.pct + "%", "the exec hero's percentage is not heroRead's");
  }
  // An unresolvable pid has no absence to report.
  eq(WA.briefHtml("no_such_person_at_all", null), "",
    "the brief reports an empty formal record about somebody who is not in the roster");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ record top: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ record top: all ${passed} assertions passed — the record leads the file, ` +
  `Word vs Action rides below it, and an empty record says so`);
