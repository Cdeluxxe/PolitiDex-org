#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-only-buckets.mjs — the aggregate surfaces count the formal record
// even when nobody has been quoted
// ─────────────────────────────────────────────────────────────────────────────
// Phases 0–3 taught the profile face to lead with the formal record: the browse
// row carries a 🏛 inventory chip, the profile carries a formal atlas, and on a
// deep-record incumbent the hero itself prints "18 issues on the formal record".
// outcomeBuckets() had not been told. It dropped every row with no stated
// position on the floor —
//
//     if (!r.stance.label && r.verdict.token === 'limited') return;
//
// — which is defensible as a rule about VERDICTS and indefensible as a rule
// about INVENTORY, because four surfaces are built on it. On a member with a
// wide roll-call record and nothing quotable, the composition strip, the
// letterhead tally, the shape notes and the issue index all rendered empty
// underneath a hero that had just counted eighteen issues. Our silence, printed
// as their absence, three times on one page.
//
// Phase 4 admits those rows under a fifth bucket that carries no verdict. This
// file is the fence around that, and it fences both directions:
//
//   1. THE VOCABULARY. Five published buckets. The new one is secondary, is not
//      a word-test token, and borrows none of the word-test language.
//   2. THE RECORD-ONLY MEMBER. Deep formal, zero stances: buckets, tally,
//      header tally and strip are all non-empty and all agree with recordDepth,
//      the atlas count and the shape hero about how many issues there are.
//   3. THE WORD-TESTED MEMBER. Every row with a stated position lands in exactly
//      the bucket its verdict names, as it always did.
//   4. NO SECOND PERCENTAGE, NO DRIFT. Direction Match is byte-identical with
//      the record-only rows admitted and withheld, and nothing the new bucket
//      renders carries a figure.
//   5. THE EPOCH. Browse chip, shape hero and buckets never disagree about
//      inventory size for one pid, and the memo lets go when the epoch moves.
//   6. STILL COVERAGE, NOT A RESULT. The All-Seeing Eye does not promote the
//      pile into a result chip.
//   7. THE MUTATION. Restoring the drop fails named assertions here.
//
//   node scripts/test-record-only-buckets.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

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

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ record-only buckets: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── The fixtures ─────────────────────────────────────────────────────────────
// QUIET — a real member with NO documented stance at all. Seeded wide, they are
//         the whole case: every issue on file is formal, none of it testable.
// WORD  — a member the bundled data already gives a word ledger and a published
//         Direction Match. Their buckets must not move by one row.
const QUIET = "doug_mastriano";
const WORD = "bennie_thompson";

const probe = boot();
must(probe.PDXWordAction && probe.PDXConsistency, "the engine did not boot");
must((probe._resolveStanceList(QUIET, probe.CMP_DATA[QUIET]) || []).length === 0,
  `${QUIET} now has documented stances — the no-word-ledger case needs another subject`);
must((probe._resolveStanceList(WORD, probe.CMP_DATA[WORD]) || []).length > 0,
  `${WORD} no longer has a word ledger — the word-tested case needs another subject`);

const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const POLED = ISSUE_KEYS.filter((k) => !NO_POLE[k]);
must(POLED.length >= 18, "the roster no longer offers enough polable issue keys to seed a wide record");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
function seed(keys, depth) {
  const out = [];
  let n = 0;
  keys.forEach((k, i) => {
    for (let j = 0; j < depth; j++) out.push(vote(n++, k, (i % 5 === 0 && j % 2) ? "nay" : "yea"));
  });
  return out;
}
const WIDE = POLED.slice(0, 18);

const A = boot();
A.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
A.PDXVotingRecord.noteMember(WORD, seed(WIDE, 12));
const WA = A.PDXWordAction;
const FPI = A.PDXConsistency.formalPatternIndex;

// The bucketing is not exported — it is read back through the surfaces, which is
// the point of the pass. This reads the counts off the letterhead tally, which
// is one builder over the same memoised object the strip and the index use.
const countsOf = (html) => {
  const out = {};
  const re = /data-pdxwa-seg="([a-z]+)"[\s\S]{0,900}?pdxwa-tally-n">(\d+)</g;
  let m;
  while ((m = re.exec(html))) if (!(m[1] in out)) out[m[1]] = Number(m[2]);
  return out;
};
const panelOf = (html, tok) => {
  const i = String(html).indexOf('data-pdxwa-oc-panel="' + tok + '"');
  if (i === -1) return "";
  const e = String(html).indexOf("</section>", i);
  return String(html).slice(i, e === -1 ? html.length : e);
};

const Q_TALLY = WA.headerTallyHtml(QUIET);
const Q_SEC = WA.sectionHtml(QUIET, A.CMP_DATA[QUIET]) || "";
const Q_COUNTS = countsOf(Q_TALLY);
const Q_DEPTH = WA.recordDepth(QUIET);
const Q_SHAPE = FPI.shape(QUIET);
must(Q_DEPTH && Q_DEPTH.issues >= 12,
  `the seeded fixture only reached ${Q_DEPTH && Q_DEPTH.issues} issues of formal record`);

// ═════════════════════════════════════════════════════════════════════════════
// 1. Five buckets, and the fifth one makes no claim about the person
// ═════════════════════════════════════════════════════════════════════════════
section("the vocabulary");
{
  eq(WA.OUTCOMES.length, 5,
    "vocabulary: the index does not publish five buckets — three results and two coverage piles");
  const o = WA.outcomeFor("record");
  ok(!!o, "vocabulary: there is no 'record' bucket, so a wordless row has nowhere to land that is not a verdict");
  ok(o && o.secondary === true,
    "vocabulary: the record-only bucket is not secondary — every downstream rule that keeps coverage\n" +
    "    out of the result slots is keyed on that flag, and without it a pile of untested roll calls\n" +
    "    can be published on the browse surface as this member's strongest result");
  ok(o && /^#[0-9a-f]{6}$/i.test(o.col),
    "vocabulary: the record-only bucket has no colour, so the strip, the tally and the index cannot agree");
  ok(o && o.col !== WA.outcomeFor("limited").col,
    "vocabulary: the two coverage piles share a colour — they are opposite halves of the missing file and\n" +
    "    a reader cannot tell which half from a chip");
  // The whole reason it is not folded into an existing token.
  for (const w of ["contradict", "backed", "mixed", "verdict", "result"]) {
    ok(!new RegExp("\\b" + w, "i").test(o.sub + " " + o.label + " " + o.short) ||
       /never|not a|no documented/i.test(o.sub),
      `vocabulary: the record-only bucket's copy asserts "${w}" over rows that were never compared\n` +
      "    against anything the member said");
  }
  ok(/formal record/i.test(o.label) || /formal record/i.test(o.sub),
    "vocabulary: the record-only bucket does not name the formal record, so its rows read as a\n" +
    "    documentation shrug rather than as inventory");
  // Ordered last, so a reader scanning left to right hits results first.
  eq(WA.OUTCOMES[WA.OUTCOMES.length - 1].token, "record",
    "vocabulary: the record-only pile is not ordered last, so it competes with the results");
  ok(/var COMP_ORDER = \[[^\]]*'record'\s*\]/.test(WA_SRC),
    "vocabulary: COMP_ORDER does not end with the record bucket — the strip and the tally iterate that\n" +
    "    array, so a bucket missing from it has a panel and no door");
  ok(!/OUTCOME_OPEN = \{[^}]*record/.test(WA_SRC),
    "vocabulary: the index can open on the record-only pile while real results exist");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. The record-only member: four surfaces, one inventory
// ═════════════════════════════════════════════════════════════════════════════
section("a deep formal record and no stated word");
{
  // THE HEADLINE ASSERTION OF THE WHOLE PASS.
  ok(Q_TALLY.length > 200,
    "record-only: the letterhead tally is empty on a member with a deep formal record — this is the bug\n" +
    "    Phase 4 exists to fix, and it is back");
  ok(Object.keys(Q_COUNTS).length === 5,
    "record-only: the tally does not print all five counts");
  eq(Q_COUNTS.record, Q_DEPTH.issues,
    "record-only: the tally's record-only count does not equal recordDepth().issues — the letterhead and\n" +
    "    the browse chip are counting different records for the same person");
  eq(Q_COUNTS.record, FPI.count(QUIET),
    "record-only: the tally disagrees with the formal atlas about how many issues are on file");
  eq(Q_COUNTS.record, Q_SHAPE.issues,
    "record-only: the tally disagrees with the shape hero above it about how many issues are on file");
  // Nothing was tested, so nothing may be reported as tested.
  for (const tok of ["contradicts", "mixed", "consistent", "limited"]) {
    eq(Q_COUNTS[tok], 0,
      `record-only: ${tok} is non-zero on a member with no documented word — a said-vs-did verdict was\n` +
      "    issued over a comparison that was never made");
  }
  const total = Object.values(Q_COUNTS).reduce((a, b) => a + b, 0);
  eq(total, Q_DEPTH.issues, "record-only: the five counts do not add up to the inventory");

  // The in-card surfaces.
  ok(Q_SEC.length > 200, "record-only: the ⚖️ section renders nothing at all");
  has(Q_SEC, 'data-pdxwa-oc-panel="record"', "record-only: the index has no record-only panel");
  const rp = panelOf(Q_SEC, "record");
  eq((rp.match(/data-pdxwa-issue="/g) || []).length, Q_DEPTH.issues,
    "record-only: the record-only panel does not list one row per issue on file");
  for (const tok of ["contradicts", "mixed", "consistent", "limited"]) {
    eq((panelOf(Q_SEC, tok).match(/data-pdxwa-issue="/g) || []).length, 0,
      `record-only: the "${tok}" panel has rows on a member with no documented word`);
  }
  // The strip and its notes.
  has(Q_SEC, 'class="pdxwa-comp"', "record-only: the composition strip does not render");
  has(txt(Q_SEC), "on the formal record only",
    "record-only: no surface says out loud that these issues are formal record without a stated position");
  // The empty-state and the notes must not report a clean word test that never ran.
  const notes = txt(Q_SEC);
  lacks(notes, "No contradictions, no mixed results and no contested standings on the tested issues",
    "record-only: the shape note issues a clean bill of health for an examination that was never sat");
  has(notes, "Nothing here has been tested against a stated position",
    "record-only: the shape note does not say that nothing was tested");
  // Whose gap it is, said in our voice and not theirs.
  ok(/no documented (position|word)/i.test(notes),
    "record-only: the card never names the missing half as OUR documentation gap");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. The word-tested member is untouched
// ═════════════════════════════════════════════════════════════════════════════
section("prior outcome tokens survive");
{
  const rows = A.PDXConsistency.rankIssueRows(A.PDXConsistency.issueRows(WORD)) || [];
  const said = rows.filter((r) => r.stance && r.stance.label);
  must(said.length > 0, `${WORD} produced no rows with a stated position`);
  const sec = WA.sectionHtml(WORD, A.CMP_DATA[WORD]) || "";
  must(sec.length > 200, `${WORD} rendered no ⚖️ section`);
  let checked = 0, wrong = [];
  for (const r of said) {
    if (!WA.outcomeFor(r.verdict.token)) continue;
    checked++;
    const panel = panelOf(sec, r.verdict.token);
    if (panel.indexOf('data-pdxwa-issue="' + r.key + '"') === -1) wrong.push(r.key + "/" + r.verdict.token);
  }
  must(checked > 0, `no ${WORD} row carried a named outcome — the assertion below would be vacuous`);
  eq(wrong.length, 0,
    `word-tested: ${wrong.length} row(s) with a stated position moved out of the bucket their verdict\n` +
    `    names (${wrong.slice(0, 4).join(", ")}) — admitting the record-only pile disturbed the word test`);
  // …and no row with a stated position was re-filed as record-only.
  const rp = panelOf(sec, "record");
  for (const r of said) {
    lacks(rp, 'data-pdxwa-issue="' + r.key + '"',
      `word-tested: "${r.key}" has a stated position and was filed as record-only`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. One percentage on the page, and it did not move
// ═════════════════════════════════════════════════════════════════════════════
section("no second figure, no drift");
{
  // The record-only rows are admitted by asking the formal index which issues it
  // holds. Stub that to nothing and the gate reproduces the OLD behaviour exactly
  // — which makes it a clean A/B for whether Direction Match can see this pass.
  const B = boot();
  B.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  B.PDXVotingRecord.noteMember(WORD, seed(WIDE, 12));
  const before = {};
  for (const pid of [QUIET, WORD]) before[pid] = JSON.stringify(B.PDXWordAction.read(pid, B.CMP_DATA[pid]));
  B.PDXConsistency.formalPatternIndex.rows = () => [];
  B.PDXDataEpoch();                       // buckets rebuild against the stub
  const after = {};
  for (const pid of [QUIET, WORD]) after[pid] = JSON.stringify(B.PDXWordAction.read(pid, B.CMP_DATA[pid]));
  for (const pid of [QUIET, WORD]) {
    eq(after[pid], before[pid],
      `no drift: ${pid}'s Direction Match read changed when the record-only population did — the score\n` +
      "    is reading the bucketing, and Phase 4 has moved a percentage");
  }
  // Nothing in the new bucket prints a figure.
  const rp = panelOf(Q_SEC, "record");
  lacks(rp, "%", "no second figure: the record-only panel prints a percentage");
  lacks(Q_TALLY, "%", "no second figure: the letterhead tally prints a percentage");
  const o = WA.outcomeFor("record");
  lacks(o.sub + o.label + o.short, "%", "no second figure: the record-only vocabulary carries a percentage");
  // …and no grade, no direction, no party.
  for (const w of ["grade", "loyalty", "with party", "against party", "rank"]) {
    lacks(txt(rp).toLowerCase(), w, `no second figure: the record-only panel prints "${w}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. One epoch, one inventory
// ═════════════════════════════════════════════════════════════════════════════
section("the derivation epoch");
{
  // The three surfaces that publish an inventory size for one person, asked in
  // the order a reader meets them: browse chip, hero shape, aggregate tally.
  const chip = WA.searchBadgeHTML(QUIET);
  const chipN = Number((chip.match(/(\d+)\s+issues? on record/) || [])[1]);
  eq(chipN, Q_COUNTS.record,
    "epoch: the browse chip and the aggregate tally report different inventories for the same person");
  eq(chipN, Q_SHAPE.issues,
    "epoch: the browse chip and the shape hero report different inventories for the same person");

  // The memo must let go when the epoch moves. Seed a SECOND wave onto the same
  // member and every surface has to grow together; a bucketing pinned to the
  // cold key set would keep printing the old integer.
  const C = boot();
  C.PDXVotingRecord.noteMember(QUIET, seed(POLED.slice(0, 12), 12));
  const first = countsOf(C.PDXWordAction.headerTallyHtml(QUIET)).record;
  C.PDXVotingRecord.noteMember(QUIET, seed(POLED.slice(0, 18), 12));
  const second = countsOf(C.PDXWordAction.headerTallyHtml(QUIET)).record;
  ok(second > first,
    `epoch: the tally still reports ${first} issues after the record grew to ` +
    `${C.PDXConsistency.formalPatternIndex.count(QUIET)} — the bucketing is pinned to a stale key set`);
  eq(second, C.PDXConsistency.formalPatternIndex.count(QUIET),
    "epoch: the warm tally and the warm atlas disagree about the grown record");
  eq(second, C.PDXWordAction.recordDepth(QUIET).issues,
    "epoch: the warm tally and the warm browse depth disagree about the grown record");
  // The key set is keyed, not merely cached — pinned in source so a later edit
  // that drops the epoch check fails here rather than in a screenshot.
  ok(/function formalKeySet\(pid\)[\s\S]{0,320}_fkEpoch !== ep/.test(WA_SRC),
    "epoch: formalKeySet does not clear on a derivation-epoch change");
  ok(/hit\.ranked === ranked && hit\.keys === keys/.test(WA_SRC),
    "epoch: the bucket memo does not validate the formal key set it was built from, so a warm index can\n" +
    "    be served a cold inventory");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Coverage is still not a result
// ═════════════════════════════════════════════════════════════════════════════
section("the All-Seeing Eye");
{
  const chip = WA.searchBadgeHTML(QUIET);
  lacks(chip, "Record only",
    "the eye: the record-only bucket was promoted into a result chip on the busiest surface in the\n" +
    "    product — it is coverage, and searchBadgeHTML skips secondary buckets for exactly this reason");
  for (const tok of ["contradicts", "mixed", "consistent", "limited"]) {
    lacks(chip, 'data-pdxwa-eye="' + tok + '"',
      `the eye: a "${tok}" result chip was published for a member with no documented word`);
  }
  has(chip, "on record",
    "the eye: the formal-inventory chip no longer reaches the browse row — admitting the buckets took\n" +
    "    the fall-through with it, and the row is back to 'Still documenting' over a deep record");
  // The word-tested member keeps their real result chip.
  const wchip = WA.searchBadgeHTML(WORD);
  ok(/data-pdxwa-eye="(contradicts|mixed|consistent)"/.test(wchip),
    "the eye: a member with real word-tested results no longer publishes one");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. The mutation: put the drop back and this file fails
// ═════════════════════════════════════════════════════════════════════════════
section("the drop, restored");
{
  // The gate is one expression, and re-filing rather than returning is the whole
  // change. Pinned in source: a `return` on the wordless branch is the bug.
  const fn = WA_SRC.slice(WA_SRC.indexOf("function outcomeBuckets(pid) {"),
                          WA_SRC.indexOf("var _obCache"));
  ok(fn.length > 200, "mutation: outcomeBuckets could not be sliced out of the source");
  ok(/var recordOnly = \(!r\.stance\.label && r\.verdict\.token === 'limited'\);/.test(fn),
    "mutation: the record-only branch is no longer a named boolean, so the next reader cannot see what\n" +
    "    the condition means");
  ok(!/if \(!r\.stance\.label && r\.verdict\.token === 'limited'\) return;/.test(fn),
    "mutation: THE DROP IS BACK — outcomeBuckets returns early on a wordless row, and the tally, the\n" +
    "    strip and the index are empty again on every deep-record member with nothing quotable");
  ok(/recordOnly \? 'record' :/.test(fn),
    "mutation: a record-only row is no longer re-filed under its own token");
  ok(/if \(recordOnly\) \{ b\.formal\+\+; return; \}/.test(fn),
    "mutation: a record-only row is falling through into the friction counters, which read how a word\n" +
    "    test went on a row that had no word in it");

  // …and the behavioural half of the same claim. Stubbing the formal index to
  // hold nothing reproduces the old drop exactly, and every surface must go dark
  // — which is what makes section 2 above load-bearing rather than decorative.
  const D = boot();
  D.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  D.PDXConsistency.formalPatternIndex.rows = () => [];
  eq(D.PDXWordAction.headerTallyHtml(QUIET), "",
    "mutation: with the formal index holding nothing the tally still renders — the record-only rows are\n" +
    "    being admitted on some other basis than the atlas's own predicate");
  // The gate fails CLOSED, not open: an index that cannot be reached at all
  // admits nothing rather than promoting every wordless row in the roster.
  const E = boot();
  E.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  E.PDXConsistency.formalPatternIndex.rows = () => { throw new Error("index down"); };
  eq(E.PDXWordAction.headerTallyHtml(QUIET), "",
    "mutation: a broken formal index admits every wordless row — the gate fails open");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ record-only buckets: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`\n✓ record-only buckets: all ${passed} assertions passed — ` +
  `${Q_DEPTH.issues} issues on ${QUIET}'s formal record, counted by every surface that mentions them`);
